import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackAppEvent } from "@/lib/analytics";
import { analyzeAudioFull, type AnalysisResult, type RealAudioAnalysis, type AudioSection } from "@/lib/audioAnalysis";
import { detectInstruments, type InstrumentDetection } from "@/lib/instrumentDetection";
import { lookupMusicDnaReferences, type MusicDnaLookupResult } from "@/lib/musicDnaLookup";
import { ALL_REFERENCE_ARTISTS, selectReferenceArtists } from "@/lib/musicDnaReferences";
import { KEY_NAMES } from "@/types/musicDna";
import { classifyGenre, HARDCODED_GENRE_PROFILES, mergeProfiles, type BenchmarkRow, type GenreFeatureProfile } from "@/lib/genreClassifier";

// ── Re-exports ───────────────────────────────────────────────────────────────
export type { RealAudioAnalysis, AudioSection } from "@/lib/audioAnalysis";

// ── TYPES ────────────────────────────────────────────────────────────────────

export type Genre =
  // ── BR ──────────────────────────────────────────────
  | "Indie Folk"
  | "Pop Brasileiro"
  | "Bossa Nova"
  | "MPB Contemporânea"
  | "Samba"
  | "Pagode"
  | "Sertanejo Raiz"
  | "Sertanejo Universitário"
  | "Forró / Piseiro"
  | "Funk Carioca"
  | "Trap BR"
  | "Rap BR"
  | "Indie BR"
  | "Rock Alternativo BR"
  | "Reggae BR"
  | "Axé / Pop Bahia"
  | "Lo-Fi Hip Hop"
  // ── Internacional ───────────────────────────────────
  | "Pop Internacional"
  | "Rock Alternativo"
  | "Heavy Metal"
  | "Punk Rock"
  | "Folk Rock"
  | "Grunge"
  | "Hip-Hop"
  | "Jazz"
  | "Synth-Pop"
  | "Eletrônica / House"
  | "Country"
  | "Reggae"
  | "Ambient"
  | "R&B / Soul"
  | "Funk";


export interface AudioFeatures {
  energy: number;
  danceability: number;
  acousticness: number;
  valence: number;
  instrumentalness: number;
  liveness: number;
}

export interface TrackInput {
  name: string;
  file: File;
  genre?: Genre;
  stage?: string;
  references: string[];
  projectId?: string;
}

export interface ReferenceMatch {
  artista: string;
  similaridade: string;
  motivo: string;
}

export interface NextStep {
  prioridade: "Alta" | "Média" | "Baixa";
  acao: string;
  impacto: string;
}

export interface DiagnosticoTecnico {
  lufs_avaliacao: string;
  true_peak_avaliacao: string;
  dynamic_range_avaliacao: string;
  espectro_avaliacao: string;
}

export interface AnaliseSeccoes {
  contraste_verso_refrao: string;
  secao_mais_forte: string;
  secao_mais_fraca: string;
}

export interface CatalogNeighbor {
  band: string;
  filename: string;
  genre: string;
  similarity_score: number;
  tempo_bpm: number | null;
  lufs_integrated: number | null;
  key_name: string | null;
  mode: string | null;
  energy: number | null;
  danceability: number | null;
  valence: number | null;
  acousticness: number | null;
  instrumentalness: number | null;
  dynamic_range_db: number | null;
  spectral_centroid: number | null;
}

export interface DiagnosisResult {
  genero_classificado: string;
  identidade: {
    mood_principal: string;
    territorio_sonoro: string;
    tags: string[];
    persona_ouvinte: string;
  };
  diagnostico_tecnico: DiagnosticoTecnico;
  analise_seccoes: AnaliseSeccoes;
  referencias_proximas: ReferenceMatch[];
  pontos_fortes: string[];
  gargalos_criativos: string[];
  sugestoes_arranjo: string[];
  proximos_passos: NextStep[];
  diagnostico_resumo: string;
  distance: number;
  trackFeatures: AudioFeatures;
  refFeatures: AudioFeatures;
  audioAnalysis: AnalysisResult;
  realAnalysis: RealAudioAnalysis;
  externalLookup?: MusicDnaLookupResult | null;
  detectedInstruments: string[];
  instrumentDetection: InstrumentDetection;
  catalogNeighbors?: CatalogNeighbor[];
  catalogTotalCompared?: number;
  catalogTotal?: number;
  catalogGenreCount?: number;
  strictGenreUsed?: boolean;
  classifierHint?: {
    detected: string;
    score: number;
    runnerUp: { genre: string; score: number } | null;
    top3: Array<{ genre: string; score: number }>;
  } | null;
  summaryVariant?: "A" | "B";
}

// Calibração v1: offsets empíricos para alinhar features extraídas pelo navegador
// (Web Audio API) com o pipeline Python/Librosa do catálogo.
//
// Como medir offsets reais:
//   1. Exportar 20+ faixas do catálogo (referências com features Python conhecidas).
//   2. Rodá-las por analyzeAudioFull() no browser, coletar as mesmas features.
//   3. Calcular mean(browser_value − python_value) por feature.
//   4. Chamar updateBrowserCalibration({ lufs_offset_db: média, ... }) na inicialização.
//
// Defaults conservadores (zero/um) são matematicamente neutros e não degradam
// a similaridade com o catálogo enquanto dados reais não estiverem disponíveis.
export const BROWSER_CALIBRATION: {
  lufs_offset_db: number;
  centroid_scale: number;
  rolloff_scale: number;
  flatness_offset: number;
} = {
  lufs_offset_db: 0,
  centroid_scale: 1,
  rolloff_scale: 1,
  flatness_offset: 0,
};

/** Atualiza os offsets de calibração em runtime (e.g., após carregar de Supabase). */
export function updateBrowserCalibration(updates: Partial<typeof BROWSER_CALIBRATION>): void {
  Object.assign(BROWSER_CALIBRATION, updates);
}

export function calibrateForCatalog(features: {
  lufs_integrated: number | null;
  spectral_centroid_hz: number | null;
  spectral_rolloff: number | null;
  spectral_flatness: number | null;
  spectral_bandwidth_hz: number | null;
}) {
  return {
    lufs_integrated: features.lufs_integrated == null ? null : features.lufs_integrated + BROWSER_CALIBRATION.lufs_offset_db,
    spectral_centroid_hz: features.spectral_centroid_hz == null ? null : features.spectral_centroid_hz * BROWSER_CALIBRATION.centroid_scale,
    spectral_rolloff: features.spectral_rolloff == null ? null : features.spectral_rolloff * BROWSER_CALIBRATION.rolloff_scale,
    spectral_flatness: features.spectral_flatness == null ? null : features.spectral_flatness + BROWSER_CALIBRATION.flatness_offset,
    spectral_bandwidth_hz: features.spectral_bandwidth_hz,
  };
}

// ── CONSTANTS ────────────────────────────────────────────────────────────────

