import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface RequestBody {
  monitor_id: string;
  playlist_id: string;
  track_spotify_uri: string;
}

const UUID_RE = /^[0-9a-f-]{36}$/i;
const URI_RE = /^spotify:track:[A-Za-z0-9]{22}$/;
const ID_RE = /^[A-Za-z0-9]{22}$/;

async function getSpotifyToken(): Promise<string> {
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("spotify_credentials_missing");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    await res.text();
    throw new Error("spotify_auth_failed");
  }
  const data = await res.json();
  return data.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (
      !body?.monitor_id || !UUID_RE.test(body.monitor_id) ||
      !body?.playlist_id || !ID_RE.test(body.playlist_id) ||
      !body?.track_spotify_uri || !URI_RE.test(body.track_spotify_uri)
    ) {
      return new Response(JSON.stringify({ error: "invalid_input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Carrega o monitor — RLS garante que pertence ao usuário
    const { data: monitor, error: monitorErr } = await supabase
      .from("playlist_monitors")
      .select("id, user_id, status, playlist_name, track_name")
      .eq("id", body.monitor_id)
      .maybeSingle();

    if (monitorErr || !monitor) {
      return new Response(JSON.stringify({ error: "monitor_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (monitor.user_id !== userId) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Autentica no Spotify
    let spotifyToken: string;
    try {
      spotifyToken = await getSpotifyToken();
    } catch (_e) {
      return new Response(
        JSON.stringify({ error: "spotify_auth_failed", message: "Não foi possível conectar ao Spotify." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Pagina /v1/playlists/{id}/tracks
    let found = false;
    let nextUrl: string | null =
      `https://api.spotify.com/v1/playlists/${body.playlist_id}/tracks?fields=items(track(uri)),next&limit=100`;
    const MAX_PAGES = 30;
    let pages = 0;

    while (nextUrl && pages < MAX_PAGES && !found) {
      const res = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${spotifyToken}` },
      });
      if (res.status === 429) {
        await res.text();
        return new Response(
          JSON.stringify({ error: "rate_limited", message: "Spotify limitou a verificação. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!res.ok) {
        await res.text();
        return new Response(
          JSON.stringify({ error: "spotify_error", message: "Erro ao consultar a playlist no Spotify." }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const page = await res.json() as { items?: Array<{ track?: { uri?: string } | null }>; next?: string | null };
      const items = page.items ?? [];
      if (items.some((it) => it?.track?.uri === body.track_spotify_uri)) {
        found = true;
        break;
      }
      nextUrl = page.next ?? null;
      pages += 1;
    }

    const checkedAt = new Date().toISOString();
    const wasMonitoring = monitor.status === "monitoring";
    const transitionedToFound = found && wasMonitoring;

    const update: Record<string, unknown> = { last_checked_at: checkedAt };
    if (transitionedToFound) {
      update.status = "found";
      update.found_at = checkedAt;
    }

    const { error: updateErr } = await supabase
      .from("playlist_monitors")
      .update(update)
      .eq("id", body.monitor_id);

    if (updateErr) {
      return new Response(JSON.stringify({ error: "update_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (transitionedToFound) {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "playlist_found",
        title: "Sua faixa entrou em uma playlist! 🎉",
        message: `Sua faixa ${monitor.track_name} foi adicionada à playlist ${monitor.playlist_name}!`,
        link: "/music-dna",
      });
    }

    return new Response(
      JSON.stringify({
        found,
        checked_at: checkedAt,
        status: found ? "found" : monitor.status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (_e) {
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
