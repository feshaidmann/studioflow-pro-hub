// Classificador de gênero por similaridade de cosseno sobre features acústicas.
// Perfis hardcoded a partir de análise externa (~1.300 faixas) e merge com
// benchmarks dinâmicos do catálogo BR (music_dna_benchmarks) quando disponíveis.

export interface GenreFeatureProfile {
  tempo: number;          // 0-1 (tempo_bpm normalizado entre 60-200)
  danceability: number;
  energy: number;
  acousticness: number;
  instrumentalness: number;
  valence: number;
  speechiness: number;
  loudness: number;       // 0-1 (loudness dB normalizado entre -60..0)
}

export interface RawTrackFeatures {
  tempo_bpm?: number | null;
  danceability?: number | null;
  energy?: number | null;
  acousticness?: number | null;
  instrumentalness?: number | null;
  valence?: number | null;
  speechiness?: number | null;
  loudness_rms_db?: number | null;
  lufs_integrated?: number | null;
}

export interface ClassifierResult {
  detected: string;
  score: number;
  runnerUp: { genre: string; score: number } | null;
  top3: Array<{ genre: string; score: number }>;
}

// 16 perfis internacionais de fallback (médias normalizadas 0-1).
export const HARDCODED_GENRE_PROFILES: Record<string, GenreFeatureProfile> = {
  "Folk Rock":   { tempo: 0.45, danceability: 0.68, energy: 0.58, acousticness: 0.62, instrumentalness: 0.05, valence: 0.68, speechiness: 0.22, loudness: 0.65 },
  "Grunge":      { tempo: 0.55, danceability: 0.65, energy: 0.57, acousticness: 0.48, instrumentalness: 0.10, valence: 0.50, speechiness: 0.30, loudness: 0.70 },
  "Hip-Hop":     { tempo: 0.50, danceability: 0.65, energy: 0.60, acousticness: 0.40, instrumentalness: 0.35, valence: 0.55, speechiness: 0.32, loudness: 0.68 },
  "Jazz":        { tempo: 0.45, danceability: 0.65, energy: 0.52, acousticness: 0.68, instrumentalness: 0.25, valence: 0.60, speechiness: 0.18, loudness: 0.72 },
  "Synth-Pop":   { tempo: 0.48, danceability: 0.68, energy: 0.62, acousticness: 0.55, instrumentalness: 0.05, valence: 0.65, speechiness: 0.22, loudness: 0.68 },
  "Eletrônico":  { tempo: 0.52, danceability: 0.70, energy: 0.62, acousticness: 0.50, instrumentalness: 0.40, valence: 0.60, speechiness: 0.20, loudness: 0.70 },
  "Rock":        { tempo: 0.52, danceability: 0.68, energy: 0.60, acousticness: 0.52, instrumentalness: 0.05, valence: 0.68, speechiness: 0.28, loudness: 0.68 },
  "Pop":         { tempo: 0.45, danceability: 0.70, energy: 0.60, acousticness: 0.58, instrumentalness: 0.05, valence: 0.72, speechiness: 0.22, loudness: 0.65 },
  "Heavy Metal": { tempo: 0.52, danceability: 0.68, energy: 0.62, acousticness: 0.50, instrumentalness: 0.05, valence: 0.62, speechiness: 0.30, loudness: 0.68 },
  "Punk Rock":   { tempo: 0.55, danceability: 0.65, energy: 0.58, acousticness: 0.45, instrumentalness: 0.05, valence: 0.58, speechiness: 0.32, loudness: 0.68 },
  "Country":     { tempo: 0.52, danceability: 0.65, energy: 0.50, acousticness: 0.60, instrumentalness: 0.05, valence: 0.68, speechiness: 0.22, loudness: 0.72 },
  "Reggae":      { tempo: 0.48, danceability: 0.70, energy: 0.48, acousticness: 0.62, instrumentalness: 0.25, valence: 0.58, speechiness: 0.32, loudness: 0.75 },
  "Ambient":     { tempo: 0.55, danceability: 0.62, energy: 0.28, acousticness: 0.80, instrumentalness: 0.55, valence: 0.50, speechiness: 0.12, loudness: 0.85 },
  "Soul":        { tempo: 0.40, danceability: 0.70, energy: 0.62, acousticness: 0.60, instrumentalness: 0.05, valence: 0.62, speechiness: 0.22, loudness: 0.68 },
  "Funk":        { tempo: 0.50, danceability: 0.65, energy: 0.62, acousticness: 0.48, instrumentalness: 0.05, valence: 0.68, speechiness: 0.22, loudness: 0.70 },
  "Bossa Nova":  { tempo: 0.45, danceability: 0.70, energy: 0.48, acousticness: 0.78, instrumentalness: 0.05, valence: 0.68, speechiness: 0.15, loudness: 0.78 },
};