export const GENRE_PRESETS: Record<Genre, AudioFeatures> = {
  "Indie Folk":        { energy: 0.35, danceability: 0.42, acousticness: 0.88, valence: 0.45, instrumentalness: 0.12, liveness: 0.18 },
  "Pop Brasileiro":    { energy: 0.72, danceability: 0.78, acousticness: 0.22, valence: 0.68, instrumentalness: 0.03, liveness: 0.14 },
  "Sertanejo Raiz":    { energy: 0.48, danceability: 0.55, acousticness: 0.75, valence: 0.62, instrumentalness: 0.06, liveness: 0.22 },
  "Sertanejo Universitário": { energy: 0.66, danceability: 0.64, acousticness: 0.46, valence: 0.58, instrumentalness: 0.03, liveness: 0.18 },
  "MPB Contemporânea": { energy: 0.52, danceability: 0.58, acousticness: 0.55, valence: 0.50, instrumentalness: 0.15, liveness: 0.16 },
  "Samba":             { energy: 0.62, danceability: 0.70, acousticness: 0.58, valence: 0.70, instrumentalness: 0.08, liveness: 0.28 },
  "Pagode":            { energy: 0.64, danceability: 0.73, acousticness: 0.42, valence: 0.66, instrumentalness: 0.04, liveness: 0.24 },
  "Funk Carioca":      { energy: 0.82, danceability: 0.88, acousticness: 0.08, valence: 0.62, instrumentalness: 0.02, liveness: 0.10 },
  "Forró / Piseiro":   { energy: 0.74, danceability: 0.82, acousticness: 0.30, valence: 0.70, instrumentalness: 0.04, liveness: 0.20 },
  "Indie BR":          { energy: 0.58, danceability: 0.56, acousticness: 0.38, valence: 0.48, instrumentalness: 0.18, liveness: 0.17 },
  "Rock Alternativo BR": { energy: 0.78, danceability: 0.52, acousticness: 0.14, valence: 0.45, instrumentalness: 0.12, liveness: 0.22 },
  "Rap BR":            { energy: 0.68, danceability: 0.74, acousticness: 0.18, valence: 0.44, instrumentalness: 0.04, liveness: 0.12 },
  "R&B / Soul":        { energy: 0.55, danceability: 0.66, acousticness: 0.26, valence: 0.48, instrumentalness: 0.06, liveness: 0.12 },
  "Reggae BR":         { energy: 0.55, danceability: 0.72, acousticness: 0.38, valence: 0.68, instrumentalness: 0.06, liveness: 0.20 },
  "Axé / Pop Bahia":   { energy: 0.82, danceability: 0.80, acousticness: 0.18, valence: 0.78, instrumentalness: 0.03, liveness: 0.28 },
  "Eletrônica / House": { energy: 0.82, danceability: 0.84, acousticness: 0.05, valence: 0.58, instrumentalness: 0.42, liveness: 0.10 },
  "Pop Internacional": { energy: 0.70, danceability: 0.74, acousticness: 0.18, valence: 0.56, instrumentalness: 0.04, liveness: 0.12 },
  "Lo-Fi Hip Hop":     { energy: 0.30, danceability: 0.60, acousticness: 0.72, valence: 0.40, instrumentalness: 0.82, liveness: 0.08 },
  "Trap BR":           { energy: 0.80, danceability: 0.76, acousticness: 0.06, valence: 0.35, instrumentalness: 0.05, liveness: 0.12 },
  "Bossa Nova":        { energy: 0.28, danceability: 0.52, acousticness: 0.82, valence: 0.58, instrumentalness: 0.20, liveness: 0.12 },
  "Rock Alternativo":  { energy: 0.78, danceability: 0.52, acousticness: 0.15, valence: 0.42, instrumentalness: 0.18, liveness: 0.25 },
  // ── Internacional (alinhados com HARDCODED_GENRE_PROFILES) ──────
  "Heavy Metal":       { energy: 0.92, danceability: 0.40, acousticness: 0.04, valence: 0.40, instrumentalness: 0.18, liveness: 0.20 },
  "Punk Rock":         { energy: 0.88, danceability: 0.48, acousticness: 0.06, valence: 0.55, instrumentalness: 0.06, liveness: 0.25 },
  "Folk Rock":         { energy: 0.45, danceability: 0.50, acousticness: 0.65, valence: 0.55, instrumentalness: 0.08, liveness: 0.18 },
  "Grunge":            { energy: 0.75, danceability: 0.45, acousticness: 0.15, valence: 0.38, instrumentalness: 0.10, liveness: 0.22 },
  "Hip-Hop":           { energy: 0.65, danceability: 0.78, acousticness: 0.18, valence: 0.50, instrumentalness: 0.05, liveness: 0.10 },
  "Jazz":              { energy: 0.35, danceability: 0.45, acousticness: 0.75, valence: 0.50, instrumentalness: 0.55, liveness: 0.28 },
  "Synth-Pop":         { energy: 0.70, danceability: 0.72, acousticness: 0.10, valence: 0.62, instrumentalness: 0.20, liveness: 0.10 },
  "Country":           { energy: 0.55, danceability: 0.58, acousticness: 0.55, valence: 0.62, instrumentalness: 0.04, liveness: 0.22 },
  "Reggae":            { energy: 0.55, danceability: 0.72, acousticness: 0.32, valence: 0.68, instrumentalness: 0.10, liveness: 0.22 },
  "Ambient":           { energy: 0.18, danceability: 0.20, acousticness: 0.85, valence: 0.45, instrumentalness: 0.80, liveness: 0.05 },
  "Funk":              { energy: 0.72, danceability: 0.80, acousticness: 0.15, valence: 0.68, instrumentalness: 0.08, liveness: 0.18 },
};

export const REFERENCE_ARTISTS: string[] = ALL_REFERENCE_ARTISTS;

export const FEATURE_KEYS: (keyof AudioFeatures)[] = [
  "energy", "danceability", "acousticness",
  "valence", "instrumentalness", "liveness",
];

export const FEATURE_LABELS: Record<keyof AudioFeatures, string> = {
  energy: "Energia",
  danceability: "Dançabilidade",
  acousticness: "Acústica",
  valence: "Valência",
  instrumentalness: "Instrumentalidade",
  liveness: "Liveness",
};

// ── UTILS ────────────────────────────────────────────────────────────────────

export function calcDistance(a: AudioFeatures, b: AudioFeatures): number {
  const sum = FEATURE_KEYS.reduce(
    (acc, k) => acc + Math.pow((a[k] ?? 0) - (b[k] ?? 0), 2),
    0
  );
  return Math.sqrt(sum / FEATURE_KEYS.length);
}

export function getAveragePreset(): AudioFeatures {
  const genres = Object.values(GENRE_PRESETS);
  const avg: AudioFeatures = { energy: 0, danceability: 0, acousticness: 0, valence: 0, instrumentalness: 0, liveness: 0 };
  for (const g of genres) {
    for (const k of FEATURE_KEYS) avg[k] += g[k];
  }
  for (const k of FEATURE_KEYS) avg[k] /= genres.length;
  return avg;
}

