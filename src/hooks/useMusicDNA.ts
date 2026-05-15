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
  | "Indie Folk"
  | "Pop Brasileiro"
  | "Sertanejo Raiz"
  | "Sertanejo Universitário"
  | "MPB Contemporânea"
  | "Samba"
  | "Pagode"
  | "Funk Carioca"
  | "Forró / Piseiro"
  | "Indie BR"
  | "Rock Alternativo BR"
  | "Rap BR"
  | "R&B / Soul"
  | "Reggae BR"
  | "Axé / Pop Bahia"
  | "Eletrônica / House"
  | "Pop Internacional"
  | "Lo-Fi Hip Hop"
  | "Trap BR"
  | "Bossa Nova"
  | "Rock Alternativo";


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
  notes?: string;
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
  dims_used?: number | null;
  dims_total?: number | null;
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
}

// Calibração v1: offsets empíricos para alinhar features extraídas pelo navegador
// (Web Audio API) com o pipeline Python/Librosa do catálogo. Stub conservador.
// Atualizar conforme dados de calibração reais forem coletados.
export const BROWSER_CALIBRATION = {
  lufs_offset_db: 0,
  centroid_scale: 1,
  rolloff_scale: 1,
  flatness_offset: 0,
} as const;

function calibrateForCatalog(features: {
  lufs_integrated: number | null;
  spectral_centroid_hz: number | null;
  spectral_rolloff: number | null;
  spectral_flatness: number | null;
}) {
  return {
    lufs_integrated: features.lufs_integrated == null ? null : features.lufs_integrated + BROWSER_CALIBRATION.lufs_offset_db,
    spectral_centroid_hz: features.spectral_centroid_hz == null ? null : features.spectral_centroid_hz * BROWSER_CALIBRATION.centroid_scale,
    spectral_rolloff: features.spectral_rolloff == null ? null : features.spectral_rolloff * BROWSER_CALIBRATION.rolloff_scale,
    spectral_flatness: features.spectral_flatness == null ? null : features.spectral_flatness + BROWSER_CALIBRATION.flatness_offset,
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
    tempo: externalFeatures.tempo ?? analysis.bpm,
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
  };

  const genreStreamingNote = input.genre ? (GENRE_STREAMING_CONTEXT[input.genre] || "") : "";

  // Seção de análise só inclui contraste verso/refrão se os dados existem de fato
  const hasVerseChorus = !!(verse && chorus);

  return `
Você é um produtor musical sênior e engenheiro de áudio com expertise no mercado fonográfico brasileiro independente.
Seu papel é o de um parceiro técnico que conhece profundamente as especificidades do streaming BR, os padrões de produção por gênero e as expectativas do público de cada segmento.

Analise os dados técnicos REAIS abaixo e gere um diagnóstico musical completo, específico e acionável.
Cada afirmação DEVE ser ancorada em pelo menos um valor medido. Proibido julgamentos vagos ou genéricos.

════════════════════════════════════════════════
CONTEXTO DO MERCADO FONOGRÁFICO BRASILEIRO
════════════════════════════════════════════════
O Brasil é o 9º mercado global de streaming (IFPI 2024). Spotify, YouTube Music e Deezer são os canais primários de consumo.
O Spotify aplica normalização de loudness para −14 LUFS integrado — faixas acima desse target são atenuadas; abaixo, soam quietas em playlists.
A janela de 24-72h pós-lançamento é crítica: streams e saves nessa janela determinam o peso algorítmico da faixa nas semanas seguintes (Radar de Lançamentos, Release Radar, algorithmic playlists).
A qualidade técnica impacta diretamente o placement em playlists editoriais — curadoria humana da Spotify BR avalia qualidade de produção como critério de seleção.
${genreStreamingNote ? `\nEspecificidades técnicas do gênero detectado:\n${genreStreamingNote}` : ""}

════════════════════════════════════════════════
REGRAS DE LINGUAGEM
════════════════════════════════════════════════
- Todos os campos técnicos: linguagem de engenheiro de mix/master falando com outro profissional. Cite valores reais (LUFS, dBTP, Hz, dB, LU). Sugestões com técnica específica + plugin/ferramenta + configuração + resultado mensurável.
- Reconheça o que funciona tecnicamente antes de sugerir ajustes — o diagnóstico deve equilibrar pontos fortes reais com áreas de melhoria.
- EXCEÇÃO — campo "diagnostico_resumo": tom de crítico musical experiente e acolhedor, em linguagem 100% acessível para o artista. PROIBIDO citar LUFS, dBTP, LU, dBFS, Hz, dB, valores numéricos medidos, nomes de plugins ou jargão de engenharia. Descreva a faixa por SENSAÇÃO sonora (peso grave, brilho, espaço, ar, intimidade, abertura) e por INSTRUMENTOS PROTAGONISTAS (quem conduz, quem sustenta, papel do vocal). Conecte essa identidade ao perfil sonoro que costuma se destacar em playlists do Spotify (editoriais de gênero, mood, algorítmicas como Radar de Lançamentos e Release Radar): energia adequada ao contexto de escuta, contraste entre seções, clareza vocal, tradução em diferentes sistemas. Ex: "o violão conduz a narrativa com um corpo quente e o vocal vem à frente, íntimo, deixando a faixa pronta para playlists de MPB contemporânea de escuta atenta — ganharia ainda mais tração em playlists de foco se o refrão abrisse com um pouco mais de presença."
- Enquadre sugestões como recomendações de parceiro técnico: "vale muito a pena explorar", "seria interessante considerar", "a aposta técnica aqui seria". Nunca use "urgente", "crítico" ou "imediato".
- Quando mencionar plugins, priorize opções disponíveis no ecossistema BR independente: Waves, FabFilter, Izotope Ozone, Voxengo SPAN, DMGAudio — além de alternativas gratuitas quando existirem (TDR Nova, Youlean Loudness Meter).

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
Notas do artista: ${input.notes || "não fornecidas"}

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

ATRIBUTOS MEDIDOS (escala 0–100%):
  Energia:           ${pct(analysis.energy)} — intensidade percebida / nível de ativação
  Dançabilidade:     ${pct(analysis.danceability)} — adequação rítmica para dança
  Acústica:          ${pct(analysis.acousticness)} — presença de timbre acústico vs eletrônico
  Valência:          ${pct(analysis.valence)} — positividade / valência emocional
  Instrumentalidade: ${pct(analysis.instrumentalness)} — proporção instrumental vs vocal
  Liveness:          ${pct(analysis.liveness)} — presença de audiência / caráter ao vivo
  Speechiness:       ${pct(analysis.speechiness)} — densidade de fala / spoken word

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
- "identidade.mood_principal": adjetivo composto que capture a valência emocional + energia da faixa (ex: "melancólico-contemplativo", "exuberante-dançante", "tenso-introspectivo").
- "identidade.territorio_sonoro": onde e como esta música é ouvida — contexto de escuta real no mercado BR (ex: "headphone em trânsito urbano", "carro em rodovia no interior", "festa em casa com caixa bluetooth", "academia").
- "identidade.tags": 5-8 palavras que um curador de playlist usaria para categorizar esta faixa — gênero, sub-gênero, mood, contexto, instrumentação característica. Sem termos de engenharia.
- "identidade.persona_ouvinte": perfil do ouvinte típico no mercado BR — faixa etária, contexto de vida, plataforma preferida de consumo, outros artistas que esse ouvinte consome.
- "diagnostico_tecnico.*": avaliação técnica com valores medidos + recomendação prática com plugin/técnica/configuração específica. Mencionar impacto no posicionamento em streaming quando relevante.
- "analise_seccoes.contraste_verso_refrao": preencher apenas se verso e refrão foram identificados. Caso contrário: "segmentação não identificada nos dados analisados".
- "referencias_proximas": usar EXCLUSIVAMENTE os vizinhos reais do catálogo fornecidos no bloco "VIZINHOS MAIS PRÓXIMOS NO CATÁLOGO REAL", citando `band` + `filename` reais. ORDENE por `similarity_score` decrescente. CITE SOMENTE vizinhos com `similarity_score >= 0.70`. Se nenhum vizinho atingir 0.70, devolva `referencias_proximas: []` — JAMAIS invente, JAMAIS use a lista de vocabulário semântico de artistas, JAMAIS ordene alfabeticamente. Explique a similaridade em termos técnicos mensuráveis (BPM, LUFS, energia, centroide espectral). Máximo 3 referências.
- "pontos_fortes": aspectos técnicos que já funcionam bem e são competitivos no gênero — ancorados em valores medidos.
- "gargalos_criativos": aspectos que limitam o potencial de performance em streaming ou playlists — específicos, mensuráveis, acionáveis.
- "sugestoes_arranjo": sugestões de produção/arranjo com técnica específica, não generalidades.
- "proximos_passos": ordenados por impacto esperado no posicionamento em streaming. Prioridade Alta = impacto direto no resultado de lançamento; Média = melhoria de identidade; Baixa = refinamento opcional.
- "diagnostico_resumo": 4-6 frases em linguagem acessível, SEM nenhum número, sigla técnica (LUFS, dBTP, LU, dBFS, Hz, dB) ou nome de plugin. Estruture cobrindo: (1) identidade sonora descrita por sensação — peso, brilho, espaço, textura, intimidade ou abertura; (2) instrumentos protagonistas e o papel deles na narrativa da faixa (quem conduz, quem sustenta, presença e caráter do vocal, densidade do arranjo); (3) enquadramento nos critérios sonoros que o Spotify valoriza para destacar uma faixa — perfil de loudness percebido coerente com a normalização da plataforma, contraste entre seções, clareza vocal, identidade reconhecível nos primeiros segundos, "tradução" em fone, carro e caixa bluetooth; (4) chance real de destaque em playlists — que tipos combinam (editoriais de gênero/mood, algorítmicas como Radar de Lançamentos e Release Radar, playlists de foco/treino/festa conforme energia) e qual ajuste sonoro ou de arranjo — não técnico — aumentaria a chance de placement. Tom de parceiro experiente, sem promessas de sucesso e sem alarmismo.

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
  } | null;
  return {
    content: d?.content ?? "",
    neighbors: d?.neighbors ?? [],
    catalogTotalCompared: d?.catalog_total_compared ?? 0,
    catalogTotal: d?.catalog_total ?? 0,
    catalogGenreCount: d?.catalog_genre_count ?? 0,
    strictGenreUsed: d?.strict_genre_used ?? false,
  };
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
      appendLog("🌐  Buscando referência externa em AcousticBrainz e Deezer…");
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
      });

      // Classificação independente por features (cosine similarity sobre perfis hardcoded + benchmarks BR)
      let classifierProfiles: Record<string, GenreFeatureProfile> = HARDCODED_GENRE_PROFILES;
      try {
        const { data: bm } = await supabase
          .from("music_dna_benchmarks")
          .select("genero,total_faixas,avg_tempo_bpm,avg_danceability,avg_energy,avg_acousticness,avg_instrumentalness,avg_valence,avg_speechiness,avg_loudness_db")
          .gte("total_faixas", 20);
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
      if (classifierHint) {
        appendLog(`🎼  Classificador interno: ${classifierHint.detected} (${Math.round(classifierHint.score * 100)}%).`);
      }

      const {
        content: rawText,
        neighbors: catalogNeighbors,
        catalogTotalCompared,
        catalogTotal,
        catalogGenreCount,
        strictGenreUsed,
      } = await callMusicDNAAnalyze(prompt, {
        features: externalLookup?.features,
        genero: input.genre,
        track_name: input.name,
        classifier_hint: classifierHint,
        track_features: {
          tempo_bpm: realAnalysis.bpm,
          lufs_integrated: calibrated.lufs_integrated,
          energy: realAnalysis.energy,
          danceability: realAnalysis.danceability,
          valence: realAnalysis.valence,
          acousticness: realAnalysis.acousticness,
          instrumentalness: realAnalysis.instrumentalness,
          dynamic_range_db: realAnalysis.dynamic_range_lu,
          spectral_centroid_hz: calibrated.spectral_centroid_hz,
          spectral_rolloff: calibrated.spectral_rolloff,
          spectral_flatness: calibrated.spectral_flatness,
          speechiness: realAnalysis.speechiness,
          liveness: realAnalysis.liveness,
          key_name: (realAnalysis.key ?? "").replace(/m$/, "") || null,
          mode: /m$/.test(realAnalysis.key ?? "") ? "minor" : "major",
        },
      });
      const clean = rawText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      // Validação client-side: filtra `referencias_proximas` para manter apenas
      // artistas que estão na lista curada OU em vizinhos reais do catálogo.
      // Evita o LLM citar artista fora do escopo permitido.
      const allowedArtists = new Set<string>([
        ...ALL_REFERENCE_ARTISTS.map((a) => a.toLowerCase()),
        ...catalogNeighbors.map((n) => n.band?.toLowerCase()).filter(Boolean) as string[],
      ]);
      const rawReferences: ReferenceMatch[] = Array.isArray(parsed.referencias_proximas) ? parsed.referencias_proximas : [];
      const validatedReferences = rawReferences.filter((r) => {
        const name = (r.artista ?? "").toLowerCase().trim();
        return name.length > 0 && allowedArtists.has(name);
      });
      if (rawReferences.length !== validatedReferences.length) {
        const dropped = rawReferences.filter((r) => !validatedReferences.includes(r));
        console.warn("[music-dna] referências IA descartadas (fora da lista permitida):", dropped.map((r) => r.artista));
      }
      parsed.referencias_proximas = validatedReferences;

      setProgress(100);
      setStep("done");
      appendLog(catalogNeighbors.length ? `🎯  ${catalogNeighbors.length} faixas próximas encontradas no catálogo.` : "✅  Diagnóstico concluído.");

      return {
        ...parsed,
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