export function normalizeFeatures(f: RawTrackFeatures): GenreFeatureProfile | null {
  const tempo = f.tempo_bpm ?? null;
  const loud = f.loudness_rms_db ?? f.lufs_integrated ?? null;
  if (tempo == null || loud == null) return null;
  const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  return {
    tempo: clamp((tempo - 60) / 140),
    danceability: clamp(f.danceability ?? 0.5),
    energy: clamp(f.energy ?? 0.5),
    acousticness: clamp(f.acousticness ?? 0.5),
    instrumentalness: clamp(f.instrumentalness ?? 0.1),
    valence: clamp(f.valence ?? 0.5),
    speechiness: clamp(f.speechiness ?? 0.2),
    loudness: clamp((loud + 60) / 60),
  };
}

const KEYS: (keyof GenreFeatureProfile)[] = [
  "tempo", "danceability", "energy", "acousticness",
  "instrumentalness", "valence", "speechiness", "loudness",
];

function cosineSimilarity(a: GenreFeatureProfile, b: GenreFeatureProfile): number {
  let dot = 0, magA = 0, magB = 0;
  for (const k of KEYS) {
    const va = a[k], vb = b[k];
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}

export function classifyGenre(
  rawFeatures: RawTrackFeatures,
  profiles: Record<string, GenreFeatureProfile>,
): ClassifierResult | null {
  const norm = normalizeFeatures(rawFeatures);
  if (!norm) return null;
  const scored = Object.entries(profiles).map(([genre, profile]) => ({
    genre,
    score: cosineSimilarity(norm, profile),
  })).sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;
  return {
    detected: scored[0].genre,
    score: scored[0].score,
    runnerUp: scored[1] ?? null,
    top3: scored.slice(0, 3),
  };
}

// Merge benchmarks dinâmicos (com >= minTracks faixas) sobre os hardcoded.
export interface BenchmarkRow {
  genero: string;
  total_faixas: number | null;
  avg_tempo_bpm: number | null;
  avg_danceability: number | null;
  avg_energy: number | null;
  avg_acousticness: number | null;
  avg_instrumentalness: number | null;
  avg_valence: number | null;
  avg_speechiness: number | null;
  avg_loudness_db: number | null;
}

export function mergeProfiles(
  hardcoded: Record<string, GenreFeatureProfile>,
  benchmarks: BenchmarkRow[],
  minTracks = 20,
): Record<string, GenreFeatureProfile> {
  const merged: Record<string, GenreFeatureProfile> = { ...hardcoded };
  for (const b of benchmarks) {
    if (!b.genero || (b.total_faixas ?? 0) < minTracks) continue;
    const norm = normalizeFeatures({
      tempo_bpm: b.avg_tempo_bpm,
      danceability: b.avg_danceability,
      energy: b.avg_energy,
      acousticness: b.avg_acousticness,
      instrumentalness: b.avg_instrumentalness,
      valence: b.avg_valence,
      speechiness: b.avg_speechiness,
      loudness_rms_db: b.avg_loudness_db,
    });
    if (norm) merged[b.genero] = norm;
  }
  return merged;
}
