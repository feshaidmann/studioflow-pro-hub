import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NeighborEnrichment {
  mbid: string | null;
  deezer_id: number | null;
  deezer_preview_url: string | null;
  deezer_cover_url: string | null;
  musicbrainz_tags: { name: string; count: number }[];
  listenbrainz_similar: { name: string; score: number | null }[];
}

export function useNeighborEnrichment(artist: string | null | undefined, title: string | null | undefined) {
  return useQuery({
    queryKey: ["neighbor-enrichment", artist, title],
    enabled: !!artist?.trim() && !!title?.trim(),
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async (): Promise<NeighborEnrichment | null> => {
      const { data, error } = await supabase.functions.invoke("enrich-neighbor-context", {
        body: { artist, title },
      });
      if (error) throw error;
      return (data?.data as NeighborEnrichment) ?? null;
    },
  });
}
