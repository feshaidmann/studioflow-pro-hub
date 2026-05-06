// Exports music_reference_tracks as a public JSON snapshot in creative-assets bucket.
// Admin-only (verified via JWT + has_role).
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const SNAPSHOT_VERSION = "v1";
const SNAPSHOT_PATH = `acoustic-catalog/${SNAPSHOT_VERSION}.json`;
const BUCKET = "creative-assets";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // AuthZ: caller must be an admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull all reference tracks (paginated to avoid 1k cap)
    const cols = [
      "band", "filename", "genre", "tempo_bpm", "key_name", "mode",
      "lufs_integrated", "dynamic_range_db", "spectral_centroid",
      "spectral_bandwidth", "spectral_rolloff", "spectral_flatness",
      "zero_crossing_rate", "energy", "danceability", "valence",
      "acousticness", "instrumentalness", "speechiness", "liveness",
      "mfcc", "chroma_cens",
    ].join(",");

    const pageSize = 500;
    let from = 0;
    const rows: any[] = [];
    while (true) {
      const { data, error } = await admin
        .from("music_reference_tracks")
        .select(cols)
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      rows.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    const payload = {
      version: SNAPSHOT_VERSION,
      generated_at: new Date().toISOString(),
      count: rows.length,
      tracks: rows,
    };
    const body = new TextEncoder().encode(JSON.stringify(payload));

    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(SNAPSHOT_PATH, body, {
        contentType: "application/json",
        upsert: true,
        cacheControl: "3600",
      });
    if (upErr) throw upErr;

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(SNAPSHOT_PATH);

    return new Response(
      JSON.stringify({
        ok: true,
        count: rows.length,
        path: SNAPSHOT_PATH,
        public_url: pub.publicUrl,
        size_bytes: body.byteLength,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("export-acoustic-catalog error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