export function toRadarData(track: AudioFeatures, ref: AudioFeatures) {
  return FEATURE_KEYS.map((k) => ({
    subject: FEATURE_LABELS[k],
    Faixa: Math.round(track[k] * 100),
    Referência: Math.round(ref[k] * 100),
    fullMark: 100,
  }));
}

// ── PRODUCTION TIER ──────────────────────────────────────────────────────────

export type ProductionTier = "bedroom" | "mid" | "pro-leaning";

export function detectProductionTier(analysis: {
  lufs_integrated: number;
  dynamic_range_lu: number;
  true_peak_dbtp: number;
  liveness?: number | null;
  spectral_centroid_hz: number;
}): ProductionTier {
  const { lufs_integrated: lufs, dynamic_range_lu: dr, true_peak_dbtp: tp, spectral_centroid_hz: centroid } = analysis;
  const liveness = analysis.liveness ?? 0;
  if (lufs >= -10 && dr < 7) return "pro-leaning";
  if (lufs >= -11 && tp >= -2 && dr < 9 && centroid > 2000) return "pro-leaning";
  if (lufs < -18) return "bedroom";
  if (lufs < -16 && (dr > 11 || liveness > 0.3 || tp < -3)) return "bedroom";
  if (dr > 14 && centroid < 2000 && lufs < -14) return "bedroom";
  return "mid";
}

// ── PROMPT ────────────────────────────────────────────────────────────────────

