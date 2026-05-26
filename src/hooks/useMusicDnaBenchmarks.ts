import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MusicDnaBenchmark } from "@/types/musicDna";

/**
 * Lê a VIEW unificada `music_dna_benchmarks`, que agora deriva em tempo real
 * de `music_reference_tracks`. Fonte única — sem mais fallback recalculando
 * de `music_dna_analyses` (que misturava dados subjetivos com benchmarks).
 */
export function useMusicDnaBenchmarks() {
  return useQuery({
    queryKey: ["music-dna-benchmarks"],
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_dna_benchmarks" as never)
        .select("*")
        .order("total_faixas", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MusicDnaBenchmark[];
    },
  });
}

/**
 * Para um gênero específico, usa a RPC `get_benchmark_for_genre` que aplica
 * canonicalização + fallback por gênero pai (ex: Trap BR → Hip-Hop).
 */
export async function fetchBenchmarkForGenre(genre: string | undefined): Promise<MusicDnaBenchmark | null> {
  if (!genre) return null;
  const { data, error } = await supabase.rpc("get_benchmark_for_genre" as never, { p_genero: genre } as never);
  if (error) {
    console.warn("[fetchBenchmarkForGenre] RPC failed", error);
    return null;
  }
  const rows = (data ?? []) as unknown as MusicDnaBenchmark[];
  return rows[0] ?? null;
}

/**
 * Match local sobre a lista já carregada (evita ida ao servidor). Mantida
 * para compatibilidade: o front continua usando o hook `useMusicDnaBenchmarks`
 * para listar todos os gêneros e dá match exato/parcial localmente.
 */
export function findBenchmarkForGenre(benchmarks: MusicDnaBenchmark[] | undefined, genre: string | undefined) {
  if (!benchmarks?.length || !genre) return undefined;
  const norm = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const target = norm(genre);
  return (
    benchmarks.find((b) => norm(b.genero) === target) ??
    benchmarks.find((b) => norm(b.genero).includes(target) || target.includes(norm(b.genero)))
  );
}
