/**
 * RLS e2e — failure & exception paths for the `respond-to-invite` edge function.
 *
 * Complements `invite-flow.e2e.ts` by exhaustively poking the error
 * branches of the function and asserting that NO response (success
 * OR error, including unexpected 500s) ever echoes back:
 *   - the invitation token
 *   - `schedule_notes`
 *   - any service-role artifact (key name, JWT prefix, etc.)
 *
 * Also exercises CORS preflight so future changes don't drop headers.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  anonClient,
  env,
  isEnabled,
  serviceClient,
  userClient,
} from "./setup";
import { buildFixtures, teardownFixtures, type RlsFixtures } from "./fixtures";

const FORBIDDEN_SUBSTRINGS = [
  "schedule_notes",
  "Confidencial",
  "service_role",
  "SUPABASE_SERVICE_ROLE_KEY",
  "service-role",
];

/** Assert a response body never leaks secrets. Token is checked dynamically. */
function assertCleanBody(body: unknown, token: string): void {
  const blob = JSON.stringify(body ?? {});
  expect(blob, "response leaked invitation token").not.toContain(token);
  for (const needle of FORBIDDEN_SUBSTRINGS) {
    expect(blob, `response leaked "${needle}"`).not.toContain(needle);
  }
  // JWT-shaped service role keys start with "eyJ" — never expose any JWT.
  expect(/"eyJ[A-Za-z0-9_-]{10,}/.test(blob), "response leaked a JWT").toBe(false);
}

interface CallOpts {
  body?: unknown;
  rawBody?: string;
  headers?: Record<string, string>;
  method?: string;
}

async function call(opts: CallOpts = {}): Promise<{ status: number; body: unknown; text: string }> {
  const res = await fetch(`${env!.url}/functions/v1/respond-to-invite`, {
    method: opts.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env!.anonKey,
      ...(opts.headers ?? {}),
    },
    body: opts.rawBody ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
  });
  const text = await res.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body, text };
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
      schedule_notes: "Confidencial: notas internas que NUNCA devem vazar",
      deadline: "2026-12-31",
    })
    .select("id, token")
    .single();
  if (error || !data) throw new Error(`freshInvitation failed: ${error?.message}`);
  return data;
}