function buildPrompt(
  input: TrackInput,
  analysis: RealAudioAnalysis,
  instrumentData?: InstrumentDetection,
  selectedReferences: string[] = input.references,
  externalLookup?: MusicDnaLookupResult | null
): string {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const db = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}`;
  const hz = (v: number) => `${Math.round(v)} Hz`;
  const sec = (s: number, e: number) => `${s.toFixed(0)}s–${e.toFixed(0)}s`;

  // True Peak diagnostic — alvo -1 dBTP com tolerância de ±1 dB (aceitável até 0 dBTP)
  const tpStatus = analysis.true_peak_dbtp > 0
    ? `CRÍTICO: ${db(analysis.true_peak_dbtp)} dBTP — acima de 0 dBTP (alvo −1 dBTP ± 1 dB de tolerância). Haverá clipagem pós-normalização. O Spotify aplicará ganho de ${db(-1 * (analysis.lufs_integrated + 14))} dB, levando o True Peak a ${db(analysis.true_peak_dbtp + (-1 * (analysis.lufs_integrated + 14)))} dBTP.`
    : analysis.true_peak_dbtp > -1
    ? `TOLERÂNCIA: ${db(analysis.true_peak_dbtp)} dBTP — acima do alvo (−1 dBTP) mas dentro da tolerância de ±1 dB. Seguro para a maioria dos codecs de streaming; monitore o ceiling do limiter.`
    : `OK: ${db(analysis.true_peak_dbtp)} dBTP — dentro do alvo (≤ −1 dBTP).`;

  const lufsStatus = (() => {
    const target = -14;
    const diff = analysis.lufs_integrated - target;
    if (diff > 2) return `ATENÇÃO: ${analysis.lufs_integrated} LUFS — ${diff.toFixed(1)} dB acima do target Spotify (−14 LUFS). A faixa será atenuada automaticamente.`;
    if (diff < -3) return `ATENÇÃO: ${analysis.lufs_integrated} LUFS — ${Math.abs(diff).toFixed(1)} dB abaixo do target. Faixa soará quieta em playlists.`;
    return `DENTRO DO RANGE: ${analysis.lufs_integrated} LUFS (target −14 LUFS, delta ${diff > 0 ? "+" : ""}${diff.toFixed(1)} dB).`;
  })();

  // Section analysis
  const sectionAnalysis = analysis.sections.length > 0
    ? analysis.sections.map(s => {
        const rmsNote = s.rms_dbfs > -10 ? " ⚠ pico de RMS" : "";
        return `  • ${s.label.toUpperCase()} [${sec(s.start_sec, s.end_sec)}]: ` +
          `LUFS ${s.lufs.toFixed(1)} | RMS ${s.rms_dbfs.toFixed(1)} dBFS${rmsNote} | ` +
          `Centroide ${hz(s.spectral_centroid_hz)} | ` +
          `Energia ${pct(s.energy)} | Onsets ${s.onset_density.toFixed(1)}/s`;
      }).join("\n")
    : "  (arquivo muito curto para segmentação)";

  // Verse-chorus contrast
  const verse = analysis.sections.find(s => s.label === "verse");
  const chorus = analysis.sections.find(s => s.label === "chorus");
  const contrastNote = verse && chorus
    ? `\nCONTRASTE VERSO→REFRÃO:\n` +
      `  Ganho de RMS: ${(chorus.rms_dbfs - verse.rms_dbfs).toFixed(1)} dB (ideal: 3–5 dB; ${Math.abs(chorus.rms_dbfs - verse.rms_dbfs) < 2 ? "INSUFICIENTE" : "OK"})\n` +
      `  Ganho de energia: ${pct(chorus.energy - verse.energy)} (${chorus.energy - verse.energy < 0.08 ? "INSUFICIENTE" : "OK"})\n` +
      `  Ganho espectral: +${Math.round(chorus.spectral_centroid_hz - verse.spectral_centroid_hz)} Hz no centroide`
    : "";

  // Instruments
  const instrSection = instrumentData?.instruments?.length
    ? `\nINSTRUMENTOS DETECTADOS (heurística espectral): ${instrumentData.instruments.join(", ")}`
    : "";
  const externalFeatures = externalLookup?.features ?? {};
  const keyIndex = Math.max(0, KEY_NAMES.findIndex((key) => analysis.key?.startsWith(key)));
  const mode = /minor|menor|m\b/i.test(analysis.key ?? "") ? 0 : 1;

  // Deezer BPM validation: only use it when it's close to the browser-detected BPM
  // (within 15% and within a genre-plausible range). Deezer returns the BPM of the
  // matched commercial track, which is often wrong or mismatched for Brazilian
  // independent releases — the browser BPM is the ground truth for the actual file.
  const deezerBpm = typeof externalFeatures.tempo === "number" && externalFeatures.tempo > 60 ? externalFeatures.tempo : null;
  const browserBpm = analysis.bpm;
  const useDeezerBpm = deezerBpm !== null &&
    Math.abs(deezerBpm - browserBpm) / Math.max(browserBpm, 1) < 0.15 &&
    deezerBpm >= 60 && deezerBpm <= 210;
  const resolvedBpm = useDeezerBpm ? deezerBpm : browserBpm;

  const spotifyAttrs = {
    danceability: externalFeatures.danceability ?? analysis.danceability,
    energy: externalFeatures.energy ?? analysis.energy,
    key: externalFeatures.key ?? keyIndex,
    loudness: externalFeatures.loudness ?? analysis.rms_dbfs,
    mode: externalFeatures.mode ?? mode,
    speechiness: externalFeatures.speechiness ?? analysis.speechiness,
    acousticness: externalFeatures.acousticness ?? analysis.acousticness,
    instrumentalness: externalFeatures.instrumentalness ?? analysis.instrumentalness,
    liveness: externalFeatures.liveness ?? analysis.liveness,
    valence: externalFeatures.valence ?? analysis.valence,
    tempo: resolvedBpm,
    duration_ms: externalFeatures.duration_ms ?? Math.round(analysis.duration_sec * 1000),
    time_signature: externalFeatures.time_signature ?? 4,
  };

  // Contexto de streaming por gênero — targets específicos do mercado BR
  // Fontes: Spotify Loudness Normalization docs, LUFS Meter industry reports,
  // análise empírica de catálogos por gênero no mercado fonográfico brasileiro.
  const GENRE_STREAMING_CONTEXT: Record<string, string> = {
    "Funk Carioca":           "Funk BR: loudness médio do gênero ~−9 a −11 LUFS integrado. Spotify normaliza para −14 LUFS, então faixas de Funk são atenuadas em 3-5 dB — o sub precisa estar limpo para sobreviver à normalização. Batida eletrônica densa exige atenção ao true peak (<−1 dBTP) para evitar distorção pós-codec. Transientes do tamborzão devem ter punch sem estourar o limiter.",
    "Sertanejo Universitário":"Sertanejo Universitário: loudness médio ~−10 a −12 LUFS. Produção moderna com baixo elétrico proeminente — verificar colisão sub/kick. Voz feminina/masculina dupla é padrão do gênero; separação estéreo das vozes é diferencial de produção. Streaming BR penaliza voz abafada no mix.",
    "Sertanejo Raiz":         "Sertanejo Raiz: faixas mais dinâmicas (~−13 a −16 LUFS), timbre acústico dominante. Violão e viola caipira no centroide espectral entre 1.8–2.8 kHz. Reverb de sala pequena é estética do gênero — não corrigir demais.",
    "MPB Contemporânea":      "MPB Contemporânea: loudness típico −13 a −16 LUFS. Dinâmica ampla é estética do gênero — hiperlimitar destrói identidade sonora. Voz deve ter presença sem sibilância excessiva (de-esser em 6–8 kHz). Público do Spotify BR de MPB ouve em headphone — imagem estéreo e detalhes espaciais são percebidos.",
    "Pagode":                 "Pagode: loudness médio ~−11 a −13 LUFS. Percussão acústica (pandeiro, tantã, repique) com transientes vivos é característica definidora. Cavaquinho e violão de 7 cordas competem na região 2–4 kHz com a voz — EQ cirúrgico necessário. Liveness alta (~0.24) é estética ao vivo esperada do gênero.",
    "Forró / Piseiro":        "Forró/Piseiro: loudness agressivo ~−9 a −11 LUFS. Bumbo eletrônico do piseiro exige sub limpo sem distorção. Sanfona e triângulo vivem em regiões espectrais distintas — clareza em 1–4 kHz crítica para definição da harmonia. Produção BR de piseiro tende a ser mid-heavy.",
    "Trap BR":                "Trap BR: loudness agressivo ~−8 a −10 LUFS. Sub 808 é o elemento central — deve ser tunado ao tom da faixa. Hi-hats de trap (24ths) criam densidade spectral no topo — verificar acúmulo em 8–16 kHz. Voz trap BR frequentemente processada (autotune, vocal fry, distorção leve) — verificar true peak da voz individualmente.",
    "Rap BR":                 "Rap BR: loudness médio ~−11 a −13 LUFS. Inteligibilidade vocal é tudo — voz precisa cortar o beat em 2–4 kHz sem esforço. Sample-based beats frequentemente têm artefatos de MP3 no material de origem — verificar aliasing em altas frequências.",
    "Pop Brasileiro":         "Pop BR: loudness médio ~−10 a −12 LUFS, alinhado com pop internacional. Produção competitiva com pop global no Spotify — reference tracks de mercado são internacionais (Dua Lipa, Bad Bunny). Tonal balance deve ser verificado em speakers de referência e AirPods (perfil EQ boosted em 1–4 kHz).",
    "R&B / Soul":             "R&B/Soul BR: loudness médio ~−12 a −14 LUFS. Dinâmica ampla é identidade do gênero. Graves profundos (40–80 Hz) e médios-altos suaves (2–5 kHz). Vocal run e melisma requerem compressão multi-banda cuidadosa — evitar pumping em notas longas.",
    "Indie BR":               "Indie BR: loudness variado −13 a −16 LUFS. Estética de produção DIY/bedroom aceitável e muitas vezes intencional no gênero. Ruído de fundo, tape hiss e imperfeições de timing são características, não defeitos. Não 'corrigir' o que é identidade estética do gênero.",
    "Rock Alternativo BR":    "Rock Alt BR: loudness médio ~−11 a −13 LUFS. Distorção de guitarra ocupa 500 Hz–4 kHz — verificar mascaramento da voz. Bateria acústica exige coerência de fase entre microfones close e overhead. Baixo deve ter presença em 100–250 Hz para cortar em mono (rádio FM, Bluetooth).",
    "Axé / Pop Bahia":        "Axé/Pop Bahia: loudness agressivo ~−9 a −11 LUFS para impacto ao vivo. Metais (trumpete, sax) e percussão baiana definem o centroide espectral alto (3–5 kHz). Produção de axé moderno usa sub eletrônico sob percussão acústica — garantir que coexistam sem cancelamento de fase.",
    "Eletrônica / House":     "Eletrônica/House BR: loudness de clube ~−9 a −11 LUFS. Sub kick deve estar mono e centrado abaixo de 100 Hz — verificar em mono absoluto. Sidechain de compressor no kick→synth é padrão funcional do gênero. Hi-hat e percs no topo devem ter espaço no estéreo sem fatigue em faixas de 6+ minutos.",
    "Lo-Fi Hip Hop":          "Lo-Fi Hip Hop: loudness intencional mais baixo −14 a −16 LUFS — o gênero é ouvido em contexto de estudo/trabalho, não em modo de impacto. Grain de vinil (crackle/hiss) é estética, não problema. Equalização vintage com rolloff em altas frequências (>12 kHz) é marca do gênero.",
    "Bossa Nova":             "Bossa Nova: loudness baixo −14 a −18 LUFS — dinâmica ampla é alma do gênero. Violão clássico de Bossa requer atenção à resposta de sala — small room ambience é estético. Voz deve ter presença delicada sem sibilância. Verificar que o arranjo respira — Bossa Nova não suporta compressão pesada.",
    "Reggae BR":              "Reggae BR: loudness médio −12 a −14 LUFS. Skank de guitarra no contratempo e bass roots são estrutura harmônica central — EQ em 200–400 Hz define o weight do bass roots. Dub delay no vocal é técnica estética, não erro. Verificar que o sub do baixo está limpo abaixo de 60 Hz.",
    "Indie Folk":             "Indie Folk: loudness baixo −14 a −16 LUFS. Instrumentos acústicos em espaço natural são a estética — reverb de sala grande, coerência espacial. Voz folk não deve ter compressão agressiva — o vibrato natural e as inflexões são identidade. Não 'limpar' o que é textura intencional.",
    "Samba":                  "Samba: loudness médio −12 a −14 LUFS. Percussão de samba (surdo, caixa, agogô, pandeiro) é densa espectralmente — verificar acúmulo em 800 Hz–2 kHz. Cavaquinho e violão 7 cordas precisam de espaço na região 2–4 kHz. Pandeiro deve ter presença em 5–8 kHz para brilho.",
    "Pop Internacional":      "Pop Internacional: loudness competitivo −10 a −11 LUFS, alinhado com padrão global. Referências de mercado são internacionais. Verificar LUFS em playlists do Spotify usando 'Stats for Spotify' para posicionamento competitivo. Tonal balance em Genelec ou nearfields é obrigatório.",
    "Rock Alternativo":       "Rock Alternativo (internacional): loudness médio ~−11 a −13 LUFS. Distorção de guitarra ocupa 500 Hz–4 kHz — verificar mascaramento da voz. Bateria com transientes vivos define o groove; atenção à coerência de fase entre microfones close e overhead. Produção indie/bedroom de rock alt tende a preservar mais dinâmica que o equivalente comercial — isso é uma vantagem, não um defeito. Verificar presença do baixo em mono (100–250 Hz) para Bluetooth e rádio.",
  };

  const genreStreamingNote = input.genre ? (GENRE_STREAMING_CONTEXT[input.genre] || "") : "";

  const productionTier = detectProductionTier(analysis);

  const tierBlock = (() => {
    if (productionTier === "bedroom") {
      return `NIVEL_DE_PRODUCAO_DETECTADO: bedroom (home studio básico — gravação caseira sem master comercial)
