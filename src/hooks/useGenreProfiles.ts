import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  HARDCODED_GENRE_PROFILES,
  mergeProfiles,
  type BenchmarkRow,
  type GenreFeatureProfile,
} from "@/lib/genreClassifier";

export function useGenreProfiles() {
  return useQuery<Record<string, GenreFeatureProfile>>({
    queryKey: ["genre-classifier-profiles"],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_dna_benchmarks")
        .select("genero,total_faixas,avg_tempo_bpm,avg_danceability,avg_energy,avg_acousticness,avg_instrumentalness,avg_valence,avg_speechiness,avg_loudness_db")
        .gte("total_faixas", 5);
      if (error) {
        console.warn("[useGenreProfiles] benchmarks fetch failed; using hardcoded only", error);
        return HARDCODED_GENRE_PROFILES;
      }
      return mergeProfiles(HARDCODED_GENRE_PROFILES, (data ?? []) as BenchmarkRow[]);
    },
  });
}
