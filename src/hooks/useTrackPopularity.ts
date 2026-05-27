import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TrackPopularityResult {
  track_popularity: number | null;
  genre_median: number | null;
  genre_name: string | null;
  references_count: number;
}

export function useTrackPopularity(
  spotifyTrackId: string | null | undefined,
  genre: string | null | undefined,
) {
  return useQuery({
    queryKey: ["track-popularity", spotifyTrackId, genre],
    enabled: !!spotifyTrackId,
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<TrackPopularityResult> => {
      const { data, error } = await supabase.functions.invoke<TrackPopularityResult>(
        "get-track-popularity",
        { body: { spotify_track_id: spotifyTrackId, genre: genre ?? "" } },
      );
      if (error) throw error;
      return data!;
    },
  });
}