→ Toda recomendação DEVE ser executável em casa com plugins gratuitos ou recursos nativos da DAW. PROIBIDO sugerir "mande para mastering profissional", "alugue estúdio", "contrate engenheiro", "use Pro Tools", monitores caros ou plugins pagos como solução obrigatória. Plugins gratuitos válidos: TDR Nova, Youlean Loudness Meter 2 free, ReaPlugs, Voxengo SPAN, LoudMax, Vital, MeldaProduction free bundle. DAWs válidas: Reaper, Cakewalk, GarageBand, BandLab, Audacity.`;
    }
    if (productionTier === "pro-leaning") {
      return `NIVEL_DE_PRODUCAO_DETECTADO: pro-leaning (master comercial competitivo)
→ Pode sugerir refinos de mastering profissional quando o gargalo realmente exigir, mas SEMPRE oferecer também a alternativa DIY com plugin gratuito equivalente.`;
    }
    return `NIVEL_DE_PRODUCAO_DETECTADO: mid (home studio intermediário)
→ Misturar sugestões DIY (plugins gratuitos: TDR Nova, Youlean free, Voxengo SPAN, ReaPlugs, LoudMax) com alternativas pagas opcionais. Nunca tratar mastering profissional como única saída.`;
  })();

  // Seção de análise só inclui contraste verso/refrão se os dados existem de fato
  const hasVerseChorus = !!(verse && chorus);

  return `
Você é um PARCEIRO DE CARREIRA do artista independente brasileiro — produtor experiente que entende a realidade de quem grava em casa, lança por DistroKid/Onerpm/Tratore/Amuse, faz a própria divulgação e toca em formato enxuto (voz+violão, trio, base + Ableton).
Seu papel NÃO é o de um engenheiro de major label cobrando padrão comercial: é o de um aliado que traduz o que os dados dizem em ações concretas, gratuitas e acionáveis nesta semana.

Analise os dados técnicos REAIS abaixo e gere um diagnóstico específico e acionável.
Cada afirmação DEVE ser ancorada em pelo menos um valor medido. Proibido julgamentos vagos ou genéricos.

════════════════════════════════════════════════
CONTEXTO DO MERCADO INDEPENDENTE BRASILEIRO
════════════════════════════════════════════════
O artista independente brasileiro lança sem gravadora, sem orçamento de mastering profissional e sem equipe. O Spotify normaliza tudo para −14 LUFS — competir loudness com major label é luta perdida e desnecessária. O que vence playlist editorial e algorítmica indie é CLAREZA, IDENTIDADE e CONSISTÊNCIA, não loudness máximo.
A janela de 24-72h pós-lançamento é crítica para o peso algorítmico (Release Radar, Radar de Lançamentos). Canvas vertical, pitch para playlists editoriais via Spotify for Artists e save na pré-save são as alavancas reais que o indie controla.
Para palco, a faixa precisa ter um arranjo "traduzível" em setup reduzido — o que cabe num trio sem perder a essência ganha de quem depende de banda inteira.
${genreStreamingNote ? `\nEspecificidades técnicas do gênero detectado (com lente indie — atingir target do gênero importa MENOS que entregar som limpo e coerente, porque o Spotify normaliza tudo):\n${genreStreamingNote}` : ""}

${tierBlock}

════════════════════════════════════════════════
REGRAS DE LINGUAGEM
════════════════════════════════════════════════
- Campos técnicos (diagnostico_tecnico.*): linguagem de engenheiro com valores reais (LUFS, dBTP, Hz, dB, LU) — este é o ÚNICO bloco onde siglas técnicas são permitidas. Cada recomendação precisa terminar com UMA frase "como fazer" citando plugin GRATUITO (TDR Nova, Youlean Loudness Meter 2 free, ReaPlugs, Voxengo SPAN, LoudMax, Vital, MeldaProduction free) ou recurso nativo da DAW (Reaper, Cakewalk, GarageBand, BandLab, Audacity).
- Campos pontos_fortes, gargalos_criativos, sugestoes_arranjo, proximos_passos: PROIBIDO usar siglas (LUFS, dBTP, dBFS, LU, kHz, Hz) e PROIBIDO citar valores numéricos medidos. Traduza para frases que o artista entende: "deixar a voz mais à frente sem precisar gritar no microfone", "abrir espaço entre o grave do bumbo e do baixo", "tirar o chiado das sibilantes da voz", "fazer o refrão soar mais alto que o verso na mesma proporção que os hits do estilo".
- Reconheça o que funciona ANTES de sugerir ajuste. Tom de parceiro: "vale a pena explorar", "uma aposta que costuma render é", "se for possível, dá pra testar". Nunca "urgente", "crítico", "imediato", "obrigatório".
- PROIBIDO recomendar mastering profissional, estúdio alugado, engenheiro contratado, plugins pagos como ÚNICA solução — sempre dar alternativa gratuita. Exceção: nivel pro-leaning E gargalo genuinamente fora do alcance DIY.

