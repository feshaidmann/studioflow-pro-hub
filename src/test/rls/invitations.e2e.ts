/**
 * RLS e2e: project_invitations + respond-to-invite flow.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { anonClient, isEnabled, userClient } from "./setup";
import { buildFixtures, teardownFixtures, type RlsFixtures } from "./fixtures";

describe.skipIf(!isEnabled)("RLS: project_invitations", () => {
  let fx: RlsFixtures;
  beforeAll(async () => { fx = await buildFixtures(); });
  afterAll(async () => { await teardownFixtures(fx); });

  it("anon cannot enumerate invitations even with a known token", async () => {
    const anon = anonClient();
    const { data, error } = await anon
      .from("project_invitations")
      .select("id, token, professional_email")
      .eq("token", fx.invitationToken);
    // Either permission denied or empty due to RLS — never the row.
    expect(error?.code === "42501" || (data ?? []).length === 0).toBe(true);
  });

  it("a random authenticated user cannot read someone else's invitation by token", async () => {
    const { client } = await userClient(fx.stranger.email, fx.stranger.password);
    const { data } = await client
      .from("project_invitations")
      .select("id")
      .eq("token", fx.invitationToken);
    expect(data ?? []).toEqual([]);
  });

  it("the invitee can read their own invitation (email-scoped policy)", async () => {
    const { client } = await userClient(fx.member.email, fx.member.password);
    const { data, error } = await client
      .from("project_invitations")
      .select("id, professional_email, status")
      .eq("id", fx.invitationId);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });

  it("owner can manage their own invitations", async () => {
    const { client } = await userClient(fx.owner.email, fx.owner.password);
    const { data, error } = await client
      .from("project_invitations")
      .select("id")
      .eq("id", fx.invitationId);
    expect(error).toBeNull();
    expect(data?.length).toBe(1);
  });
});
