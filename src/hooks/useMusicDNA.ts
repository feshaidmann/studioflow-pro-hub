import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { analyzeAudioFull, type AnalysisResult, type RealAudioAnalysis, type AudioSection } from "@/lib/audioAnalysis";
import { detectInstruments, type InstrumentDetection } from "@/lib/instrumentDetection";
import { lookupMusicDnaReferences, type MusicDnaLookupResult } from "@/lib/musicDnaLookup";

// ── Re-exports ───────────────────────────────────────────────────────────────
export type { RealAudioAnalysis, AudioSection } from "@/lib/audioAnalysis";

// ── TYPES ────────────────────────────────────────────────────────────────────

export type Genre =
  | "Indie Folk"
  | "Pop Brasileiro"
  | "Sertanejo Raiz"
  | "MPB Contemporânea"
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
}

// ── CONSTANTS ────────────────────────────────────────────────────────────────

export const GENRE_PRESETS: Record<Genre, AudioFeatures> = {
  "Indie Folk":        { energy: 0.35, danceability: 0.42, acousticness: 0.88, valence: 0.45, instrumentalness: 0.12, liveness: 0.18 },
  "Pop Brasileiro":    { energy: 0.72, danceability: 0.78, acousticness: 0.22, valence: 0.68, instrumentalness: 0.03, liveness: 0.14 },
  "Sertanejo Raiz":    { energy: 0.48, danceability: 0.55, acousticness: 0.75, valence: 0.62, instrumentalness: 0.06, liveness: 0.22 },
  "MPB Contemporânea": { energy: 0.52, danceability: 0.58, acousticness: 0.55, valence: 0.50, instrumentalness: 0.15, liveness: 0.16 },
  "Lo-Fi Hip Hop":     { energy: 0.30, danceability: 0.60, acousticness: 0.72, valence: 0.40, instrumentalness: 0.82, liveness: 0.08 },
  "Trap BR":           { energy: 0.80, danceability: 0.76, acousticness: 0.06, valence: 0.35, instrumentalness: 0.05, liveness: 0.12 },
  "Bossa Nova":        { energy: 0.28, danceability: 0.52, acousticness: 0.82, valence: 0.58, instrumentalness: 0.20, liveness: 0.12 },
  "Rock Alternativo":  { energy: 0.78, danceability: 0.52, acousticness: 0.15, valence: 0.42, instrumentalness: 0.18, liveness: 0.25 },
};

export const REFERENCE_ARTISTS: string[] = [
  "Bon Iver", "Novo Amor", "Clarice Falcão", "Criolo",
  "Emicida", "Ana Frango Elétrico", "Terno Rei", "Djonga",
  "Pitty", "Fresno", "BK'", "Baco Exu do Blues",
  "Tim Bernardes", "Rubel", "Mônica Salmaso", "Anavitória",
];

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
  instrumentData?: InstrumentDetection
): string {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const db = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}`;
  const hz = (v: number) => `${Math.round(v)} Hz`;
  const sec = (s: number, e: number) => `${s.toFixed(0)}s–${e.toFixed(0)}s`;

  // True Peak diagnostic
  const tpStatus = analysis.true_peak_dbtp > 0
    ? `CRÍTICO: ${db(analysis.true_peak_dbtp)} dBTP — acima de 0 dBTP, haverá clipagem pós-normalização. O Spotify aplicará ganho de ${db(-1 * (analysis.lufs_integrated + 14))} dB, levando o True Peak a ${db(analysis.true_peak_dbtp + (-1 * (analysis.lufs_integrated + 14)))} dBTP.`
    : analysis.true_peak_dbtp > -1
    ? `ATENÇÃO: ${db(analysis.true_peak_dbtp)} dBTP — acima do limite seguro de −1 dBTP. Risco de artefatos nos codecs de streaming.`
    : `OK: ${db(analysis.true_peak_dbtp)} dBTP — dentro do limite seguro (≤ −1 dBTP).`;

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

  return `
Você é um produtor musical e engenheiro de áudio experiente, com domínio técnico profundo e paixão por ajudar artistas a evoluírem.
Analise os dados técnicos REAIS da faixa abaixo e gere um diagnóstico musical completo, específico e acionável.
Cada afirmação DEVE ser ancorada em pelo menos um dado da análise. Proibido julgamentos vagos.

REGRAS DE LINGUAGEM:
- Use linguagem TÉCNICA e profissional em TODOS os campos, como um engenheiro de mix/master falando com outro profissional.
- Cite valores reais (LUFS, dBTP, Hz, dB, LU) e termos técnicos sem simplificação (headroom, transientes, sidechain, spectral rolloff, etc.).
- Sugestões ultra-específicas: QUAL técnica, QUAL plugin/ferramenta, QUAL configuração, ONDE aplicar, QUAL resultado mensurável esperado.
- Seja direto e preciso. Reconheça o que funciona tecnicamente antes de sugerir ajustes.
- EXCEÇÃO — o campo "diagnostico_resumo": aqui, adote o tom de um crítico musical experiente e acolhedor. Misture percepções musicais com referências técnicas pontuais (ex: "o peso dos graves é bem resolvido, com o sub concentrado em 60 Hz"). Linguagem acessível mas não superficial.
- NUNCA use palavras como "urgente", "crítico" ou "imediato". Use "é altamente recomendável", "vale muito a pena considerar", "seria interessante explorar".
- Enquadre sugestões como recomendações profissionais, não como alertas de emergência.