════════════════════════════════════════════════
DADOS DA FAIXA
════════════════════════════════════════════════
Nome:    "${input.name}"
Gênero:  ${input.genre || "não especificado"}
BPM:     ${analysis.bpm.toFixed(1)}
Tom:     ${analysis.key}
Duração: ${Math.floor(analysis.duration_sec / 60)}:${String(Math.round(analysis.duration_sec % 60)).padStart(2, "0")}
Referências do artista: ${input.references.length ? input.references.join(", ") : "nenhuma fornecida"}
Vocabulário semântico de artistas do mesmo território (apenas referência de LINGUAGEM/curadoria, NÃO comparação acústica — comparação técnica real vem somente do bloco "VIZINHOS MAIS PRÓXIMOS NO CATÁLOGO REAL"): ${selectedReferences.length ? selectedReferences.join(", ") : "nenhum"}
Notas do artista: (não fornecidas)

════════════════════════════════════════════════
ANÁLISE TÉCNICA — NÍVEL GLOBAL
════════════════════════════════════════════════
LUFS INTEGRADO:    ${lufsStatus}
LUFS SHORT-TERM:   ${analysis.lufs_short_term} LUFS (pico de loudness momentâneo)
TRUE PEAK:         ${tpStatus}
DYNAMIC RANGE:     ${analysis.dynamic_range_lu.toFixed(1)} LU (DR < 7 = hiperlimitado; 7–12 = range comercial; > 12 = alta dinâmica)
RMS GLOBAL:        ${analysis.rms_dbfs.toFixed(1)} dBFS
CENTROIDE ESPECT.: ${hz(analysis.spectral_centroid_hz)} (ref. típico do gênero: consultar benchmark)
SPECTRAL ROLLOFF:  ${hz(analysis.spectral_rolloff_hz)} (85% da energia espectral abaixo desta frequência)
SPECTRAL FLATNESS: ${analysis.spectral_flatness.toFixed(3)} (0 = sinal tonal puro; 1 = ruído branco)

ATRIBUTOS PERCEPTUAIS (estimativas heurísticas espectrais — NÃO calibradas com modelo treinado; usar como tendência qualitativa, não como medição exata):
  Energia:           ${pct(analysis.energy)} — derivado de RMS + sub-band + centroid
  Dançabilidade:     ${pct(analysis.danceability)} — kernel BPM + sub-band + onsets
  Acústica:          ${pct(analysis.acousticness)} — ausência de sub eletrônico + flatness
  Valência:          ${pct(analysis.valence)} — modo maior/menor + brilho espectral
  Instrumentalidade: ${pct(analysis.instrumentalness)} — ausência de banda vocal
  Liveness:          ${pct(analysis.liveness)} — variação RMS entre seções
  Speechiness:       ${pct(analysis.speechiness)} — banda vocal 300–3400 Hz + ZCR

ATRIBUTOS ESTILO SPOTIFY — FONTE CONSOLIDADA:
${JSON.stringify(spotifyAttrs, null, 2)}
Fonte externa complementar: ${externalLookup?.fonte ?? "web_audio"}

════════════════════════════════════════════════
ANÁLISE POR SEÇÃO
════════════════════════════════════════════════
${sectionAnalysis}
${hasVerseChorus ? contrastNote : "(segmentação verso/refrão não identificada — pular campo analise_seccoes.contraste_verso_refrao)"}
${instrSection}

════════════════════════════════════════════════
FORMATO DE RESPOSTA
════════════════════════════════════════════════
Responda SOMENTE com JSON válido, sem markdown, sem texto externo ao JSON.
Nenhum campo deve conter instruções, meta-texto ou placeholders — apenas conteúdo real do diagnóstico.

Instruções por campo:
- "genero_classificado": gênero principal identificado pelos dados, com sub-gênero quando aplicável.
- "identidade.mood_principal": adjetivo composto que capture valência + energia (ex: "melancólico-contemplativo", "exuberante-dançante").
- "identidade.territorio_sonoro": contexto de escuta real no Brasil ("headphone em trânsito urbano", "festa em casa com caixa bluetooth", "carro em rodovia no interior").
- "identidade.tags": 5-8 palavras que um curador de playlist usaria. Sem termos de engenharia.
- "identidade.persona_ouvinte": perfil do ouvinte indie típico — faixa etária, contexto de vida, plataforma preferida, outros artistas que escuta.
- "diagnostico_tecnico.*": ÚNICO campo onde siglas técnicas (LUFS, dBTP, Hz, dB) são permitidas. Cada item DEVE terminar com uma frase "como fazer" usando plugin GRATUITO ou recurso nativo da DAW (ex: "abaixe o low-shelf abaixo de 80 Hz em −2 dB com o TDR Nova free para limpar acúmulo grave"). Mencione impacto em streaming quando relevante, sem exigir master pago.
- "analise_seccoes.contraste_verso_refrao": preencher apenas se verso e refrão foram identificados. Caso contrário: "segmentação não identificada nos dados analisados".
- "referencias_proximas": EXCLUSIVAMENTE vizinhos reais do bloco "VIZINHOS MAIS PRÓXIMOS NO CATÁLOGO REAL", citando band + filename reais. ORDENE por similarity_score decrescente. CITE SOMENTE vizinhos com similarity_score >= 0.70. Se nenhum atingir 0.70, devolva []. JAMAIS invente, JAMAIS use o vocabulário semântico de artistas, JAMAIS ordene alfabeticamente. No "motivo": (1) explique a similaridade em linguagem acessível (clima, peso, brilho, andamento) — pode citar BPM em palavras ("andamento parecido"); (2) sinalize o patamar usando o tier_hint do vizinho ("indie/medio" = par real no mesmo patamar; "mainstream" = referência aspiracional, deixar isso claro para o artista não se cobrar padrão de major). Máximo 3.
- "pontos_fortes": 3-5 itens em linguagem acessível, SEM siglas técnicas e SEM valores numéricos. Foque no que o artista pode usar para vender a faixa (clareza vocal, identidade do arranjo, mood que cabe em playlist específica, personalidade indie como força quando for o caso).
- "gargalos_criativos": 2-4 itens. Linguagem acessível, SEM siglas, SEM números. Algo que o artista entende: "a voz some um pouco no refrão", "o grave fica abafado em fone de celular", "o refrão não cresce em relação ao verso".
- "sugestoes_arranjo": 2-4 ideias em linguagem de músico (não de engenheiro). Pelo menos 1 deve ser executável SEM regravar nada (automação, EQ, mute estratégico).
- "proximos_passos": 4-6 ações, ordenadas pelo retorno mais rápido para o artista independente (NÃO pelo padrão de major label). Cada "acao" em linguagem acessível, PROIBIDO usar siglas técnicas (LUFS, dBTP, dBFS, kHz). O campo "impacto" DEVE começar com UMA tag entre colchetes indicando o pilar — cobrir pelo menos 3 dos 4 pilares quando fizer sentido:
    • [Mix/Master DIY] — ajuste sonoro executável em casa com plugin gratuito ou recurso nativo da DAW.
    • [Distribuição] — timing de lançamento, pitch via Spotify for Artists, Canvas vertical, pré-save, Release Radar — assumindo distribuidor self-service (DistroKid, Onerpm, Tratore, Amuse).
    • [Identidade e posicionamento] — em quais nichos de playlist e estratégia de público inicial esse som conversa; como descrever a faixa em release/pitch.
    • [Ao vivo] — como traduzir a faixa para palco com setup enxuto (voz+violão, trio, base + Ableton/Maschine).
  Prioridade Alta = passo que o artista consegue fazer nos próximos 7 dias sem comprar nada. Média = exige mais tempo ou ferramenta extra gratuita. Baixa = refinamento opcional.
