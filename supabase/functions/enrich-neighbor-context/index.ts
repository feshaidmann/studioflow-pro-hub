import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UA = "StudioFlowPro/2.0 (suporte@jamsessionproject.com.br)";
const CACHE_TTL_DAYS = 30;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalize(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function fetchDeezer(artist: string, title: string) {
  try {
    const q = encodeURIComponent([title, artist].filter(Boolean).join(" "));
    const r = await fetch(`https://api.deezer.com/search?q=${q}&limit=1`);
    const data = await r.json();
    const t = data.data?.[0];
    if (!t) return null;
    return {
      deezer_id: t.id ?? null,
      deezer_preview_url: t.preview ?? null,
      deezer_cover_url: t.album?.cover_medium ?? null,
    };
  } catch (e) {
    console.error("[enrich] deezer error", e);
    return null;
  }
}

async function fetchMusicBrainz(artist: string, title: string) {
  try {
    const q = encodeURIComponent(`recording:"${title}" AND artist:"${artist}"`);
    const r = await fetch(
      `https://musicbrainz.org/ws/2/recording?query=${q}&fmt=json&limit=1`,
      { headers: { "User-Agent": UA } }
    );
    const data = await r.json();
    const rec = data.recordings?.[0];
    if (!rec) return null;
    const tags = (rec.tags ?? []).map((t: { name: string; count: number }) => ({
      name: t.name,
      count: t.count,
    }));
    return { mbid: rec.id, tags, artist_mbid: rec["artist-credit"]?.[0]?.artist?.id ?? null };
  } catch (e) {
    console.error("[enrich] musicbrainz error", e);
    return null;
  }
}

async function fetchListenBrainzSimilar(artistMbid: string | null) {
  if (!artistMbid) return [];
  try {
    const r = await fetch(
      `https://api.listenbrainz.org/1/similar-artists/json?artist_mbids=${artistMbid}&algorithm=session_based_days_7500_session_300_contribution_5_threshold_10_limit_100_filter_True_skip_30`
    );
    if (!r.ok) return [];
    const data = await r.json();
    const list = Array.isArray(data) ? data[0]?.similar_artists ?? [] : [];
    return list.slice(0, 6).map((a: { name: string; score?: number }) => ({
      name: a.name,
      score: a.score ?? null,
    }));
  } catch (e) {
    console.error("[enrich] listenbrainz error", e);
    return [];
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user } } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { artist, title } = await req.json();
    if (!artist?.trim() || !title?.trim()) {
      return json({ error: "artist and title are required" }, 400);
    }

    const artist_key = normalize(artist);
    const track_key = normalize(title);

    // Cache lookup
    const { data: cached } = await admin
      .from("music_external_metadata")
      .select("*")
      .eq("artist_key", artist_key)
      .eq("track_key", track_key)
      .maybeSingle();

    if (cached) {
      const ageMs = Date.now() - new Date(cached.fetched_at).getTime();
      if (ageMs < CACHE_TTL_DAYS * 86400 * 1000) {
        return json({ cached: true, data: cached });
      }
    }

    // Fetch in parallel where independent
    const [deezer, mb] = await Promise.all([
      fetchDeezer(artist, title),
      fetchMusicBrainz(artist, title),
    ]);
    const similar = await fetchListenBrainzSimilar(mb?.artist_mbid ?? null);

    const payload = {
      artist_key,
      track_key,
      mbid: mb?.mbid ?? null,
      deezer_id: deezer?.deezer_id ?? null,
      deezer_preview_url: deezer?.deezer_preview_url ?? null,
      deezer_cover_url: deezer?.deezer_cover_url ?? null,
      musicbrainz_tags: mb?.tags ?? [],
      listenbrainz_similar: similar,
      raw: { artist, title },
      fetched_at: new Date().toISOString(),
    };

    const { data: upserted, error: upErr } = await admin
      .from("music_external_metadata")
      .upsert(payload, { onConflict: "artist_key,track_key" })
      .select()
      .single();
    if (upErr) console.error("[enrich] upsert error", upErr);

    return json({ cached: false, data: upserted ?? payload });
  } catch (e) {
    console.error("[enrich] error", e);
    return json({ error: e instanceof Error ? e.message : "Internal error" }, 500);
  }
});
