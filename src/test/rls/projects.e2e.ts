/**
 * RLS e2e: projects + member access via SECURITY DEFINER RPCs.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { anonClient, isEnabled, serviceClient, userClient } from "./setup";
import { buildFixtures, teardownFixtures, type RlsFixtures } from "./fixtures";

describe.skipIf(!isEnabled)("RLS: projects", () => {
  let fx: RlsFixtures;
  beforeAll(async () => {
    fx = await buildFixtures();
    // Promote member to accepted invitation so the email-based RPC matches.
    const admin = serviceClient();
    await admin
      .from("project_invitations")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("id", fx.invitationId);
  });
  afterAll(async () => { await teardownFixtures(fx); });

  it("owner reads their own project directly", async () => {
    const { client } = await userClient(fx.owner.email, fx.owner.password);
    const { data, error } = await client
      .from("projects")
      .select("id, name, revenue_estimate")
      .eq("id", fx.projectId);
    expect(error).toBeNull();
    expect(data?.[0].id).toBe(fx.projectId);
  });

  it("stranger gets zero rows from projects", async () => {
    const { client } = await userClient(fx.stranger.email, fx.stranger.password);
    const { data } = await client.from("projects").select("id").eq("id", fx.projectId);
    expect(data ?? []).toEqual([]);
  });

  it("anon gets zero rows or permission denied from projects", async () => {
    const anon = anonClient();
    const { data, error } = await anon.from("projects").select("id").eq("id", fx.projectId);
    expect(error?.code === "42501" || (data ?? []).length === 0).toBe(true);
  });

  it("accepted member cannot read projects table directly", async () => {
    const { client } = await userClient(fx.member.email, fx.member.password);
    const { data } = await client.from("projects").select("id").eq("id", fx.projectId);
    expect(data ?? []).toEqual([]);
  });

  it("accepted member reads project via get_project_for_member RPC", async () => {
    const { client } = await userClient(fx.member.email, fx.member.password);
    const { data, error } = await client.rpc("get_project_for_member", {
      p_project_id: fx.projectId,
    });
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    // RPC must NOT expose financial fields.
    const keys = Object.keys(data?.[0] ?? {});
    for (const banned of ["revenue_estimate", "total_contract_value", "amount_paid"]) {
      expect(keys, `RPC leaked field ${banned}`).not.toContain(banned);
    }
  });

  it("accepted member sees the project via get_member_projects RPC", async () => {
    const { client } = await userClient(fx.member.email, fx.member.password);
    const { data, error } = await client.rpc("get_member_projects");
    expect(error).toBeNull();
    expect((data ?? []).some((row: { id: string }) => row.id === fx.projectId)).toBe(true);
  });

  it("stranger gets nothing from get_project_for_member", async () => {
    const { client } = await userClient(fx.stranger.email, fx.stranger.password);
    const { data } = await client.rpc("get_project_for_member", {
      p_project_id: fx.projectId,
    });
    expect(data ?? []).toEqual([]);
  });
});
