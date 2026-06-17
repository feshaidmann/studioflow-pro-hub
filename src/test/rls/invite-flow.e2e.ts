/**
 * RLS e2e — granular invitation flow.
 *
 * Covers the full lifecycle of `project_invitations` plus the
 * `respond-to-invite` edge function, asserting that no sensitive
 * metadata (token, fee, professional_email, schedule_notes,
 * service-role artifacts) leaks outside the permitted role.
 *
 * Roles exercised:
 *   - anon         : unauthenticated
 *   - stranger     : authenticated but unrelated
 *   - member       : the invitee (matches professional_email)
 *   - owner        : invited_by
 *
 * The suite re-uses the shared fixtures helper so each test starts
 * from a fresh ephemeral invitation.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  anonClient,
  isEnabled,
  serviceClient,
  userClient,
  env,
} from "./setup";
import { buildFixtures, teardownFixtures, type RlsFixtures } from "./fixtures";

const SENSITIVE_KEYS = [
  "token",
  "fee",
  "professional_email",
  "schedule_notes",
  "service_role",
  "service_role_key",
  "supabase_service_role_key",
  "secret",
  "password",
];

function assertNoSensitiveLeak(payload: unknown, allow: string[] = []): void {
  const blob = JSON.stringify(payload ?? {}).toLowerCase();
  for (const key of SENSITIVE_KEYS) {
    if (allow.includes(key)) continue;
    expect(
      blob.includes(`"${key}"`),
      `payload leaked sensitive key "${key}": ${blob.slice(0, 200)}`,
    ).toBe(false);
  }
}

async function freshInvitation(fx: RlsFixtures): Promise<{ id: string; token: string }> {
  const admin = serviceClient();
  const { data, error } = await admin
    .from("project_invitations")
    .insert({
      project_id: fx.projectId,
      invited_by: fx.owner.id,
      professional_email: fx.member.email,
      professional_role: "Mix",
      professional_name: "Member Test",
      fee: 1500,
      schedule_notes: "Confidencial: cachê e prazo internos",
      deadline: "2026-12-31",
    })
    .select("id, token")
    .single();
  if (error || !data) throw new Error(`freshInvitation failed: ${error?.message}`);
  return data;
}

describe.skipIf(!isEnabled)("RLS: invitation lifecycle + sensitive metadata", () => {
  let fx: RlsFixtures;
  let inv: { id: string; token: string };

  beforeAll(async () => {
    fx = await buildFixtures();
  });
  afterAll(async () => {
    await teardownFixtures(fx);
  });
  beforeEach(async () => {
    inv = await freshInvitation(fx);
  });

  // ─────────────────────────── READ SCOPE ───────────────────────────

  it("anon cannot list invitations, even with a known project_id", async () => {
    const anon = anonClient();
    const { data, error } = await anon
      .from("project_invitations")
      .select("id, token, fee, professional_email")
      .eq("project_id", fx.projectId);
    expect(error?.code === "42501" || (data ?? []).length === 0).toBe(true);
    assertNoSensitiveLeak(data);
  });

  it("anon cannot fetch by token (no public-by-token policy anymore)", async () => {
    const anon = anonClient();
    const { data } = await anon
      .from("project_invitations")
      .select("id, token, fee, professional_email")
      .eq("token", inv.token);
    expect((data ?? []).length).toBe(0);
  });

  it("stranger cannot read invitation rows or fields", async () => {
    const { client } = await userClient(fx.stranger.email, fx.stranger.password);
    const { data: byId } = await client
      .from("project_invitations")
      .select("*")
      .eq("id", inv.id);
    expect(byId ?? []).toEqual([]);
    const { data: byToken } = await client
      .from("project_invitations")
      .select("token, fee, professional_email, schedule_notes")
      .eq("token", inv.token);
    expect(byToken ?? []).toEqual([]);
    assertNoSensitiveLeak(byId);
    assertNoSensitiveLeak(byToken);
  });

  it("invitee reads only invitations addressed to their email", async () => {
    const { client } = await userClient(fx.member.email, fx.member.password);
    const { data, error } = await client
      .from("project_invitations")
      .select("id, professional_email, status, project_id")
      .eq("id", inv.id);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(data![0].professional_email.toLowerCase()).toBe(fx.member.email.toLowerCase());

    // And cannot see a sibling invitation addressed to someone else.
    const admin = serviceClient();
    const { data: other } = await admin
      .from("project_invitations")
      .insert({
        project_id: fx.projectId,
        invited_by: fx.owner.id,
        professional_email: `someone-else-${Date.now()}@studioflow-rls.test`,
        professional_role: "Master",
        professional_name: "Other",
      })
      .select("id")
      .single();
    const { data: leaked } = await client
      .from("project_invitations")
      .select("id")
      .eq("id", other!.id);
    expect(leaked ?? []).toEqual([]);
  });

  it("owner can read full invitation incl. token", async () => {
    const { client } = await userClient(fx.owner.email, fx.owner.password);
    const { data, error } = await client
      .from("project_invitations")
      .select("id, token, fee, professional_email, schedule_notes")
      .eq("id", inv.id);
    expect(error).toBeNull();
    expect(data?.[0].token).toBe(inv.token);
  });

  // ─────────────────────────── WRITE SCOPE ──────────────────────────

  it("stranger cannot UPDATE an invitation status", async () => {
    const { client } = await userClient(fx.stranger.email, fx.stranger.password);
    const { error } = await client
      .from("project_invitations")
      .update({ status: "accepted" })
      .eq("id", inv.id);
    // RLS yields either 42501 or zero affected rows; re-check via service.
    const admin = serviceClient();
    const { data } = await admin
      .from("project_invitations")
      .select("status")
      .eq("id", inv.id)
      .single();
    expect(data?.status).toBe("pending");
    if (error) expect(error.code).toBe("42501");
  });

  it("stranger cannot INSERT an invitation on a project they don't own", async () => {
    const { client } = await userClient(fx.stranger.email, fx.stranger.password);
    const { error } = await client.from("project_invitations").insert({
      project_id: fx.projectId,
      invited_by: fx.stranger.id,
      professional_email: "x@studioflow-rls.test",
      professional_role: "Mix",
      professional_name: "X",
    });
    expect(error).not.toBeNull();
  });

  // ─────────────────────────── REVOKE RPC ───────────────────────────

  it("stranger cannot revoke an invitation via RPC", async () => {
    const { client } = await userClient(fx.stranger.email, fx.stranger.password);
    const { data, error } = await client.rpc("revoke_project_invitation", {
      p_invitation_id: inv.id,
    });
    // Either permission error or {ok:false}; never silently revoked.
    if (!error) {
      expect((data as { ok?: boolean } | null)?.ok).not.toBe(true);
    }
    const admin = serviceClient();
    const { data: row } = await admin
      .from("project_invitations")
      .select("status")
      .eq("id", inv.id)
      .single();
    expect(row?.status).toBe("pending");
  });

  it("owner revokes the invitation and rotates the token", async () => {
    const { client } = await userClient(fx.owner.email, fx.owner.password);
    const { data, error } = await client.rpc("revoke_project_invitation", {
      p_invitation_id: inv.id,
    });
    expect(error).toBeNull();
    expect((data as { ok: boolean }).ok).toBe(true);

    const admin = serviceClient();
    const { data: row } = await admin
      .from("project_invitations")
      .select("status, token")
      .eq("id", inv.id)
      .single();
    expect(row?.status).toBe("revoked");
    expect(row?.token).not.toBe(inv.token);
  });

  // ─────────────────────────── EDGE FUNCTION ────────────────────────

  it("respond-to-invite: anon with valid token can accept and never receives sensitive metadata", async () => {
    const anon = anonClient();
    const { data, error } = await anon.functions.invoke("respond-to-invite", {
      body: { token: inv.token, status: "accepted", allow_global_listing: false },
    });
    expect(error).toBeNull();
    expect((data as { ok: boolean }).ok).toBe(true);
    // Allow project_id; everything else sensitive must stay hidden.
    assertNoSensitiveLeak(data);
    expect(Object.keys(data as object)).toEqual(
      expect.arrayContaining(["ok", "project_name", "artist_name", "professional_name", "project_id"]),
    );
  });

  it("respond-to-invite: rejects when logged-in email != invited email", async () => {
    const { accessToken } = await userClient(fx.stranger.email, fx.stranger.password);
    const res = await fetch(`${env!.url}/functions/v1/respond-to-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env!.anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token: inv.token, status: "accepted" }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("email_mismatch");
    // The 403 may echo the invited_email by design; ensure the token/fee never leak.
    assertNoSensitiveLeak(body, ["professional_email"]);
    expect(JSON.stringify(body)).not.toContain(inv.token);
  });

  it("respond-to-invite: token reuse returns 409 already_responded", async () => {
    const anon = anonClient();
    await anon.functions.invoke("respond-to-invite", {
      body: { token: inv.token, status: "accepted" },
    });
    const res = await fetch(`${env!.url}/functions/v1/respond-to-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: env!.anonKey },
      body: JSON.stringify({ token: inv.token, status: "accepted" }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("already_responded");
    assertNoSensitiveLeak(body);
  });

  it("respond-to-invite: expired token returns 410", async () => {
    const admin = serviceClient();
    await admin
      .from("project_invitations")
      .update({ expires_at: new Date(Date.now() - 86_400_000).toISOString() })
      .eq("id", inv.id);
    const res = await fetch(`${env!.url}/functions/v1/respond-to-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: env!.anonKey },
      body: JSON.stringify({ token: inv.token, status: "accepted" }),
    });
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toBe("invitation_expired");
    assertNoSensitiveLeak(body);
  });

  it("respond-to-invite: revoked invitation returns 410 invitation_revoked", async () => {
    const { client } = await userClient(fx.owner.email, fx.owner.password);
    await client.rpc("revoke_project_invitation", { p_invitation_id: inv.id });
    // Token rotated by RPC → original token now belongs to a revoked row only if we re-read it.
    const admin = serviceClient();
    const { data: row } = await admin
      .from("project_invitations")
      .select("token")
      .eq("id", inv.id)
      .single();
    const res = await fetch(`${env!.url}/functions/v1/respond-to-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: env!.anonKey },
      body: JSON.stringify({ token: row!.token, status: "accepted" }),
    });
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.error).toBe("invitation_revoked");
    assertNoSensitiveLeak(body);
  });

  it("respond-to-invite: unknown token returns 404 without leaking existence", async () => {
    const res = await fetch(`${env!.url}/functions/v1/respond-to-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: env!.anonKey },
      body: JSON.stringify({ token: "deadbeef-not-a-real-token", status: "accepted" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Invitation not found");
    assertNoSensitiveLeak(body);
  });

  it("respond-to-invite: invalid payload returns 400", async () => {
    const res = await fetch(`${env!.url}/functions/v1/respond-to-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: env!.anonKey },
      body: JSON.stringify({ token: inv.token, status: "bogus" }),
    });
    expect(res.status).toBe(400);
    assertNoSensitiveLeak(await res.json());
  });

  // ─────────────────────────── POST-ACCEPT INVARIANTS ───────────────

  it("after acceptance, member sees project via RPC but no financial fields", async () => {
    const anon = anonClient();
    await anon.functions.invoke("respond-to-invite", {
      body: { token: inv.token, status: "accepted" },
    });

    const { client } = await userClient(fx.member.email, fx.member.password);

    // Direct read still blocked.
    const { data: direct } = await client
      .from("projects")
      .select("id, revenue_estimate")
      .eq("id", fx.projectId);
    expect(direct ?? []).toEqual([]);

    // Member transactions are owner-only — must be empty.
    const { data: tx } = await client
      .from("transactions")
      .select("id, amount")
      .eq("project_id", fx.projectId);
    expect(tx ?? []).toEqual([]);

    // RPC returns the project with no financial keys.
    const { data: rpc, error } = await client.rpc("get_project_for_member", {
      p_project_id: fx.projectId,
    });
    expect(error).toBeNull();
    expect(rpc?.length).toBe(1);
    const keys = Object.keys(rpc?.[0] ?? {});
    for (const banned of [
      "revenue_estimate",
      "total_contract_value",
      "amount_paid",
      "gross_revenue",
      "cache",
    ]) {
      expect(keys, `RPC leaked field ${banned}`).not.toContain(banned);
    }
  });
});
