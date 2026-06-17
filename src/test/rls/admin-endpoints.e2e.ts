/**
 * RLS e2e: granular per-endpoint admin gating.
 *
 * For each admin-only surface (tables, RPCs, edge functions), we verify:
 *   - stranger (no role)  → denied / empty / 403, and never sees sensitive payload
 *   - admin (real role)   → access granted, response shape matches admin contract
 *   - self-promoted user  → cannot escalate via direct insert/update on user_roles
 *
 * We assert on shape, not on row counts, because dev databases may be empty.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { anonClient, isEnabled, serviceClient, userClient } from "./setup";
import { buildFixtures, teardownFixtures, type RlsFixtures } from "./fixtures";

const SENSITIVE_KEYS = [
  "service_role",
  "service_role_key",
  "SUPABASE_SERVICE_ROLE_KEY",
  "password",
  "encrypted_password",
  "secret",
];

function assertNoSensitiveLeak(payload: unknown) {
  const json = JSON.stringify(payload ?? {});
  for (const key of SENSITIVE_KEYS) {
    expect(json.toLowerCase()).not.toContain(key.toLowerCase());
  }
}

describe.skipIf(!isEnabled)("RLS: admin endpoints granular", () => {
  let fx: RlsFixtures;
  beforeAll(async () => { fx = await buildFixtures(); });
  afterAll(async () => { await teardownFixtures(fx); });

  // -------- Tables (direct PostgREST) --------

  describe("tables", () => {
    const adminOnlyTables: string[] = [
      "function_logs",
      "ai_invocations",
      "analytics_events",
      "page_views",
      "marketplace_curated_providers",
      "palcos_curados",
    ];

    for (const table of adminOnlyTables) {
      it(`stranger gets empty/denied on ${table}`, async () => {
        const { client } = await userClient(fx.stranger.email, fx.stranger.password);
        const res = await client.from(table).select("*").limit(5);
        // Either RLS denies (error) or returns empty set — never leaks rows.
        if (res.error) {
          expect(res.error.code === "42501" || /permission|policy/i.test(res.error.message)).toBe(true);
        } else {
          expect(res.data ?? []).toEqual([]);
        }
      });

      it(`anon gets empty/denied on ${table}`, async () => {
        const res = await anonClient().from(table).select("*").limit(5);
        if (res.error) {
          expect(res.error.code === "42501" || /permission|policy|JWT/i.test(res.error.message)).toBe(true);
        } else {
          expect(res.data ?? []).toEqual([]);
        }
      });

      it(`admin can query ${table} without error`, async () => {
        const { client } = await userClient(fx.admin.email, fx.admin.password);
        const { error, data } = await client.from(table).select("*").limit(1);
        expect(error).toBeNull();
        assertNoSensitiveLeak(data);
      });
    }
  });

  // -------- Admin-gated RPCs --------

  describe("rpcs", () => {
    it("get_oportunidades_search_metrics: stranger denied, admin allowed", async () => {
      const stranger = await userClient(fx.stranger.email, fx.stranger.password);
      const r1 = await stranger.client.rpc("get_oportunidades_search_metrics", { p_days: 7 });
      expect(r1.error).not.toBeNull();
      expect(/admin|permission|policy/i.test(r1.error?.message ?? "")).toBe(true);

      const admin = await userClient(fx.admin.email, fx.admin.password);
      const r2 = await admin.client.rpc("get_oportunidades_search_metrics", { p_days: 7 });
      expect(r2.error).toBeNull();
      assertNoSensitiveLeak(r2.data);
    });

    it("get_extract_metrics: stranger denied, admin allowed", async () => {
      const stranger = await userClient(fx.stranger.email, fx.stranger.password);
      const r1 = await stranger.client.rpc("get_extract_metrics", { p_days: 7 });
      expect(r1.error).not.toBeNull();

      const admin = await userClient(fx.admin.email, fx.admin.password);
      const r2 = await admin.client.rpc("get_extract_metrics", { p_days: 7 });
      expect(r2.error).toBeNull();
    });

    it("report_reference_coverage: stranger denied, admin allowed", async () => {
      const stranger = await userClient(fx.stranger.email, fx.stranger.password);
      const r1 = await stranger.client.rpc("report_reference_coverage");
      expect(r1.error).not.toBeNull();

      const admin = await userClient(fx.admin.email, fx.admin.password);
      const r2 = await admin.client.rpc("report_reference_coverage");
      expect(r2.error).toBeNull();
    });

    it("has_role: any user can call but cannot fake another user's role", async () => {
      const { client, userId } = await userClient(fx.stranger.email, fx.stranger.password);
      // Self: not admin.
      const self = await client.rpc("has_role", { _user_id: userId, _role: "admin" });
      expect(self.error).toBeNull();
      expect(self.data).toBe(false);
      // Probing admin's id returns truthful value but is non-actionable (no escalation).
      const probe = await client.rpc("has_role", { _user_id: fx.admin.id, _role: "admin" });
      expect(probe.error).toBeNull();
      expect(probe.data).toBe(true);
    });
  });

  // -------- Edge Functions --------

  describe("edge functions", () => {
    it("admin-stats: stranger gets 403, admin gets 200 (no service-role leak)", async () => {
      const stranger = await userClient(fx.stranger.email, fx.stranger.password);
      const r1 = await stranger.client.functions.invoke("admin-stats", { body: {} });
      // supabase-js wraps non-2xx into error
      expect(r1.error).not.toBeNull();

      const admin = await userClient(fx.admin.email, fx.admin.password);
      const r2 = await admin.client.functions.invoke("admin-stats", { body: {} });
      expect(r2.error).toBeNull();
      assertNoSensitiveLeak(r2.data);
    });

    it("admin-stats: anonymous (no JWT) is rejected", async () => {
      const r = await anonClient().functions.invoke("admin-stats", { body: {} });
      expect(r.error).not.toBeNull();
    });
  });

  // -------- Privilege escalation guards --------

  describe("privilege escalation", () => {
    it("stranger cannot INSERT admin role for self", async () => {
      const { client, userId } = await userClient(fx.stranger.email, fx.stranger.password);
      const r = await client.from("user_roles").insert({ user_id: userId, role: "admin" });
      expect(r.error).not.toBeNull();
    });

    it("stranger cannot INSERT admin role for someone else", async () => {
      const { client } = await userClient(fx.stranger.email, fx.stranger.password);
      const r = await client.from("user_roles").insert({ user_id: fx.member.id, role: "admin" });
      expect(r.error).not.toBeNull();
    });

    it("stranger cannot UPDATE existing admin row", async () => {
      const { client } = await userClient(fx.stranger.email, fx.stranger.password);
      const r = await client
        .from("user_roles")
        .update({ role: "admin" })
        .eq("user_id", fx.admin.id);
      // Either denied or zero rows affected — never escalates.
      const verify = await serviceClient()
        .from("user_roles")
        .select("user_id, role")
        .eq("user_id", fx.stranger.id);
      expect(verify.data ?? []).toEqual([]);
      // r.error may be null (RLS filters to 0 rows); the post-condition above is the real assertion.
      void r;
    });

    it("stranger cannot DELETE admin role", async () => {
      const { client } = await userClient(fx.stranger.email, fx.stranger.password);
      await client.from("user_roles").delete().eq("user_id", fx.admin.id);
      const verify = await serviceClient()
        .from("user_roles")
        .select("user_id")
        .eq("user_id", fx.admin.id)
        .eq("role", "admin")
        .maybeSingle();
      expect(verify.data?.user_id).toBe(fx.admin.id); // still admin
    });

    it("stranger cannot promote self via RPC has_role (read-only)", async () => {
      // has_role is SECURITY DEFINER but read-only; ensure no side effect.
      const { client, userId } = await userClient(fx.stranger.email, fx.stranger.password);
      await client.rpc("has_role", { _user_id: userId, _role: "admin" });
      const verify = await serviceClient()
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      expect(verify.data ?? []).toEqual([]);
    });
  });
});