describe.skipIf(!isEnabled)("respond-to-invite: failure & exception paths", () => {
  let fx: RlsFixtures;
  let inv: { id: string; token: string };

  beforeAll(async () => { fx = await buildFixtures(); });
  afterAll(async () => { await teardownFixtures(fx); });
  beforeEach(async () => { inv = await freshInvitation(fx); });

  // ─────────────── CORS / preflight ───────────────

  it("OPTIONS preflight returns CORS headers without a body", async () => {
    const res = await fetch(`${env!.url}/functions/v1/respond-to-invite`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://example.com",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type, authorization",
      },
    });
    const text = await res.text();
    expect([200, 204]).toContain(res.status);
    expect(res.headers.get("access-control-allow-origin")).toBeTruthy();
    expect(text).not.toContain(inv.token);
  });

  // ─────────────── Malformed payloads ─────────────

  it.each<[string, CallOpts]>([
    ["completely empty body", { rawBody: "" }],
    ["non-JSON body", { rawBody: "<<<not json>>>", headers: { "Content-Type": "text/plain" } }],
    ["JSON array instead of object", { body: [] }],
    ["null body", { body: null }],
    ["missing token", { body: { status: "accepted" } }],
    ["missing status", { body: { token: "x" } }],
    ["token = null", { body: { token: null, status: "accepted" } }],
    ["token = number", { body: { token: 123, status: "accepted" } }],
    ["status = bogus", { body: { token: "anything", status: "bogus" } }],
    ["status = number", { body: { token: "x", status: 1 } }],
    ["huge token (10KB)", { body: { token: "a".repeat(10_240), status: "accepted" } }],
  ])("rejects %s without leaking secrets", async (_label, opts) => {
    const { status, body, text } = await call(opts);
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500); // malformed input should never hit a 500
    assertCleanBody(body, inv.token);
    expect(text).not.toContain("Confidencial");
  });

  // ─────────────── Unknown / invalid tokens ───────

  it.each<[string, string]>([
    ["random uuid-shaped", crypto.randomUUID()],
    ["empty string", ""],
    ["whitespace only", "   "],
    ["sql-injection-shaped", "' OR '1'='1"],
    ["near-miss of real token", inv.token.slice(0, -1) + "0"],
  ])("unknown token (%s) returns 4xx with no token/schedule_notes leak", async (_l, token) => {
    const { status, body } = await call({ body: { token, status: "accepted" } });
    expect(status).toBeGreaterThanOrEqual(400);
    assertCleanBody(body, inv.token);
  });

  // ─────────────── Auth header tampering ──────────

  it("garbage Authorization header doesn't 500 and doesn't leak", async () => {
    const { status, body } = await call({
      body: { token: inv.token, status: "accepted" },
      headers: { Authorization: "Bearer not.a.real.jwt" },
    });
    // Should either accept (treating as anon) or refuse; never 500.
    expect(status).toBeLessThan(500);
    assertCleanBody(body, inv.token);
  });

  it("expired-shape JWT doesn't surface internal errors", async () => {
    const { status, body } = await call({
      body: { token: inv.token, status: "accepted" },
      headers: {
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.aaaaaaaaaaaaaaaaaaaaaaaa",
      },
    });
    expect(status).toBeLessThan(500);
    assertCleanBody(body, inv.token);
  });

  // ─────────────── State-transition errors ────────

  it("declined invitation cannot be re-accepted (409, no leak)", async () => {
    const first = await call({ body: { token: inv.token, status: "declined" } });
    expect(first.status).toBe(200);
    assertCleanBody(first.body, inv.token);

    const second = await call({ body: { token: inv.token, status: "accepted" } });
    expect(second.status).toBe(409);
    expect((second.body as { error: string }).error).toBe("already_responded");
    assertCleanBody(second.body, inv.token);
  });

  it("revoked invitation: original token returns 4xx without echoing token", async () => {
    const { client } = await userClient(fx.owner.email, fx.owner.password);
    await client.rpc("revoke_project_invitation", { p_invitation_id: inv.id });

    // Use the now-stale token — should not be accepted, must not be echoed.
    const { status, body, text } = await call({
      body: { token: inv.token, status: "accepted" },
    });
    expect([404, 410]).toContain(status);
    assertCleanBody(body, inv.token);
    expect(text).not.toContain(inv.token);
  });

  it("email mismatch error preserves no token or notes", async () => {
    const { accessToken } = await userClient(fx.stranger.email, fx.stranger.password);
    const { status, body } = await call({
      body: { token: inv.token, status: "accepted" },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(status).toBe(403);
    expect((body as { error: string }).error).toBe("email_mismatch");
    assertCleanBody(body, inv.token);
  });

  // ─────────────── Success path also stays clean ──

  it("successful accept response does not echo token or schedule_notes", async () => {
    const anon = anonClient();
    const { data, error } = await anon.functions.invoke("respond-to-invite", {
      body: { token: inv.token, status: "accepted" },
    });
    expect(error).toBeNull();
    assertCleanBody(data, inv.token);
  });

  it("successful decline response does not echo token or schedule_notes", async () => {
    const { status, body } = await call({
      body: { token: inv.token, status: "declined" },
    });
    expect(status).toBe(200);
    assertCleanBody(body, inv.token);
  });

  // ─────────────── HTTP method handling ───────────

  it.each(["GET", "PUT", "DELETE", "PATCH"])(
    "%s method is rejected without leaking",
    async (method) => {
      const { status, body } = await call({ method, body: { token: inv.token, status: "accepted" } });
      // Function only branches on POST/OPTIONS; non-POST will either 4xx or
      // attempt to parse the body and 4xx. Must never 200 and must stay clean.
      expect(status).not.toBe(200);
      assertCleanBody(body, inv.token);
    },
  );
});
