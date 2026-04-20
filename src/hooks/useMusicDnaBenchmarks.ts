import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MusicDnaBenchmark } from "@/types/musicDna";

export function useMusicDnaBenchmarks() {
  return useQuery({
    queryKey: ["music-dna-benchmarks"],
    queryFn: async () => {
      const { data: publicBenchmarks, error } = await supabase
        .from("music_dna_benchmarks" as never)
        .select("*")
        .order("total_faixas", { ascending: false });

      if (error) throw error;
      if (publicBenchmarks?.length) return publicBenchmarks as unknown as MusicDnaBenchmark[];

      const { data: analyses, error: analysesError } = await supabase
        .from("music_dna_analyses")
        .select("genre,danceability,energy,loudness_db,speechiness,acousticness,instrumentalness,liveness,valence,tempo_bpm,lufs_integrated,key_name,mode_name")
        .not("danceability", "is", null);

      if (analysesError) throw analysesError;

      const groups = new Map<string, any[]>();
      for (const analysis of analyses ?? []) {
        const genre = analysis.genre || "Minhas análises";
        groups.set(genre, [...(groups.get(genre) ?? []), analysis]);
      }

      return Array.from(groups.entries()).map(([genero, rows]) => {
        const avg = (key: string) => rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0) / rows.length;
        const top_keys = rows.reduce<Record<string, number>>((acc, row) => {
          const key = [row.key_name, row.mode_name].filter(Boolean).join(" ") || "—";
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {});

        return {
          genero,
          total_faixas: rows.length,
          avg_danceability: avg("danceability"),
          avg_energy: avg("energy"),
          avg_loudness_db: avg("loudness_db"),
          avg_speechiness: avg("speechiness"),
          avg_acousticness: avg("acousticness"),
          avg_instrumentalness: avg("instrumentalness"),
          avg_liveness: avg("liveness"),
          avg_valence: avg("valence"),
          avg_tempo_bpm: avg("tempo_bpm"),
          avg_lufs: avg("lufs_integrated"),
          top_keys,
        } as MusicDnaBenchmark;
      });
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