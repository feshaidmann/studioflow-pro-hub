/**
 * Test fixtures shared across e2e files.
 *
 * Builds one full graph:
 *   owner ─ projects ─ transactions
 *                   └─ project_invitations(member.email, accepted)
 *                       └─ project_members(member.id)
 *   admin (user_roles role=admin)
 *   stranger (no relation)
 */
import { createTestUser, deleteTestUser, serviceClient, type TestUser } from "./setup";

export interface RlsFixtures {
  owner: TestUser;
  member: TestUser;
  stranger: TestUser;
  admin: TestUser;
  projectId: string;
  transactionId: string;
  invitationId: string;
  invitationToken: string;
}

export async function buildFixtures(): Promise<RlsFixtures> {
  const admin = serviceClient();
  const [owner, member, stranger, adminUser] = await Promise.all([
    createTestUser("owner"),
    createTestUser("member"),
    createTestUser("stranger"),
    createTestUser("admin"),
  ]);

  // Promote admin
  const { error: roleErr } = await admin
    .from("user_roles")
    .insert({ user_id: adminUser.id, role: "admin" });
  if (roleErr) throw new Error(`grant admin role failed: ${roleErr.message}`);

  // Project owned by `owner`
  const { data: proj, error: projErr } = await admin
    .from("projects")
    .insert({ user_id: owner.id, name: "RLS Test Project", artist: "Test Artist" })
    .select("id")
    .single();
  if (projErr || !proj) throw new Error(`create project failed: ${projErr?.message}`);

  // Transaction owned by `owner`, tied to project
  const { data: tx, error: txErr } = await admin
    .from("transactions")
    .insert({
      user_id: owner.id,
      project_id: proj.id,
      type: "income",
      amount: 1234.56,
      date: "2026-06-17",
      category: "show",
      description: "Sensitive financial row",
    })
    .select("id")
    .single();
  if (txErr || !tx) throw new Error(`create transaction failed: ${txErr?.message}`);

  // Invitation addressed to `member`
  const { data: inv, error: invErr } = await admin
    .from("project_invitations")
    .insert({
      project_id: proj.id,
      invited_by: owner.id,
      professional_email: member.email,
      professional_role: "Mix",
      professional_name: "Member Test",
    })
    .select("id, token")
    .single();
  if (invErr || !inv) throw new Error(`create invitation failed: ${invErr?.message}`);

  return {
    owner,
    member,
    stranger,
    admin: adminUser,
    projectId: proj.id,
    transactionId: tx.id,
    invitationId: inv.id,
    invitationToken: inv.token,
  };
}

export async function teardownFixtures(fx: RlsFixtures | null): Promise<void> {
  if (!fx) return;
  const admin = serviceClient();
  // Best-effort explicit cleanup (CASCADE will catch the rest)
  await admin.from("user_roles").delete().eq("user_id", fx.admin.id);
  await Promise.all([
    deleteTestUser(fx.owner.id),
    deleteTestUser(fx.member.id),
    deleteTestUser(fx.stranger.id),
    deleteTestUser(fx.admin.id),
  ]);
}
