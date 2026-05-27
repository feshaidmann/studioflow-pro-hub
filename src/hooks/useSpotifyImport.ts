import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SpotifyTrackPayload {
  spotify_track_id: string;
  spotify_track_uri: string;
  name: string;
  track_number: number | null;
  duration_ms: number | null;
  isrc: string | null;
}
export interface SpotifyReleasePayload {
  spotify_album_id: string;
  spotify_album_uri: string;
  name: string;
  type: "album" | "single" | "ep" | "compilation";
  release_date: string | null;
  image_url: string | null;
  total_tracks: number;
  tracks: SpotifyTrackPayload[];
}
export interface CatalogResponse {
  artist_id: string;
  artist_name: string;
  releases: SpotifyReleasePayload[];
  truncated?: boolean;
}

export function useExistingReleaseIds() {
  return useQuery({
    queryKey: ["spotify-releases", "ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("spotify_releases")
        .select("spotify_album_id");
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.spotify_album_id));
    },
  });
}

export function useFetchSpotifyCatalog() {
  return useMutation({
    mutationFn: async (spotify_artist_url: string): Promise<CatalogResponse> => {
      const { data, error } = await supabase.functions.invoke<CatalogResponse>(
        "import-spotify-catalog",
        { body: { spotify_artist_url } },
      );
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Resposta vazia da importação");
      return data;
    },
  });
}

export function useImportSpotifySelection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (releases: SpotifyReleasePayload[]) => {
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData.user?.id;
      if (!user_id) throw new Error("Não autenticado");

      let releasesInserted = 0;
      let tracksInserted = 0;

      for (const r of releases) {
        // Upsert release (idempotente via UNIQUE user_id+spotify_album_id)
        const { data: relRows, error: relErr } = await supabase
          .from("spotify_releases")
          .upsert(
            {
              user_id,
              spotify_album_id: r.spotify_album_id,
              spotify_album_uri: r.spotify_album_uri,
              name: r.name,
              release_type: r.type,
              release_date: r.release_date,
              image_url: r.image_url,
              total_tracks: r.total_tracks,
            },
            { onConflict: "user_id,spotify_album_id", ignoreDuplicates: false },
          )
          .select("id, created_at, imported_at")
          .limit(1);
        if (relErr) throw relErr;
        const release = relRows?.[0];
        if (!release) continue;

        // Considera "novo" quando created_at === imported_at (1ª importação)
        const isNew =
          release.created_at && release.imported_at &&
          new Date(release.imported_at).getTime() >= new Date(release.created_at).getTime() - 1000 &&
          new Date(release.imported_at).getTime() <= new Date(release.created_at).getTime() + 1000;
        if (isNew) releasesInserted++;

        if (r.tracks.length > 0) {
          const rows = r.tracks.map((t) => ({
            user_id,
            release_id: release.id,
            spotify_track_id: t.spotify_track_id,
            spotify_track_uri: t.spotify_track_uri,
            name: t.name,
            track_number: t.track_number,
            duration_ms: t.duration_ms,
            isrc: t.isrc,
          }));
          const { data: trackRows, error: trkErr } = await supabase
            .from("spotify_tracks")
            .upsert(rows, {
              onConflict: "user_id,spotify_track_id",
              ignoreDuplicates: true,
            })
            .select("id");
          if (trkErr) throw trkErr;
          tracksInserted += trackRows?.length ?? 0;
        }
      }

      return { releasesInserted, tracksInserted };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["spotify-releases"] });
      qc.invalidateQueries({ queryKey: ["spotify-tracks-with-uri"] });
    },
  });
}
