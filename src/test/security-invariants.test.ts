/**
 * Automated security invariants.
 *
 * Static audit that guards against regressions in:
 *  - RLS / GRANT / policy hygiene on public tables
 *  - SECURITY DEFINER functions missing `search_path`
 *  - Token-based access to invitations bypassing the RPC
 *  - Edge functions that touch the service role without auth/cron gating
 *  - Admin-only pages that forget the `useAdminRole` guard
 *
 * These checks are intentionally static (no DB roundtrip) so they run in CI
 * with no credentials and never get skipped.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const MIGRATIONS_DIR = join(ROOT, "supabase/migrations");
const FUNCTIONS_DIR = join(ROOT, "supabase/functions");
const ADMIN_PAGES_DIR = join(ROOT, "src/pages/admin");

function readAll(dir: string, ext: string): { path: string; body: string }[] {
  const out: { path: string; body: string }[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...readAll(full, ext));
    else if (name.endsWith(ext)) out.push({ path: full, body: readFileSync(full, "utf8") });
  }
  return out;
}

const migrations = readAll(MIGRATIONS_DIR, ".sql");
const allSql = migrations.map((m) => m.body).join("\n");

// Public tables explicitly known to allow anon SELECT (no auth.uid scoping).
// Keep this list narrow and intentional.
const PUBLIC_READ_TABLES = new Set<string>([
  "profiles", // gated by allow_global_listing/public_profile_enabled
  "professionals", // gated by allow_global_listing
  "project_invitations", // token-scoped, accessed via RPC
  "platform_invitations", // token-scoped
  "visual_briefing_shares", // token-scoped
  "music_reference_tracks", // public read for authenticated, admin write
  "marketplace_curated_providers",
  "palcos_curados",
  "editais",
  "music_dna_benchmarks_legacy_backup",
]);

// Edge functions that are intentionally public (no JWT required).
const PUBLIC_EDGE_FUNCTIONS = new Set<string>([
  "audio-analyze",
  "public-stats",
  "get-visual-briefing-share",
  "get-catalog-popularity",
  "get-track-popularity",
  "respond-to-invite",
  "respond-to-platform-invite",
  "search-platform-professionals",
  "search-compatible-playlists",
  "check-opportunity-links",
  "check-playlist-tracks",
  "notify-edital-deadlines",
  "edital-monitor",
  "crawl-fontes-editais",
  "onboarding-matches",
]);

describe("security invariants: migrations", () => {
  // 1. Every public.<table> created must have RLS enabled in SOME migration.
  it("every CREATE TABLE in public has RLS enabled", () => {
    const created = new Set<string>();
    const createRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.([a-z_][a-z0-9_]*)/gi;
    for (const m of allSql.matchAll(createRe)) created.add(m[1].toLowerCase());

    const rlsEnabled = new Set<string>();
    const rlsRe =
      /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
    for (const m of allSql.matchAll(rlsRe)) rlsEnabled.add(m[1].toLowerCase());

    const missing = [...created].filter((t) => !rlsEnabled.has(t) && !t.startsWith("_"));
    expect(missing, `Tables missing ENABLE ROW LEVEL SECURITY: ${missing.join(", ")}`).toEqual([]);
  });

  // 2. Every SECURITY DEFINER function must SET search_path (prevents search_path hijacking).
  //    Only the LATEST definition per function name is checked, since later
  //    CREATE OR REPLACE migrations supersede earlier ones.
  it("every SECURITY DEFINER function sets search_path", () => {
    const latest = new Map<string, string>(); // fn name -> header text of latest def
    const fnRe =
      /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-z_][a-z0-9_]*)[\s\S]*?LANGUAGE[\s\S]*?AS\s+\$[a-z_]*\$/gi;
    // Walk migrations in chronological order (filename sorted) so map ends on latest.
    const sortedSql = [...migrations]
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((m) => m.body)
      .join("\n");
    for (const m of sortedSql.matchAll(fnRe)) {
      latest.set(m[1].toLowerCase(), m[0]);
    }
    const violators: string[] = [];
    for (const [name, header] of latest) {
      if (/SECURITY\s+DEFINER/i.test(header) && !/SET\s+search_path/i.test(header)) {
        violators.push(name);
      }
    }
    expect(violators, `SECURITY DEFINER without SET search_path: ${violators.join(", ")}`).toEqual([]);
  });

  // 3. Public-read tables list stays narrow: no new policy `TO anon ... USING (true)` slips in unnoticed.
  it("no policy grants blanket anon access outside the allowlist", () => {
    const violators: string[] = [];
    const policyRe =
      /CREATE\s+POLICY[\s\S]*?ON\s+(?:public\.)?([a-z_][a-z0-9_]*)[\s\S]*?TO\s+([^;]+?)USING\s*\(\s*true\s*\)/gi;
    for (const m of allSql.matchAll(policyRe)) {
      const table = m[1].toLowerCase();
      const roles = m[2].toLowerCase();
      if (roles.includes("anon") && !PUBLIC_READ_TABLES.has(table)) {
        violators.push(table);
      }
    }
    expect(violators, `Unexpected anon USING(true) policy on: ${violators.join(", ")}`).toEqual([]);
  });
});

describe("security invariants: edge functions", () => {
  const fnDirs = readdirSync(FUNCTIONS_DIR).filter((n) => {
    const full = join(FUNCTIONS_DIR, n);
    return statSync(full).isDirectory() && n !== "_shared";
  });

  it("functions using SERVICE_ROLE_KEY also gate access (JWT, cron token, or are listed as public)", () => {
    const violators: string[] = [];
    for (const name of fnDirs) {
      const file = join(FUNCTIONS_DIR, name, "index.ts");
      let body: string;
      try {
        body = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      const usesServiceRole = /SERVICE_ROLE_KEY/.test(body);
      if (!usesServiceRole) continue;

      const hasAuthCheck = /auth\.getUser\s*\(/.test(body);
      const hasCronGate = /verify_cron_token|x-cron-secret|CRON_SECRET/i.test(body);
      const isPublic = PUBLIC_EDGE_FUNCTIONS.has(name);

      if (!hasAuthCheck && !hasCronGate && !isPublic) {
        violators.push(name);
      }
    }
    expect(
      violators,
      `Edge functions touch service role with no auth/cron gate: ${violators.join(", ")}`,
    ).toEqual([]);
  });
});

describe("security invariants: client code", () => {
  const clientFiles = readAll(join(ROOT, "src"), ".ts")
    .concat(readAll(join(ROOT, "src"), ".tsx"))
    .filter((f) => !f.path.includes("__tests__") && !f.path.includes("/test/"));

  it("no client code looks up invitations by token directly (must use RPC)", () => {
    const violators: string[] = [];
    for (const { path, body } of clientFiles) {
      // .from("project_invitations" | "platform_invitations") ... .eq("token", ...)
      if (
        /from\(\s*["'](?:project|platform)_invitations["']\s*\)[\s\S]{0,400}\.eq\(\s*["']token["']/.test(
          body,
        )
      ) {
        violators.push(path.replace(ROOT + "/", ""));
      }
    }
    expect(
      violators,
      `Direct token lookups must go through respond-to-invite / get_invitation_by_token RPC: ${violators.join(", ")}`,
    ).toEqual([]);
  });

  it("admin pages import the useAdminRole guard", () => {
    const violators: string[] = [];
    for (const name of readdirSync(ADMIN_PAGES_DIR)) {
      if (!name.endsWith(".tsx")) continue;
      const body = readFileSync(join(ADMIN_PAGES_DIR, name), "utf8");
      if (!/useAdminRole/.test(body)) violators.push(`admin/${name}`);
    }
    expect(
      violators,
      `Admin pages missing useAdminRole guard: ${violators.join(", ")}`,
    ).toEqual([]);
  });

  it("guest hooks never read financial fields", () => {
    const guestFiles = clientFiles.filter((f) => /useGuest/.test(f.path));
    const forbidden = /\b(transactions|gross_revenue|net_revenue|cache|valor_total|valor_recebido)\b/;
    const violators: string[] = [];
    for (const { path, body } of guestFiles) {
      const matches = body.match(forbidden);
      if (matches) violators.push(`${path.replace(ROOT + "/", "")} -> ${matches[0]}`);
    }
    expect(
      violators,
      `Guest flow leaking financial fields: ${violators.join(", ")}`,
    ).toEqual([]);
  });
});
