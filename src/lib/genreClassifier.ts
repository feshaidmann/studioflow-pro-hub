// Classificador de gênero por distância Euclidiana ponderada (Mahalanobis simplificada)
// sobre features acústicas. Perfis hardcoded com cobertura BR + merge com benchmarks
// dinâmicos do catálogo (music_dna_benchmarks) quando disponíveis.
//
// Refatorado: spread real entre perfis 0.05–0.95 (antes colapsado em 0.45–0.70),
// pesos por variância inversa, score em escala 0–100 com gap interpretável.

export interface GenreFeatureProfile {
  tempo: number;          // 0-1 (tempo_bpm normalizado entre 50-200)
  danceability: number;
  energy: number;
  acousticness: number;
  instrumentalness: number;
  valence: number;
  speechiness: number;
  loudness: number;       // 0-1 (loudness dBFS normalizado entre -30..0)
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
  score: number;          // 0-1 (mantido p/ compatibilidade)
  scorePct: number;       // 0-100 (legível)
  gapPct: number;         // gap p/ runner-up em pontos percentuais
  confidence: "alta" | "média" | "baixa";
  runnerUp: { genre: string; score: number } | null;
  top3: Array<{ genre: string; score: number }>;
}

// Perfis calibrados com spread real (variância visível entre gêneros) e cobertura BR.
// Fonte: combinação de AcousticBrainz, médias do mercado BR (Spotify) e GENRE_PRESETS.
export const HARDCODED_GENRE_PROFILES: Record<string, GenreFeatureProfile> = {
  // ── Internacionais ──────────────────────────────────────────────
  // Chaves alinhadas com o tipo Genre para que classifyGenre() produza
  // os mesmos rótulos usados no upload por áudio (ReferenceTrackIngestor).
  "Pop Internacional": { tempo: 0.45, danceability: 0.72, energy: 0.68, acousticness: 0.20, instrumentalness: 0.04, valence: 0.64, speechiness: 0.08, loudness: 0.78 },
  "Rock Alternativo":  { tempo: 0.55, danceability: 0.52, energy: 0.78, acousticness: 0.12, instrumentalness: 0.08, valence: 0.52, speechiness: 0.07, loudness: 0.80 },
  "Heavy Metal":       { tempo: 0.68, danceability: 0.40, energy: 0.92, acousticness: 0.04, valence: 0.40, instrumentalness: 0.18, speechiness: 0.08, loudness: 0.88 },
  "Punk Rock":         { tempo: 0.75, danceability: 0.48, energy: 0.88, acousticness: 0.06, instrumentalness: 0.06, valence: 0.55, speechiness: 0.10, loudness: 0.85 },
  "Folk Rock":         { tempo: 0.42, danceability: 0.50, energy: 0.45, acousticness: 0.65, instrumentalness: 0.08, valence: 0.55, speechiness: 0.06, loudness: 0.55 },
  "Grunge":            { tempo: 0.52, danceability: 0.45, energy: 0.75, acousticness: 0.15, instrumentalness: 0.10, valence: 0.38, speechiness: 0.08, loudness: 0.78 },
  "Hip-Hop":           { tempo: 0.50, danceability: 0.78, energy: 0.65, acousticness: 0.18, instrumentalness: 0.05, valence: 0.50, speechiness: 0.28, loudness: 0.82 },
  "Jazz":              { tempo: 0.38, danceability: 0.45, energy: 0.35, acousticness: 0.75, instrumentalness: 0.55, valence: 0.50, speechiness: 0.05, loudness: 0.45 },
  "Synth-Pop":         { tempo: 0.50, danceability: 0.72, energy: 0.70, acousticness: 0.10, instrumentalness: 0.20, valence: 0.62, speechiness: 0.06, loudness: 0.78 },
  "Eletrônica / House":{ tempo: 0.62, danceability: 0.82, energy: 0.82, acousticness: 0.05, instrumentalness: 0.55, valence: 0.55, speechiness: 0.05, loudness: 0.82 },
  "Country":           { tempo: 0.48, danceability: 0.58, energy: 0.55, acousticness: 0.55, instrumentalness: 0.04, valence: 0.62, speechiness: 0.07, loudness: 0.62 },
  "Reggae":            { tempo: 0.42, danceability: 0.72, energy: 0.55, acousticness: 0.32, instrumentalness: 0.10, valence: 0.68, speechiness: 0.10, loudness: 0.65 },
  "Ambient":           { tempo: 0.30, danceability: 0.20, energy: 0.18, acousticness: 0.85, instrumentalness: 0.80, valence: 0.45, speechiness: 0.03, loudness: 0.30 },
  "R&B / Soul":        { tempo: 0.40, danceability: 0.66, energy: 0.57, acousticness: 0.30, instrumentalness: 0.06, valence: 0.53, speechiness: 0.09, loudness: 0.69 },
  "Funk":              { tempo: 0.52, danceability: 0.80, energy: 0.72, acousticness: 0.15, instrumentalness: 0.08, valence: 0.68, speechiness: 0.10, loudness: 0.78 },

  // ── BR ──────────────────────────────────────────────────────────
  "Indie Folk":              { tempo: 0.35, danceability: 0.42, energy: 0.35, acousticness: 0.88, instrumentalness: 0.12, valence: 0.45, speechiness: 0.06, loudness: 0.45 },
  "Pop Brasileiro":          { tempo: 0.48, danceability: 0.78, energy: 0.72, acousticness: 0.22, instrumentalness: 0.03, valence: 0.68, speechiness: 0.07, loudness: 0.82 },
  "Bossa Nova":              { tempo: 0.32, danceability: 0.52, energy: 0.28, acousticness: 0.82, instrumentalness: 0.20, valence: 0.58, speechiness: 0.06, loudness: 0.40 },
  "MPB Contemporânea":       { tempo: 0.40, danceability: 0.58, energy: 0.52, acousticness: 0.55, instrumentalness: 0.15, valence: 0.50, speechiness: 0.07, loudness: 0.58 },
  "Samba":                   { tempo: 0.55, danceability: 0.70, energy: 0.62, acousticness: 0.58, instrumentalness: 0.08, valence: 0.70, speechiness: 0.08, loudness: 0.62 },
  "Pagode":                  { tempo: 0.50, danceability: 0.73, energy: 0.64, acousticness: 0.42, instrumentalness: 0.04, valence: 0.66, speechiness: 0.08, loudness: 0.72 },
  "Sertanejo Raiz":          { tempo: 0.30, danceability: 0.45, energy: 0.42, acousticness: 0.78, instrumentalness: 0.06, valence: 0.60, speechiness: 0.06, loudness: 0.55 },
  "Sertanejo Universitário": { tempo: 0.48, danceability: 0.64, energy: 0.66, acousticness: 0.42, instrumentalness: 0.03, valence: 0.58, speechiness: 0.07, loudness: 0.78 },
  "Forró / Piseiro":         { tempo: 0.65, danceability: 0.82, energy: 0.74, acousticness: 0.28, instrumentalness: 0.04, valence: 0.70, speechiness: 0.08, loudness: 0.82 },
  "Funk Carioca":            { tempo: 0.58, danceability: 0.90, energy: 0.85, acousticness: 0.05, instrumentalness: 0.02, valence: 0.60, speechiness: 0.22, loudness: 0.88 },
  "Trap BR":                 { tempo: 0.42, danceability: 0.76, energy: 0.78, acousticness: 0.06, instrumentalness: 0.04, valence: 0.35, speechiness: 0.30, loudness: 0.86 },
  "Rap BR":                  { tempo: 0.50, danceability: 0.74, energy: 0.66, acousticness: 0.18, instrumentalness: 0.04, valence: 0.44, speechiness: 0.32, loudness: 0.78 },
  "Indie BR":                { tempo: 0.45, danceability: 0.55, energy: 0.55, acousticness: 0.38, instrumentalness: 0.18, valence: 0.48, speechiness: 0.06, loudness: 0.65 },
  "Rock Alternativo BR":     { tempo: 0.55, danceability: 0.50, energy: 0.76, acousticness: 0.14, instrumentalness: 0.12, valence: 0.45, speechiness: 0.07, loudness: 0.80 },
  "Reggae BR":               { tempo: 0.45, danceability: 0.72, energy: 0.55, acousticness: 0.38, instrumentalness: 0.06, valence: 0.68, speechiness: 0.08, loudness: 0.68 },
  "Axé / Pop Bahia":         { tempo: 0.62, danceability: 0.80, energy: 0.82, acousticness: 0.18, instrumentalness: 0.03, valence: 0.78, speechiness: 0.07, loudness: 0.82 },
  "Lo-Fi Hip Hop":           { tempo: 0.35, danceability: 0.60, energy: 0.30, acousticness: 0.72, instrumentalness: 0.78, valence: 0.40, speechiness: 0.05, loudness: 0.50 },
};

