// Busca playlists do Spotify compatíveis com o DNA musical do artista.
// Client Credentials Flow → Search API → classifica Editorial × UGC.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface RequestBody {
  genre?: string;
  subgenre?: string;
  mood?: string[];
  style_tags?: string[];
  references?: string[];
  language?: string;
}

interface PlaylistOut {
  id: string;
  name: string;
  description: string;
  owner_name: string;
  followers: number;
  image_url: string;
  external_url: string;
  tracks_total: number;
}

// ── Token cache (escopo da instância) ────────────────────────────────────────
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getSpotifyToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("Spotify credentials not configured");
  }
  const basic = btoa(`${clientId}:${clientSecret}`);
  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Spotify auth failed: ${resp.status} ${txt}`);
  }
  const json = await resp.json();
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.token;
}

function clean(s: string | undefined | null): string {
  return (s ?? "").toString().trim();
}

function buildQueries(body: RequestBody): string[] {
  const genre = clean(body.genre);
  const subgenre = clean(body.subgenre);
  const mood0 = clean(body.mood?.[0]);
  const tag0 = clean(body.style_tags?.[0]);
  const ref0 = clean(body.references?.[0]);

  const queries: string[] = [];
  const q1 = [genre, subgenre].filter(Boolean).join(" ").trim();
  if (q1) queries.push(q1);
  const q2 = [mood0, genre].filter(Boolean).join(" ").trim();
  if (q2 && q2 !== q1) queries.push(q2);
  const q3 = [tag0, ref0].filter(Boolean).join(" ").trim();
  if (q3 && !queries.includes(q3)) queries.push(q3);

  // Fallback mínimo se o DNA estiver muito vazio
  if (queries.length === 0 && genre) queries.push(genre);
  return queries;
}

async function searchPlaylists(token: string, q: string): Promise<unknown[]> {
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=playlist&market=BR&limit=20`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!resp.ok) {
    await resp.text().catch(() => "");
    return [];
  }
  const json = await resp.json().catch(() => null);
  const items = json?.playlists?.items;
  return Array.isArray(items) ? items : [];
}

function normalize(raw: any): PlaylistOut | null {
  if (!raw || typeof raw !== "object") return null;
  const id = clean(raw.id);
  const name = clean(raw.name);
  if (!id || !name) return null;
  const image_url = Array.isArray(raw.images) && raw.images[0]?.url ? clean(raw.images[0].url) : "";
  if (!image_url) return null;
  const followers = Number(raw.followers?.total ?? 0) || 0;
  return {
    id,
    name,
    description: clean(raw.description),
    owner_name: clean(raw.owner?.display_name) || clean(raw.owner?.id),
    followers,
    image_url,
    external_url: clean(raw.external_urls?.spotify),
    tracks_total: Number(raw.tracks?.total ?? 0) || 0,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const queries = buildQueries(body);

    if (queries.length === 0) {
      return new Response(JSON.stringify({ editorial: [], ugc: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getSpotifyToken();

    const allRaw = (await Promise.all(queries.map((q) => searchPlaylists(token, q)))).flat();

    const seen = new Set<string>();
    const editorial: PlaylistOut[] = [];
    const ugc: PlaylistOut[] = [];

    for (const raw of allRaw) {
      const item = normalize(raw);
      if (!item) continue;
      if (seen.has(item.id)) continue;

      const ownerId = clean((raw as any)?.owner?.id).toLowerCase();
      const isEditorial = ownerId === "spotify";

      if (isEditorial) {
        if (editorial.length >= 6) continue;
        seen.add(item.id);
        editorial.push(item);
      } else {
        if (item.followers < 1000) continue;
        if (ugc.length >= 8) continue;
        seen.add(item.id);
        ugc.push(item);
      }
    }

    editorial.sort((a, b) => b.followers - a.followers);
    ugc.sort((a, b) => b.followers - a.followers);

    return new Response(JSON.stringify({ editorial, ugc }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[search-compatible-playlists] Error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
