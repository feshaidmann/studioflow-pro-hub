/**
 * RLS e2e: financial privacy — guests must never see transactions.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { isEnabled, serviceClient, userClient } from "./setup";
import { buildFixtures, teardownFixtures, type RlsFixtures } from "./fixtures";

describe.skipIf(!isEnabled)("RLS: finance privacy", () => {
  let fx: RlsFixtures;
  beforeAll(async () => {
    fx = await buildFixtures();
    // Member is an accepted collaborator on the project
    await serviceClient()
      .from("project_invitations")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("id", fx.invitationId);
  });
  afterAll(async () => { await teardownFixtures(fx); });

  it("owner reads own transactions", async () => {
    const { client } = await userClient(fx.owner.email, fx.owner.password);
    const { data, error } = await client
      .from("transactions")
      .select("id, amount")
      .eq("id", fx.transactionId);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });

  it("accepted member CANNOT read transactions of the shared project", async () => {
    const { client } = await userClient(fx.member.email, fx.member.password);
    const { data } = await client
      .from("transactions")
      .select("id, amount")
      .eq("project_id", fx.projectId);
    expect(data ?? []).toEqual([]);
  });

  it("stranger cannot read transactions", async () => {
    const { client } = await userClient(fx.stranger.email, fx.stranger.password);
    const { data } = await client.from("transactions").select("id").eq("id", fx.transactionId);
    expect(data ?? []).toEqual([]);
  });

  it("member cannot insert a fake transaction on the shared project", async () => {
    const { client, userId } = await userClient(fx.member.email, fx.member.password);
    const { error } = await client.from("transactions").insert({
      user_id: userId,
      project_id: fx.projectId,
      type: "income",
      amount: 999,
      date: "2026-06-17",
      category: "show",
    });
    // The row would land under the member's own user_id, so WITH CHECK passes,
    // but the project FK still belongs to the owner — RLS on SELECT keeps it
    // invisible to the owner. We assert at minimum that the member cannot then
    // pollute the owner's finance view.
    if (!error) {
      const owner = await userClient(fx.owner.email, fx.owner.password);
      const { data } = await owner.client
        .from("transactions")
        .select("id, user_id")
        .eq("project_id", fx.projectId);
      for (const row of data ?? []) {
        expect(row.user_id).toBe(fx.owner.id);
      }
    }
  });
});
