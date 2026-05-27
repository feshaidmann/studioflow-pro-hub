// Retorna popularidade Spotify (0–100) da faixa + mediana do gênero a partir de music_reference_tracks.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  spotify_track_id?: string | null;
  genre?: string | null;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getSpotifyToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.token;
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Spotify credentials not configured");
  const basic = btoa(`${clientId}:${clientSecret}`);
  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!resp.ok) throw new Error(`Spotify auth failed: ${resp.status}`);
  const json = await resp.json();
  cachedToken = { token: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return cachedToken.token;
}

function median(values: number[]): number | null {
  const nums = values.filter((n) => typeof n === "number" && !Number.isNaN(n)).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 0 ? Math.round((nums[mid - 1] + nums[mid]) / 2) : nums[mid];
}

async function fetchReferenceIds(
  supabase: ReturnType<typeof createClient>,
  genre: string,
): Promise<string[]> {
  const tryFetch = async (column: "genre_canonical" | "genre") => {
    const { data, error } = await supabase
      .from("music_reference_tracks")
      .select("spotify_id")
      .eq(column, genre)
      .eq("active", true)
      .not("spotify_id", "is", null)
      .limit(30);
    if (error) return [];
    return (data ?? []).map((r: { spotify_id: string | null }) => r.spotify_id).filter((s): s is string => !!s);
  };
  let ids = await tryFetch("genre_canonical");
  if (ids.length < 5) {
    const fallback = await tryFetch("genre");
    if (fallback.length > ids.length) ids = fallback;
  }
  return ids;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const emptyResponse = {
    track_popularity: null,
    genre_median: null,
    genre_name: null,
    references_count: 0,
  };

  try {
    const body = (await req.json()) as RequestBody;
    const spotifyTrackId = (body.spotify_track_id ?? "").trim();
    const genre = (body.genre ?? "").trim();

    if (!spotifyTrackId) {
      return new Response(JSON.stringify(emptyResponse), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getSpotifyToken();

    // 1. Popularidade da faixa
    let trackPopularity: number | null = null;
    try {
      const r = await fetch(`https://api.spotify.com/v1/tracks/${encodeURIComponent(spotifyTrackId)}?market=BR`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const j = await r.json();
        trackPopularity = typeof j.popularity === "number" ? j.popularity : null;
      }
    } catch (_e) {
      // continua
    }

    // 2. Mediana do gênero
    let genreMedian: number | null = null;
    let referencesCount = 0;
    if (genre) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const ids = await fetchReferenceIds(supabase, genre);
      if (ids.length > 0) {
        try {
          const r = await fetch(
            `https://api.spotify.com/v1/tracks?ids=${ids.join(",")}&market=BR`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (r.ok) {
            const j = await r.json();
            const pops: number[] = (j.tracks ?? [])
              .filter((t: unknown) => t && typeof (t as { popularity?: number }).popularity === "number")
              .map((t: { popularity: number }) => t.popularity);
            referencesCount = pops.length;
            genreMedian = median(pops);
          }
        } catch (_e) {
          // continua
        }
      }
    }

    return new Response(
      JSON.stringify({
        track_popularity: trackPopularity,
        genre_median: genreMedian,
        genre_name: genre || null,
        references_count: referencesCount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("get-track-popularity error", e);
    return new Response(JSON.stringify(emptyResponse), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
