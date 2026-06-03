// Shared CORS headers for all edge functions.
// Import: import { corsHeaders, cronCorsHeaders } from "../_shared/cors.ts";

/** Standard headers for user-facing functions (called from the browser). */
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Headers for cron-only functions — restricts browser invocation to the app domain. */
export const cronCorsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "https://app.jamsessionproject.com.br",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Extended headers for functions that receive Supabase SDK metadata. */
export const sdkCorsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": [
    "authorization",
    "x-client-info",
    "apikey",
    "content-type",
    "x-supabase-client-platform",
    "x-supabase-client-platform-version",
    "x-supabase-client-runtime",
    "x-supabase-client-runtime-version",
  ].join(", "),
};
