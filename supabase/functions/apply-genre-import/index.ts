import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import Papa from "https://esm.sh/papaparse@5.4.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REQUIRED = ["band", "filename", "genre"];
const CHUNK = 500;

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ error: "POST required" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return jsonRes({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: userRes, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !userRes?.user) return jsonRes({ error: "Unauthorized" }, 401);

  const { data: isAdmin } = await admin.rpc("has_role", {
    _user_id: userRes.user.id, _role: "admin",
  });
  if (!isAdmin) return jsonRes({ error: "Admin role required" }, 403);

  // Parse body
  let csvText = "";
  let dropStaging = true;
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      const file = fd.get("file") as File | null;
      if (!file) return jsonRes({ error: "Missing 'file' field" }, 400);
      csvText = await file.text();
      const ds = fd.get("dropStaging");
      if (ds !== null) dropStaging = String(ds) !== "false";
    } else {
      const body = await req.json();
      csvText = body.csv ?? "";
      if (typeof body.dropStaging === "boolean") dropStaging = body.dropStaging;
    }
  } catch (e) {
    return jsonRes({ error: `Invalid request body: ${(e as Error).message}` }, 400);
  }

  if (!csvText.trim()) return jsonRes({ error: "Empty CSV" }, 400);

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true, skipEmptyLines: true, transformHeader: (h: string) => h.trim(),
  });
  const headers = parsed.meta?.fields ?? [];
  const missing = REQUIRED.filter((k) => !headers.includes(k));
  if (missing.length) return jsonRes({ error: "Missing required columns", missing }, 400);

  const rows = parsed.data ?? [];
  let csvSkipped = 0;
  const normalized: Array<{ band: string; filename: string; genre: string }> = [];
  for (const r of rows) {
    const band = String(r.band ?? "").trim();
    const filename = String(r.filename ?? "").trim();
    const genre = String(r.genre ?? "").trim();
    if (!band || !filename || !genre) { csvSkipped++; continue; }
    normalized.push({ band, filename, genre });
  }
  if (!normalized.length) return jsonRes({ error: "No valid rows", csvSkipped }, 400);

  // Reset staging
  const { error: resetErr } = await admin.rpc("reset_genre_import_staging");
  if (resetErr) return jsonRes({ error: `Falha ao preparar staging: ${resetErr.message}` }, 500);

  // Insert in chunks
  let stagingInserted = 0;
  const insertErrors: string[] = [];
  for (let i = 0; i < normalized.length; i += CHUNK) {
    const slice = normalized.slice(i, i + CHUNK);
    const { error } = await admin.from("_genre_import_2026").insert(slice);
    if (error) {
      insertErrors.push(`Chunk ${i}-${i + slice.length}: ${error.message}`);
    } else {
      stagingInserted += slice.length;
    }
  }
  if (!stagingInserted) {
    return jsonRes({ error: "Falha ao inserir staging", details: insertErrors }, 500);
  }

  // Apply
  const { data: applyData, error: applyErr } = await admin.rpc("apply_genre_import_2026", {
    p_drop_staging: dropStaging,
  });
  if (applyErr) {
    return jsonRes({ error: `Falha ao aplicar import: ${applyErr.message}` }, 500);
  }

  const report = (applyData ?? {}) as {
    staging_rows?: number;
    staging_unique?: number;
    updated?: number;
    unchanged?: number;
    unmatched?: number;
    top_genres_after?: Array<{ genre: string; n: number }>;
  };

  // Log
  await admin.from("function_logs").insert({
    function_name: "apply-genre-import",
    level: "info",
    message: `Genre import applied: upd=${report.updated ?? 0} unmatched=${report.unmatched ?? 0}`,
    details: { csvSkipped, stagingInserted, insertErrors, ...report } as never,
  }).then(() => undefined, () => undefined);

  return jsonRes({
    csv_skipped: csvSkipped,
    staging_inserted: stagingInserted,
    insert_errors: insertErrors,
    staging_rows: report.staging_rows ?? 0,
    staging_unique: report.staging_unique ?? 0,
    updated: report.updated ?? 0,
    unchanged: report.unchanged ?? 0,
    unmatched: report.unmatched ?? 0,
    top_genres_after: report.top_genres_after ?? [],
  });
});
