// Busca popularidade (0–100) de até 50 faixas Spotify em batch.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  track_ids?: unknown;
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

async function fetchPopularity(ids: string[], token: string): Promise<Response> {
  return fetch(`https://api.spotify.com/v1/tracks?ids=${ids.join(",")}&market=BR`, {
    headers: { Authorization: `Bearer ${token}` },
  });
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

  try {
    const body = (await req.json()) as RequestBody;
    const ids = Array.isArray(body.track_ids)
      ? body.track_ids.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];

    if (ids.length === 0 || ids.length > 50) {
      return new Response(
        JSON.stringify({ error: "track_ids deve ser um array de 1 a 50 strings" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = await getSpotifyToken();
    let resp = await fetchPopularity(ids, token);

    if (resp.status === 429) {
      const retry = Math.min(5, Number(resp.headers.get("retry-after") ?? "1"));
      await new Promise((r) => setTimeout(r, retry * 1000));
      resp = await fetchPopularity(ids, token);
    }

    if (!resp.ok) {
      return new Response(JSON.stringify({ popularity: {} }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await resp.json();
    const popularity: Record<string, number | null> = {};
    const tracks: Array<{ id?: string; popularity?: number } | null> = json.tracks ?? [];
    tracks.forEach((t, i) => {
      const id = t?.id ?? ids[i];
      popularity[id] = t && typeof t.popularity === "number" ? t.popularity : null;
    });

    return new Response(JSON.stringify({ popularity }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("get-catalog-popularity error", e);
    return new Response(JSON.stringify({ popularity: {} }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