════════════════════════════════════════════════
DADOS DA FAIXA
════════════════════════════════════════════════
Nome:    "${input.name}"
BPM:     ${analysis.bpm.toFixed(1)}
Tom:     ${analysis.key}
Duração: ${Math.floor(analysis.duration_sec / 60)}:${String(Math.round(analysis.duration_sec % 60)).padStart(2, "0")}
Referências: ${input.references.length ? input.references.join(", ") : "nenhuma"}
Descrição: ${input.notes || "não fornecida"}

════════════════════════════════════════════════
ANÁLISE TÉCNICA — NÍVEL GLOBAL
════════════════════════════════════════════════
LUFS INTEGRADO:    ${lufsStatus}
LUFS SHORT-TERM:   ${analysis.lufs_short_term} LUFS (pico de loudness momentâneo)
TRUE PEAK:         ${tpStatus}
DYNAMIC RANGE:     ${analysis.dynamic_range_lu.toFixed(1)} LU (DR < 7 = hiperlimitado; DR > 14 = muito dinâmico)
RMS GLOBAL:        ${analysis.rms_dbfs.toFixed(1)} dBFS
CENTROIDE ESPECT.: ${hz(analysis.spectral_centroid_hz)} (ref. típico: 1.500–2.500 Hz)
SPECTRAL ROLLOFF:  ${hz(analysis.spectral_rolloff_hz)} (85% da energia abaixo desta freq)
SPECTRAL FLATNESS: ${analysis.spectral_flatness.toFixed(3)} (0 = tonal; 1 = ruído)

ATRIBUTOS MEDIDOS:
  Energia:          ${pct(analysis.energy)}
  Dançabilidade:    ${pct(analysis.danceability)}
  Acústica:         ${pct(analysis.acousticness)}
  Valência:         ${pct(analysis.valence)}
  Instrumentalidade:${pct(analysis.instrumentalness)}
  Liveness:         ${pct(analysis.liveness)}
  Speechiness:      ${pct(analysis.speechiness)}

════════════════════════════════════════════════
ANÁLISE POR SEÇÃO
════════════════════════════════════════════════
${sectionAnalysis}
${contrastNote}
${instrSection}

════════════════════════════════════════════════
FORMATO DE RESPOSTA
════════════════════════════════════════════════
Responda SOMENTE com JSON válido, sem markdown, sem texto externo ao JSON.
Nenhum campo deve conter instruções, meta-texto ou placeholders. Apenas o conteúdo real do diagnóstico.
Todos os campos usam linguagem técnica profissional com valores e termos de engenharia de áudio, EXCETO "diagnostico_resumo" que usa tom de crítico musical com toques técnicos.
Use "é altamente recomendável", "vale a pena explorar", "seria interessante considerar" — nunca "urgente", "crítico" ou "imediato".

No "diagnostico_tecnico", inclua em cada campo: avaliação técnica com valores medidos + dica prática acionável (plugin, configuração, técnica específica na DAW).

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

async function callMusicDNAAnalyze(prompt: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("music-dna-analyze", {
    body: { prompt },
  });

  if (error) throw new Error(error.message);
  return (data as { content: string })?.content ?? "";
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
      appendLog("🎵  Decodificando e analisando áudio…");

      const [fullAnalysis, instrumentResult, externalLookup] = await Promise.all([
        analyzeAudioFull(input.file),
        detectInstruments(input.file),
        lookupMusicDnaReferences(input.name),
      ]);

      const { legacy: audioAnalysis, real: realAnalysis } = fullAnalysis;
      const detectedInstruments = instrumentResult.instruments;

      setProgress(35);
      appendLog(
        `📊  LUFS: ${realAnalysis.lufs_integrated} · Peak: ${realAnalysis.true_peak_dbtp} dBTP · DR: ${realAnalysis.dynamic_range_lu} LU`
      );
      appendLog(
        `🎹  BPM: ${realAnalysis.bpm} · Tom: ${realAnalysis.key} · Centroide: ${realAnalysis.spectral_centroid_hz} Hz`
      );
      if (externalLookup) appendLog(`🌐  Benchmark externo: ${externalLookup.fonte}`);

      // Step 2 — Features from real analysis
      setStep("profiling");
      setProgress(45);
      appendLog("🔍  Calculando perfil acústico e seções…");
      appendLog(
        `📐  ${realAnalysis.sections.length} seções detectadas · Energia: ${Math.round(realAnalysis.energy * 100)}%`
      );

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
      appendLog(`📐  Distância estética: ${distance.toFixed(3)}`);

      // Step 4 — AI
      setStep("generating");
      setProgress(70);
      appendLog("🤖  Gerando diagnóstico avançado com IA…");

      const prompt = buildPrompt(input, realAnalysis, instrumentResult);
      const rawText = await callMusicDNAAnalyze(prompt);
      const clean = rawText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      setProgress(100);
      setStep("done");
      appendLog("✅  Diagnóstico concluído.");

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
      };
    },

    onSuccess: (data) => {
      setResult(data);
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
