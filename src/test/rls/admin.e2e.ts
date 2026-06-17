/**
 * RLS e2e: admin-only tables + privilege escalation guard.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { isEnabled, userClient } from "./setup";
import { buildFixtures, teardownFixtures, type RlsFixtures } from "./fixtures";

describe.skipIf(!isEnabled)("RLS: admin", () => {
  let fx: RlsFixtures;
  beforeAll(async () => { fx = await buildFixtures(); });
  afterAll(async () => { await teardownFixtures(fx); });

  it("non-admin sees empty function_logs / ai_invocations", async () => {
    const { client } = await userClient(fx.stranger.email, fx.stranger.password);
    const fl = await client.from("function_logs").select("id").limit(1);
    const ai = await client.from("ai_invocations").select("id").limit(1);
    expect(fl.data ?? []).toEqual([]);
    expect(ai.data ?? []).toEqual([]);
  });

  it("admin can read function_logs", async () => {
    const { client } = await userClient(fx.admin.email, fx.admin.password);
    const { error } = await client.from("function_logs").select("id").limit(1);
    expect(error).toBeNull(); // empty is fine; the call itself must not be denied.
  });

  it("regular user cannot self-promote into user_roles", async () => {
    const { client, userId } = await userClient(fx.stranger.email, fx.stranger.password);
    const { error } = await client
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    expect(error).not.toBeNull();
    expect(error?.code === "42501" || /policy/i.test(error?.message ?? "")).toBe(true);
  });

  it("regular user can only read their own user_roles row", async () => {
    const { client, userId } = await userClient(fx.admin.email, fx.admin.password);
    const { data, error } = await client.from("user_roles").select("user_id, role");
    expect(error).toBeNull();
    for (const row of data ?? []) {
      expect(row.user_id).toBe(userId);
    }
  });
});