// Mapeia "loudness" para escala 0-1.
// Aceita RMS dBFS (-30..0) e LUFS integrado (-30..0). Antes usava 60dB de range
// (irreal) — agora 30dB cobre o intervalo real de produção sem saturar.
function normLoudness(db: number): number {
  return Math.max(0, Math.min(1, (db + 30) / 30));
}

// Mapeia tempo BPM para 0-1 com range 50-200 BPM (cobre Bossa lenta e Drum&Bass).
function normTempo(bpm: number): number {
  return Math.max(0, Math.min(1, (bpm - 50) / 150));
}

export function normalizeFeatures(f: RawTrackFeatures): GenreFeatureProfile | null {
  const tempo = f.tempo_bpm ?? null;
  const loud = f.loudness_rms_db ?? f.lufs_integrated ?? null;
  if (tempo == null || loud == null) return null;
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  return {
    tempo: normTempo(tempo),
    danceability: clamp(f.danceability ?? 0.5),
    energy: clamp(f.energy ?? 0.5),
    acousticness: clamp(f.acousticness ?? 0.5),
    instrumentalness: clamp(f.instrumentalness ?? 0.1),
    valence: clamp(f.valence ?? 0.5),
    speechiness: clamp(f.speechiness ?? 0.15),
    loudness: normLoudness(loud),
  };
}

