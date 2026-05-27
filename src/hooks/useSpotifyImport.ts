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

export interface SpotifyReleaseRow {
  id: string;
  spotify_album_id: string;
  spotify_album_uri: string | null;
  name: string;
  release_type: string;
  release_date: string | null;
  image_url: string | null;
  total_tracks: number | null;
  imported_at: string;
  tracks?: {
    id: string;
    name: string;
    spotify_track_uri: string;
    track_number: number | null;
    duration_ms: number | null;
    isrc: string | null;
    linked_analysis: {
      id: string;
      version_label: string | null;
      version_number: number | null;
      created_at: string;
    } | null;
  }[];
}

export function useSpotifyCatalog() {
  return useQuery({
    queryKey: ["spotify-releases"],
    queryFn: async (): Promise<SpotifyReleaseRow[]> => {
      const { data, error } = await supabase
        .from("spotify_releases")
        .select(`
          id, spotify_album_id, spotify_album_uri, name, release_type,
          release_date, image_url, total_tracks, imported_at,
          spotify_tracks (
            id, name, spotify_track_uri, track_number, duration_ms, isrc,
            music_dna_analyses (id, version_label, version_number, created_at)
          )
        `)
        .order("release_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        tracks: (r.spotify_tracks ?? []).map((t: any) => ({
          ...t,
          linked_analysis: Array.isArray(t.music_dna_analyses)
            ? (t.music_dna_analyses[0] ?? null)
            : (t.music_dna_analyses ?? null),
        })),
      })) as SpotifyReleaseRow[];
    },
  });
}

export function useDeleteSpotifyRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("spotify_releases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["spotify-releases"] });
      qc.invalidateQueries({ queryKey: ["spotify-tracks-with-uri"] });
    },
  });
}
