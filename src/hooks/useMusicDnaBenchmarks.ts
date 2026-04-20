import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MusicDnaBenchmark } from "@/types/musicDna";

export function useMusicDnaBenchmarks() {
  return useQuery({
    queryKey: ["music-dna-benchmarks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_dna_benchmarks" as never)
        .select("*")
        .order("total_faixas", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as MusicDnaBenchmark[];
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function findBenchmarkForGenre(benchmarks: MusicDnaBenchmark[] | undefined, genre: string | undefined) {
  if (!benchmarks?.length) return undefined;
  if (!genre) return benchmarks[0];
  const normalizedGenre = genre.toLowerCase();
  return benchmarks.find((benchmark) => normalizedGenre.includes(benchmark.genero.toLowerCase())) ?? benchmarks[0];
}