const KEYS: (keyof GenreFeatureProfile)[] = [
  "tempo", "danceability", "energy", "acousticness",
  "instrumentalness", "valence", "speechiness", "loudness",
];

// Pesos derivados da variância empírica entre os perfis HARDCODED.
// Features com maior spread entre gêneros recebem MAIS peso (mais discriminantes).
// Calculados em build-time uma vez.
function computeFeatureWeights(profiles: Record<string, GenreFeatureProfile>): Record<keyof GenreFeatureProfile, number> {
  const list = Object.values(profiles);
  const weights = {} as Record<keyof GenreFeatureProfile, number>;
  for (const k of KEYS) {
    const vals = list.map(p => p[k]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
    // peso = sqrt(variância) → features que variam mais dominam
    weights[k] = Math.sqrt(Math.max(variance, 1e-4));
  }
  // Normaliza para soma = KEYS.length (mantém escala comparável)
  const sum = KEYS.reduce((a, k) => a + weights[k], 0);
  for (const k of KEYS) weights[k] = (weights[k] / sum) * KEYS.length;
  return weights;
}

let cachedWeights: Record<keyof GenreFeatureProfile, number> | null = null;
let cachedProfilesRef: Record<string, GenreFeatureProfile> | null = null;

function getWeights(profiles: Record<string, GenreFeatureProfile>): Record<keyof GenreFeatureProfile, number> {
  if (cachedWeights && cachedProfilesRef === profiles) return cachedWeights;
  cachedWeights = computeFeatureWeights(profiles);
  cachedProfilesRef = profiles;
  return cachedWeights;
}

/**
 * Distância Euclidiana ponderada → similaridade (0..1).
 * Distância máxima possível = sqrt(soma_pesos · 1²) = sqrt(KEYS.length).
 */
function weightedSimilarity(
  a: GenreFeatureProfile,
  b: GenreFeatureProfile,
  weights: Record<keyof GenreFeatureProfile, number>,
): number {
  let d2 = 0;
  for (const k of KEYS) {
    const diff = a[k] - b[k];
    d2 += weights[k] * diff * diff;
  }
  const dist = Math.sqrt(d2);
  const maxDist = Math.sqrt(KEYS.length); // pior caso
  return Math.max(0, 1 - dist / maxDist);
}

export function classifyGenre(
  rawFeatures: RawTrackFeatures,
  profiles: Record<string, GenreFeatureProfile>,
): ClassifierResult | null {
  const norm = normalizeFeatures(rawFeatures);
  if (!norm) return null;
  const weights = getWeights(profiles);

  const scored = Object.entries(profiles).map(([genre, profile]) => ({
    genre,
    score: weightedSimilarity(norm, profile, weights),
  })).sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  const top = scored[0];
  const runner = scored[1] ?? null;
  const scorePct = Math.round(top.score * 100);
  const gapPct = runner ? Math.round((top.score - runner.score) * 100) : 100;

  // Confiança baseada no gap (em pontos percentuais)
  // ≥10 pts = alta; 4–9 = média; <4 = baixa (genuinamente ambíguo)
  const confidence: "alta" | "média" | "baixa" =
    gapPct >= 10 ? "alta" : gapPct >= 4 ? "média" : "baixa";

  return {
    detected: top.genre,
    score: top.score,
    scorePct,
    gapPct,
    confidence,
    runnerUp: runner,
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
  // Invalida cache de pesos quando o conjunto muda
  cachedProfilesRef = null;
  return merged;
}
