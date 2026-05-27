// Importa o catálogo (álbuns, EPs, singles, compilações) de um artista do Spotify.
// Client Credentials Flow. Não persiste no banco — devolve o payload ao frontend.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const MAX_RELEASES = 200;

interface ReleaseOut {
  spotify_album_id: string;
  spotify_album_uri: string;
  name: string;
  type: "album" | "single" | "ep" | "compilation";
  release_date: string | null;
  image_url: string | null;
  total_tracks: number;
  tracks: TrackOut[];
}
interface TrackOut {
  spotify_track_id: string;
  spotify_track_uri: string;
  name: string;
  track_number: number | null;
  duration_ms: number | null;
  isrc: string | null;
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
  if (!resp.ok) throw new Error(`Spotify auth failed: ${resp.status} ${await resp.text()}`);
  const json = await resp.json();
  cachedToken = { token: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return cachedToken.token;
}

async function spotifyGet(url: string, token: string): Promise<any> {
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (resp.status === 429) {
    const retryAfter = Number(resp.headers.get("retry-after") ?? "1");
    await new Promise((r) => setTimeout(r, Math.min(retryAfter, 5) * 1000));
    return spotifyGet(url, token);
  }
  if (!resp.ok) {
    const body = await resp.text();
    console.error(`Spotify ${resp.status} for URL ${url}: ${body}`);
    throw new Error(`Spotify ${resp.status} for ${url}: ${body}`);
  }
  return resp.json();
}

function normalizeType(albumType: string, albumGroup?: string): ReleaseOut["type"] {
  const t = (albumGroup || albumType || "album").toLowerCase();
  if (t === "single") return "single";
  if (t === "compilation") return "compilation";
  if (t === "ep") return "ep";
  return "album";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const url: string = body?.spotify_artist_url ?? "";
    const m = url.match(/artist\/([a-zA-Z0-9]+)/);
    if (!m) {
      return new Response(
        JSON.stringify({ error: "URL inválida. Use um link de artista do Spotify." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const artistId = m[1];

    const token = await getSpotifyToken();

    // 1) Artist
    const artist = await spotifyGet(`https://api.spotify.com/v1/artists/${artistId}`, token);

    // 2) Albums (paginado, com include_groups=album,single,compilation, market=BR)
    type AlbumRaw = {
      id: string;
      uri: string;
      name: string;
      album_type: string;
      album_group?: string;
      release_date: string | null;
      images: { url: string }[];
      total_tracks: number;
    };
    const albums: AlbumRaw[] = [];
    let next: string | null =
      `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,compilation&market=BR&limit=20`;
    let truncated = false;
    while (next) {
      const page = await spotifyGet(next, token);
      for (const item of page.items as AlbumRaw[]) {
        albums.push(item);
        if (albums.length >= MAX_RELEASES) break;
      }
      if (albums.length >= MAX_RELEASES) {
        truncated = page.next != null;
        break;
      }
      next = page.next;
    }

    // Dedup por album_id (a API às vezes repete em mercados)
    const dedup = new Map<string, AlbumRaw>();
    for (const a of albums) if (!dedup.has(a.id)) dedup.set(a.id, a);
    const uniqueAlbums = Array.from(dedup.values());

    // 3) Tracks de cada álbum
    const releases: ReleaseOut[] = [];
    const allTrackIds: string[] = [];
    const trackToRelease = new Map<string, { release: ReleaseOut; track: TrackOut }>();

    for (const a of uniqueAlbums) {
      const tracks: TrackOut[] = [];
      let tNext: string | null =
        `https://api.spotify.com/v1/albums/${a.id}/tracks?market=BR&limit=20`;
      while (tNext) {
        const tp = await spotifyGet(tNext, token);
        for (const it of tp.items as Array<{
          id: string;
          uri: string;
          name: string;
          track_number: number | null;
          duration_ms: number | null;
        }>) {
          if (!it?.id) continue;
          tracks.push({
            spotify_track_id: it.id,
            spotify_track_uri: it.uri ?? `spotify:track:${it.id}`,
            name: it.name,
            track_number: it.track_number ?? null,
            duration_ms: it.duration_ms ?? null,
            isrc: null,
          });
          allTrackIds.push(it.id);
        }
        tNext = tp.next;
      }

      const release: ReleaseOut = {
        spotify_album_id: a.id,
        spotify_album_uri: a.uri ?? `spotify:album:${a.id}`,
        name: a.name,
        type: normalizeType(a.album_type, a.album_group),
        release_date: a.release_date ?? null,
        image_url: a.images?.[0]?.url ?? null,
        total_tracks: a.total_tracks ?? tracks.length,
        tracks,
      };
      releases.push(release);
      for (const t of tracks) trackToRelease.set(t.spotify_track_id, { release, track: t });
    }

    // 4) ISRC em chunks de 50 via /v1/tracks?ids=
    for (let i = 0; i < allTrackIds.length; i += 50) {
      const chunk = allTrackIds.slice(i, i + 50);
      const data = await spotifyGet(
        `https://api.spotify.com/v1/tracks?market=BR&ids=${chunk.join(",")}`,
        token,
      );
      for (const t of (data.tracks ?? []) as Array<{
        id: string;
        external_ids?: { isrc?: string };
      }>) {
        if (!t?.id) continue;
        const entry = trackToRelease.get(t.id);
        if (entry) entry.track.isrc = t.external_ids?.isrc ?? null;
      }
    }

    return new Response(
      JSON.stringify({
        artist_id: artist.id,
        artist_name: artist.name,
        releases,
        truncated,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("import-spotify-catalog error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
