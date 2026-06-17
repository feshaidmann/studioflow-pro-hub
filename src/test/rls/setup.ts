/**
 * Shared setup for the RLS e2e suite.
 *
 * Exposes:
 *   - `env`              — validated env vars
 *   - `serviceClient()`  — admin client (setup/teardown only)
 *   - `userClient()`     — sign in as a given user and return a scoped client
 *   - `anonClient()`     — unauthenticated client
 *   - `createTestUser()` / `deleteTestUser()` — efêmeros
 *
 * Tests skip automatically (`describe.skipIf`) when the required env is missing.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const PRODUCTION_REF = "icdedfqsiorzzuhzvfgl";

export interface RlsEnv {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  projectRef: string | null;
}

function readEnv(): RlsEnv | null {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) return null;

  const refMatch = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
  const projectRef = refMatch?.[1] ?? null;
  if (projectRef === PRODUCTION_REF && process.env.RLS_TEST_ALLOW_PROD !== "1") {
    throw new Error(
      `RLS suite refusing to run against production ref (${PRODUCTION_REF}). ` +
        `Set RLS_TEST_ALLOW_PROD=1 to override (NOT RECOMMENDED).`,
    );
  }
  return { url, anonKey, serviceRoleKey, projectRef };
}

export const env: RlsEnv | null = (() => {
  try {
    return readEnv();
  } catch (e) {
    console.error(e);
    return null;
  }
})();

export const isEnabled = env !== null;

export function serviceClient(): SupabaseClient {
  if (!env) throw new Error("RLS env not configured");
  return createClient(env.url, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function anonClient(): SupabaseClient {
  if (!env) throw new Error("RLS env not configured");
  return createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function userClient(
  email: string,
  password: string,
): Promise<{ client: SupabaseClient; userId: string; accessToken: string }> {
  if (!env) throw new Error("RLS env not configured");
  const client = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) {
    throw new Error(`signIn failed for ${email}: ${error?.message}`);
  }
  return { client, userId: data.user.id, accessToken: data.session.access_token };
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

const TEST_EMAIL_DOMAIN = "studioflow-rls.test";

export async function createTestUser(label: string): Promise<TestUser> {
  const admin = serviceClient();
  const email = `rls-${label}-${randomUUID()}@${TEST_EMAIL_DOMAIN}`;
  const password = `Pwd-${randomUUID()}!A1`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  return { id: data.user.id, email, password };
}

export async function deleteTestUser(userId: string): Promise<void> {
  const admin = serviceClient();
  // CASCADE on auth.users FKs cleans projects/transactions/invitations.
  await admin.auth.admin.deleteUser(userId).catch(() => undefined);
}

/** Convenience: assert that a PostgREST result represents an RLS denial OR empty set. */
export function isRlsBlocked<T>(
  res: { data: T[] | null; error: { code?: string } | null },
): boolean {
  if (res.error) return res.error.code === "42501" || res.error.code === "PGRST301";
  return Array.isArray(res.data) && res.data.length === 0;
}
