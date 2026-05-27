/**
 * Estágio de produção declarado pelo artista antes da análise do Music DNA.
 *
 * O estágio reconfigura o relatório: alvos das métricas, seções visíveis,
 * badge "Pronta para streaming" e tom das sugestões da IA.
 *
 * Default = `master` (comportamento legado, análises sem stage).
 */
export type AudioStage = "demo" | "mix" | "master";

export const STAGE_LABEL: Record<AudioStage, string> = {
  demo: "Demo",
  mix: "Mix",
  master: "Master",
};

export const STAGE_DESCRIPTION: Record<AudioStage, string> = {
  demo: "Ideia gravada · foco em arranjo e identidade",
  mix: "Arranjo fechado · foco em balanço e dinâmica",
  master: "Pronta pra streaming · cobra LUFS, True Peak, DR",
};

/**
 * Perfil de regra por estágio. Controla:
 * - quais MetricCards aparecem
 * - qual `target` cada MetricCard usa
 * - se o badge "Pronta para streaming" acende
 * - se PlaylistMatchCard (pitch) é exibido
 * - tom do diagnóstico técnico
 */
export interface StageProfile {
  readyBadge: "streaming" | "mix" | "hidden";
  /** Mostrar MetricCard de LUFS com cobrança numérica. */
  enforceLufs: boolean;
  /** Mostrar MetricCard de True Peak. */
  enforceTruePeak: boolean;
  /** Tipo de alvo para DR. */
  drMode: "strict" | "soft" | "informative";
  /** Mostrar PlaylistMatchCard (faz sentido só quando vai entrar em pitch). */
  showPlaylistMatch: boolean;
  /** Mostrar BenchmarkPanel (comparativo com gênero). */
  showBenchmark: boolean;
  /** Mostrar CatalogNeighborsPanel (vizinhos do catálogo). */
  showCatalogNeighbors: boolean;
  /** Texto-âncora sobre o que esperar daquele estágio (subtítulo do header). */
  contextNote: string;
}

export const STAGE_PROFILES: Record<AudioStage, StageProfile> = {
  demo: {
    readyBadge: "hidden",
    enforceLufs: false,
    enforceTruePeak: false,
    drMode: "informative",
    showPlaylistMatch: false,
    showBenchmark: true,
    showCatalogNeighbors: true,
    contextNote:
      "Análise de Demo: foco em identidade artística, contraste das seções e ideias de arranjo. Alvos de loudness e True Peak ficam de fora — vão entrar quando a faixa for pra mix/master.",
  },
  mix: {
    readyBadge: "mix",
    enforceLufs: false,
    enforceTruePeak: true,
    drMode: "soft",
    showPlaylistMatch: false,
    showBenchmark: true,
    showCatalogNeighbors: true,
    contextNote:
      "Análise de Mix: foco em balanço, dinâmica e contraste verso/refrão. LUFS aparece como referência, não como cobrança — a competitividade de streaming é decidida no master.",
  },
  master: {
    readyBadge: "streaming",
    enforceLufs: true,
    enforceTruePeak: true,
    drMode: "strict",
    showPlaylistMatch: true,
    showBenchmark: true,
    showCatalogNeighbors: true,
    contextNote:
      "Análise de Master: comportamento completo — LUFS, True Peak e Dynamic Range com alvos de streaming, sugestão de pitch para playlists e comparativo com o catálogo.",
  },
};

/**
 * Mapeia o estágio do workflow do projeto (6 fases) para o estágio de áudio (3).
 * Mantém compatibilidade com `inicio | gravacao | mix | master | upload | lancado | rough`.
 */
export function workflowStageToAudioStage(workflowStage?: string | null): AudioStage | null {
  if (!workflowStage) return null;
  const s = workflowStage.toLowerCase().trim();
  if (s === "inicio" || s === "rough" || s === "gravacao") return "demo";
  if (s === "mix") return "mix";
  if (s === "master" || s === "upload" || s === "lancado") return "master";
  return null;
}

/**
 * Estágio efetivo: override do usuário > derivado do projeto > master (default).
 */
export function resolveStage(
  override: AudioStage | undefined | null,
  workflowStage: string | undefined | null,
): AudioStage {
  if (override) return override;
  const fromProject = workflowStageToAudioStage(workflowStage);
  if (fromProject) return fromProject;
  return "master";
}

/**
 * Aceita string vinda do banco/forma livre e devolve um AudioStage válido (ou null).
 */
export function parseStage(value: unknown): AudioStage | null {
  if (value === "demo" || value === "mix" || value === "master") return value;
  return null;
}
