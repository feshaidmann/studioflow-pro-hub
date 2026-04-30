import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import Papa from "https://esm.sh/papaparse@5.4.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REQUIRED = ["band", "filename", "genre"];
const NUM_FIELDS = [
  "duration_sec","tempo_bpm","tempo_confidence","key_index","danceability","energy",
  "loudness_rms_db","lufs_integrated","dynamic_range_db","speechiness","acousticness",
  "instrumentalness","liveness","valence","spectral_centroid","spectral_bandwidth",
  "spectral_rolloff","spectral_flatness","zero_crossing_rate","segments_count",
];
const TXT_FIELDS = ["band","filename","genre","key_name","mode","lufs_method","analysis_date"];
const SC_LEN = 7, MFCC_LEN = 13, CHROMA_LEN = 12;
const CHUNK = 200;

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function pickArray(row: Record<string, string>, prefix: string, len: number): number[] | null {
  const arr: number[] = [];
  for (let i = 1; i <= len; i++) {
    const v = row[`${prefix}_${i}`];
    if (v === undefined || v === "") return null;
    const n = Number(v);
    if (!isFinite(n)) return null;
    arr.push(n);
  }
  return arr;
}

function safeJsonParse(s: string | undefined): unknown {
  if (!s) return [];
  try { return JSON.parse(s); } catch { return []; }
}

function normalizeRow(raw: Record<string, string>, batch: string): Record<string, unknown> | null {
  for (const k of REQUIRED) {
    if (!raw[k] || String(raw[k]).trim() === "") return null;
  }
  const out: Record<string, unknown> = { source_batch: batch };
  for (const k of TXT_FIELDS) {
    if (raw[k] !== undefined) out[k] = String(raw[k]).trim();
  }
  for (const k of NUM_FIELDS) {
    const v = raw[k];
    if (v === undefined || v === "") continue;
    const n = Number(v);
    if (isFinite(n)) out[k] = n;
  }
  const sc = pickArray(raw, "spectral_contrast", SC_LEN);
  if (sc) out.spectral_contrast = sc;
  const mf = pickArray(raw, "mfcc", MFCC_LEN);
  if (mf) out.mfcc = mf;
  const ch = pickArray(raw, "chroma_cens", CHROMA_LEN);
  if (ch) out.chroma_cens = ch;
  if (raw.beat_times) out.beat_times = safeJsonParse(raw.beat_times);
  // Strip file_path explicitly (privacy)
  delete (out as Record<string, unknown>).file_path;
  return out;
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

  let csvText = "";
  let batchName = `batch-${new Date().toISOString()}`;
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      const file = fd.get("file") as File | null;
      if (!file) return jsonRes({ error: "Missing 'file' field" }, 400);
      csvText = await file.text();
      batchName = file.name || batchName;
    } else {
      const body = await req.json();
      csvText = body.csv ?? "";
      batchName = body.batchName ?? batchName;
    }
  } catch (e) {
    return jsonRes({ error: `Invalid request body: ${(e as Error).message}` }, 400);
  }

  if (!csvText.trim()) return jsonRes({ error: "Empty CSV" }, 400);

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true, skipEmptyLines: true, transformHeader: (h: string) => h.trim(),
  });
  if (parsed.errors?.length) {
    console.error("[import-reference-tracks] parse errors", parsed.errors.slice(0, 3));
  }
  const rows = parsed.data ?? [];
  if (!rows.length) return jsonRes({ error: "No data rows found" }, 400);

  const headers = parsed.meta?.fields ?? [];
  const missing = REQUIRED.filter((k) => !headers.includes(k));
  if (missing.length) return jsonRes({ error: "Missing required columns", missing }, 400);

  const normalized: Record<string, unknown>[] = [];
  let skipped = 0;
  for (const r of rows) {
    const n = normalizeRow(r, batchName);
    if (n) normalized.push(n); else skipped++;
  }
  if (!normalized.length) return jsonRes({ error: "No valid rows after normalization", skipped }, 400);

  let inserted = 0, updated = 0;
  const allGenres = new Set<string>();
  const errors: string[] = [];

  for (let i = 0; i < normalized.length; i += CHUNK) {
    const slice = normalized.slice(i, i + CHUNK);
    const { data, error } = await admin.rpc("upsert_reference_tracks", { p_rows: slice });
    if (error) {
      errors.push(`Chunk ${i}-${i + slice.length}: ${error.message}`);
      continue;
    }
    const row = Array.isArray(data) ? data[0] : data;
    inserted += row?.inserted_count ?? 0;
    updated  += row?.updated_count ?? 0;
    for (const g of (row?.genres_updated ?? []) as string[]) allGenres.add(g);
  }

  // Recalc benchmarks for affected genres (best-effort)
  const recalcResults: Record<string, string> = {};
  for (const g of allGenres) {
    const { error } = await admin.rpc("recalcular_benchmark_genero", { p_genero: g });
    recalcResults[g] = error ? `error: ${error.message}` : "ok";
  }

  // Log
  await admin.from("function_logs").insert({
    function_name: "import-reference-tracks",
    level: "info",
    message: `Imported ${batchName}: ins=${inserted} upd=${updated} skipped=${skipped}`,
    details: { genres_updated: Array.from(allGenres), errors, recalcResults } as never,
  }).then(() => undefined, () => undefined);

  return jsonRes({
    batch: batchName,
    total_rows: rows.length,
    inserted, updated, skipped,
    genres_updated: Array.from(allGenres),
    benchmarks_recalc: recalcResults,
    errors,
  });
});
