import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MusicDnaBenchmark } from "@/types/musicDna";

const GENRE_ALIASES: Record<string, string> = {
  mpb: "MPB Contemporânea",
  "musica popular brasileira": "MPB Contemporânea",
  bossa: "Bossa Nova",
  samba: "Samba",
  pagode: "Pagode",
  funk: "Funk Carioca",
  "funk carioca": "Funk Carioca",
  forro: "Forró / Piseiro",
  piseiro: "Forró / Piseiro",
  sertanejo: "Sertanejo Universitário",
  "sertanejo raiz": "Sertanejo Raiz",
  "sertanejo universitario": "Sertanejo Universitário",
  pop: "Pop Brasileiro",
  "pop brasileiro": "Pop Brasileiro",
  indie: "Indie BR",
  "indie br": "Indie BR",
  rock: "Rock Alternativo BR",
  rap: "Rap BR",
  trap: "Trap BR",
  "trap brasileiro": "Trap BR",
  rnb: "R&B / Soul",
  "r&b": "R&B / Soul",
  soul: "R&B / Soul",
  reggae: "Reggae BR",
  axe: "Axé / Pop Bahia",
  axé: "Axé / Pop Bahia",
  lofi: "Lo-Fi Hip Hop",
  "lo-fi": "Lo-Fi Hip Hop",
  house: "Eletrônica / House",
  eletronica: "Eletrônica / House",
  eletrônica: "Eletrônica / House",
  folk: "Indie Folk",
};

function normalizeGenre(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9& ]/g, " ").replace(/\s+/g, " ").trim();
}

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
  if (!genre) return undefined;
  const normalizedGenre = genre.toLowerCase();
  const canonical = GENRE_ALIASES[normalizeGenre(genre)] ?? genre;
  const normalizedCanonical = normalizeGenre(canonical);
  return benchmarks.find((benchmark) => normalizeGenre(benchmark.genero) === normalizedCanonical)
    ?? benchmarks.find((benchmark) => normalizedGenre.includes(benchmark.genero.toLowerCase()) || normalizeGenre(benchmark.genero).includes(normalizedCanonical));
}