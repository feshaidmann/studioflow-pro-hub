import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Vitest configuration for the dynamic RLS end-to-end suite.
 *
 * Runs against a real Supabase project, separate from the unit run.
 * Triggered with `npm run test:rls`. Requires the following env vars:
 *   - SUPABASE_URL
 *   - SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY / SUPABASE_PUBLISHABLE_KEY)
 *   - SUPABASE_SERVICE_ROLE_KEY  (setup/teardown only — never exposed to test clients)
 *
 * The suite refuses to run against the production project ref unless
 * RLS_TEST_ALLOW_PROD=1 is explicitly set.
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/test/rls/**/*.e2e.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    sequence: { concurrent: false },
    fileParallelism: false,
    reporters: ["verbose"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