- "diagnostico_resumo": 4-6 frases em linguagem acessível, SEM siglas técnicas, SEM valores numéricos, SEM nome de plugin. Cubra: (1) identidade sonora por sensação (peso, brilho, espaço, intimidade); (2) instrumentos protagonistas e papel do vocal; (3) onde essa identidade encaixa no streaming indie BR (tipos de playlist editorial/algorítmica/mood que fazem sentido); (4) ÚLTIMA FRASE OBRIGATÓRIA — um único passo de maior impacto que o artista consegue executar SOZINHO nos próximos 7 dias, SEM comprar nada (ex: "Nesta semana, focaria em regravar o vocal do refrão um tom acima e abrir o pitch para playlists editoriais de indie folk no Spotify for Artists antes do lançamento."). Tom de parceiro, sem promessas de sucesso, sem alarmismo.

{
  "genero_classificado": "",
  "identidade": {
    "mood_principal": "",
    "territorio_sonoro": "",
    "tags": [],
    "persona_ouvinte": ""
  },
  "diagnostico_tecnico": {
    "lufs_avaliacao": "",
    "true_peak_avaliacao": "",
    "dynamic_range_avaliacao": "",
    "espectro_avaliacao": ""
  },
  "analise_seccoes": {
    "contraste_verso_refrao": "",
    "secao_mais_forte": "",
    "secao_mais_fraca": ""
  },
  "referencias_proximas": [
    { "artista": "", "similaridade": "", "motivo": "" }
  ],
  "pontos_fortes": [],
  "gargalos_criativos": [],
  "sugestoes_arranjo": [],
  "proximos_passos": [
    { "prioridade": "Alta", "acao": "", "impacto": "" }
  ],
  "diagnostico_resumo": ""
}`.trim();
}

async function callMusicDNAAnalyze(
  prompt: string,
  payload: Record<string, unknown> = {},
): Promise<{
  content: string;
  neighbors: CatalogNeighbor[];
  catalogTotalCompared: number;
  catalogTotal: number;
  catalogGenreCount: number;
  strictGenreUsed: boolean;
  summaryVariant: "A" | "B";
}> {
  const { data, error } = await supabase.functions.invoke("music-dna-analyze", {
    body: { action: "generate_diagnosis", payload: { prompt, ...payload } },
  });

  if (error) throw new Error(error.message);
  const d = data as {
    content?: string;
    neighbors?: CatalogNeighbor[];
    catalog_total_compared?: number;
    catalog_total?: number;
    catalog_genre_count?: number;
    strict_genre_used?: boolean;
    summary_variant?: string;
  } | null;
  return {
    content: d?.content ?? "",
    neighbors: d?.neighbors ?? [],
    catalogTotalCompared: d?.catalog_total_compared ?? 0,
    catalogTotal: d?.catalog_total ?? 0,
    catalogGenreCount: d?.catalog_genre_count ?? 0,
    strictGenreUsed: d?.strict_genre_used ?? false,
    summaryVariant: (d?.summary_variant === "B" ? "B" : "A"),
  };
}

export function filterValidReferences(
  rawRefs: ReferenceMatch[],
  neighbors: CatalogNeighbor[],
  floor = 0.7,
): ReferenceMatch[] {
  const validBands = new Set<string>(
    neighbors
      .filter((n) => typeof n.similarity_score === "number" && n.similarity_score >= floor)
      .map((n) => (n.band ?? "").toLowerCase().trim())
      .filter((s) => s.length > 0),
  );
  return rawRefs.filter((r) => {
    const name = (r.artista ?? "").toLowerCase().trim();
    return name.length > 0 && validBands.has(name);
  });
}

export function repairJsonString(raw: string): string {
  // Split on already-quoted string literals so the key-quoting regex never
  // touches content inside string values (e.g. "tempo: parecido, label: x").
  const strLiteral = /"(?:[^"\\]|\\.)*"/g;
  const strings = raw.match(strLiteral) ?? [];
  const parts = raw.split(strLiteral);
  const fixedParts = parts.map((part) =>
    part
      .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g, '$1"$2"$3')
      .replace(/,(\s*[}\]])/g, "$1"),
  );
  let result = "";
  for (let i = 0; i < fixedParts.length; i++) {
    result += fixedParts[i];
    if (i < strings.length) result += strings[i];
  }
  return result;
}

// ── HOOK ─────────────────────────────────────────────────────────────────────

type AnalysisStep = "idle" | "extracting" | "profiling" | "computing" | "generating" | "done";

interface UseMusicDNAReturn {
  step: AnalysisStep;
  progress: number;
  logs: string[];
  result: DiagnosisResult | null;
  isPending: boolean;
  error: Error | null;
  analyze: (input: TrackInput) => void;
  reset: () => void;
}

export function useMusicDNA(): UseMusicDNAReturn {
  const [step, setStep] = useState<AnalysisStep>("idle");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  const appendLog = (msg: string) => setLogs((prev) => [...prev, msg]);

  const { mutate, isPending, error, reset: resetMutation } = useMutation({
    mutationFn: async (input: TrackInput): Promise<DiagnosisResult> => {
      // Step 1 — Audio analysis
      setStep("extracting");
      setProgress(15);
      appendLog("🎵  Lendo o áudio real da faixa…");

      const [fullAnalysis, instrumentResult, externalLookup] = await Promise.all([
        analyzeAudioFull(input.file),
        detectInstruments(input.file),
        lookupMusicDnaReferences(input.name),
      ]);

      const { legacy: audioAnalysis, real: realAnalysis } = fullAnalysis;
      const detectedInstruments = instrumentResult.instruments;

      setProgress(35);
      appendLog("📊  Analisando arquivo local via Web Audio API…");
      appendLog("🌐  Buscando BPM via Deezer…");
      appendLog(externalLookup ? `🌐  Fonte complementar encontrada: ${externalLookup.fonte}` : "🌐  Sem referência externa confiável; mantendo análise local como base.");

      // Step 2 — Features from real analysis
      setStep("profiling");
      setProgress(45);
      appendLog("🔍  Consolidando atributos estilo Spotify…");
      appendLog(`📐  Mapeando ${realAnalysis.sections.length} seções e o perfil acústico da faixa…`);

      const rFeatures = input.genre ? GENRE_PRESETS[input.genre] : getAveragePreset();
      const tFeatures: AudioFeatures = {
        energy: realAnalysis.energy,
        danceability: realAnalysis.danceability,
        acousticness: realAnalysis.acousticness,
        valence: realAnalysis.valence,
        instrumentalness: realAnalysis.instrumentalness,
        liveness: realAnalysis.liveness,
      };

      // Step 3 — Distance
      setStep("computing");
      const distance = calcDistance(tFeatures, rFeatures);
      setProgress(58);
      appendLog("🧭  Calculando proximidade estética e técnica…");

      // Step 4 — AI
      setStep("generating");
      setProgress(70);
      appendLog("🤖  Gerando diagnóstico IA com atributos consolidados…");

      const selectedReferences = selectReferenceArtists(tFeatures, input.genre, input.references, 18);
      appendLog("🎧  Selecionando referências artísticas próximas…");

      const prompt = buildPrompt(input, realAnalysis, instrumentResult, selectedReferences, externalLookup);

      const calibrated = calibrateForCatalog({
        lufs_integrated: realAnalysis.lufs_integrated,
        spectral_centroid_hz: realAnalysis.spectral_centroid_hz,
        spectral_rolloff: realAnalysis.spectral_rolloff_hz,
        spectral_flatness: realAnalysis.spectral_flatness,
        spectral_bandwidth_hz: realAnalysis.spectral_bandwidth_hz,
      });

      // Classificação independente por features (cosine similarity sobre perfis hardcoded + benchmarks BR)
      let classifierProfiles: Record<string, GenreFeatureProfile> = HARDCODED_GENRE_PROFILES;
      try {
        const { data: bm } = await supabase
          .from("music_dna_benchmarks")
          .select("genero,total_faixas,avg_tempo_bpm,avg_danceability,avg_energy,avg_acousticness,avg_instrumentalness,avg_valence,avg_speechiness,avg_loudness_db")
          .gte("total_faixas", 5);
        classifierProfiles = mergeProfiles(HARDCODED_GENRE_PROFILES, (bm ?? []) as BenchmarkRow[]);
      } catch (e) {
        console.warn("[music-dna] benchmarks fetch falhou; classificador usa só perfis hardcoded", e);
      }
      const classifierHint = classifyGenre({
        tempo_bpm: realAnalysis.bpm,
        danceability: realAnalysis.danceability,
        energy: realAnalysis.energy,
        acousticness: realAnalysis.acousticness,
        instrumentalness: realAnalysis.instrumentalness,
        valence: realAnalysis.valence,
        speechiness: realAnalysis.speechiness,
        loudness_rms_db: realAnalysis.lufs_integrated,
      }, classifierProfiles);

      const {
        content: rawText,
        neighbors: catalogNeighbors,
        catalogTotalCompared,
        catalogTotal,
        catalogGenreCount,
        strictGenreUsed,
        summaryVariant,
      } = await callMusicDNAAnalyze(prompt, {
        features: externalLookup?.features,
        genero: input.genre,
        track_name: input.name,
        stage: input.stage ?? "master",
        classifier_hint: classifierHint,
        track_features: {
          // ── Acoustic fingerprint — primary similarity signal ──────────────
          mfcc: realAnalysis.mfcc,
          chroma_cens: realAnalysis.chroma_cens,
          zero_crossing_rate: realAnalysis.zero_crossing_rate,
          // ── Reliable scalar features (high weight in SQL) ─────────────────
          tempo_bpm: realAnalysis.bpm,
          lufs_integrated: calibrated.lufs_integrated,
          // dynamic_range_db omitido: escala do browser (LU percentil p95/p10, ~2–14 LU)
          // não é compatível com o catálogo (crest factor peak-RMS, ~8–30 dB).
          // Passar NULL evita ruído na distância de similaridade.
          spectral_centroid_hz: calibrated.spectral_centroid_hz,
          spectral_rolloff: calibrated.spectral_rolloff,
          spectral_flatness: calibrated.spectral_flatness,
          spectral_bandwidth_hz: calibrated.spectral_bandwidth_hz,
          // ── Unreliable Spotify-style features (low weight in SQL) ─────────
          energy: realAnalysis.energy,
          danceability: realAnalysis.danceability,
          valence: realAnalysis.valence,
          acousticness: realAnalysis.acousticness,
          instrumentalness: realAnalysis.instrumentalness,
          speechiness: realAnalysis.speechiness,
          liveness: realAnalysis.liveness,
          // ── Metadata ──────────────────────────────────────────────────────
          key_name: (realAnalysis.key ?? "").replace(/m$/, "") || null,
          mode: /m$/.test(realAnalysis.key ?? "") ? "minor" : "major",
        },
      });
      const clean = rawText.replace(/```json\n?|```/g, "").trim();
      let parsed: Partial<DiagnosisResult>;
      try {
        parsed = JSON.parse(clean) as Partial<DiagnosisResult>;
      } catch {
        parsed = JSON.parse(repairJsonString(clean)) as Partial<DiagnosisResult>;
      }

      const rawReferences: ReferenceMatch[] = Array.isArray(parsed.referencias_proximas) ? parsed.referencias_proximas : [];
      const validatedReferences = filterValidReferences(rawReferences, catalogNeighbors);
      if (rawReferences.length !== validatedReferences.length) {
        const dropped = rawReferences.filter((r) => !validatedReferences.includes(r));
        console.warn("[music-dna] referências IA descartadas (fora dos vizinhos reais com score >= 0.70):", dropped.map((r) => r.artista));
      }
      parsed.referencias_proximas = validatedReferences;

      setProgress(100);
      setStep("done");
      appendLog(catalogNeighbors.length ? `🎯  ${catalogNeighbors.length} faixas próximas encontradas no catálogo.` : "✅  Diagnóstico concluído.");

      return {
        ...(parsed as DiagnosisResult),
        distance,
        trackFeatures: tFeatures,
        refFeatures: rFeatures,
        audioAnalysis,
        realAnalysis,
        externalLookup,
        detectedInstruments,
        instrumentDetection: instrumentResult,
        catalogNeighbors,
        catalogTotalCompared,
        catalogTotal,
        catalogGenreCount,
        strictGenreUsed,
        classifierHint,
        summaryVariant,
      };
    },

    onSuccess: (data) => {
      setResult(data);
      trackAppEvent("audio_analyzed", {
        genre: null,
        bpm: data.realAnalysis?.bpm ?? null,
        lufs: data.realAnalysis?.lufs_integrated ?? null,
        source: data.externalLookup?.fonte ?? "local",
        instruments_count: data.detectedInstruments?.length ?? 0,
      });
      toast.success("Diagnóstico gerado com sucesso");
    },

    onError: (err: Error) => {
      setStep("idle");
      setProgress(0);
      toast.error(`Erro ao gerar diagnóstico: ${err.message}`);
    },
  });

  const reset = () => {
    setStep("idle");
    setProgress(0);
    setLogs([]);
    setResult(null);
    resetMutation();
  };

  return {
    step,
    progress,
    logs,
    result,
    isPending,
    error,
    analyze: (input) => {
      setLogs([]);
      setProgress(0);
      setResult(null);
      mutate(input);
    },
    reset,
  };
}
