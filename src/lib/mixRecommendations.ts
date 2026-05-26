/**
 * Recomendações determinísticas de mix/master DIY para artistas independentes.
 * Geradas a partir das métricas extraídas — NÃO usa LLM.
 * Sempre cita plugin gratuito ou recurso nativo de DAW.
 */
import type { RealAudioAnalysis } from "./audioAnalysis";
import { evaluateTruePeak } from "./audioAnalysis";

export type RecPriority = "Alta" | "Média" | "Baixa";

export interface MixRecommendation {
  id: string;
  prioridade: RecPriority;
  titulo: string;
  acao: string;
  como_fazer: string; // ferramenta + passo a passo curto
  metrica: string;    // o que disparou a sugestão
}

// LUFS alvo aproximado por gênero (streaming-friendly)
const LUFS_TARGETS: Record<string, [number, number]> = {
  "Pop":              [-10, -8],
  "Pop Brasileiro":   [-10, -8],
  "Pop Internacional":[-10, -8],
  "Sertanejo":        [-9,  -7],
  "Funk Carioca":     [-8,  -6],
  "Eletrônica":       [-8,  -6],
  "Eletrônica / House":[-8, -6],
  "Trap BR":          [-9,  -7],
  "Rap BR":           [-9,  -7],
  "Rock":             [-11, -9],
  "Rock Alternativo": [-11, -9],
  "Indie BR":         [-13, -10],
  "Indie Folk":       [-14, -11],
  "MPB":              [-13, -10],
  "MPB Contemporânea":[-13, -10],
  "Bossa Nova":       [-16, -13],
  "Lo-Fi Hip Hop":    [-14, -11],
  "Samba":            [-12, -10],
  "Pagode":           [-11, -9],
};

const DEFAULT_LUFS: [number, number] = [-14, -10];

function getLufsTarget(genre?: string): [number, number] {
  if (!genre) return DEFAULT_LUFS;
  const exact = LUFS_TARGETS[genre];
  if (exact) return exact;
  const fuzzy = Object.keys(LUFS_TARGETS).find(k => genre.toLowerCase().includes(k.toLowerCase()));
  return fuzzy ? LUFS_TARGETS[fuzzy] : DEFAULT_LUFS;
}

export function generateMixRecommendations(
  a: RealAudioAnalysis,
  genre?: string
): MixRecommendation[] {
  const recs: MixRecommendation[] = [];
  const [lufsLow, lufsHigh] = getLufsTarget(genre);

  // ── 1. True Peak ─────────────────────────────────────────────────────────
  const tpStatus = evaluateTruePeak(a.true_peak_dbtp);
  if (tpStatus === "critical") {
    recs.push({
      id: "tp-critical",
      prioridade: "Alta",
      titulo: "Risco de distorção em streaming",
      acao: `True Peak está em ${a.true_peak_dbtp.toFixed(1)} dBTP — acima de 0 dBTP. Plataformas (Spotify, YouTube) podem causar clipping na conversão.`,
      como_fazer: "Insira um limiter no master (LoudMax — grátis) com Output Ceiling = -1.0 dBTP. Reduza o Input/Threshold até o True Peak ficar ≤ -1.0.",
      metrica: `True Peak ${a.true_peak_dbtp.toFixed(1)} dBTP`,
    });
  } else if (tpStatus === "tolerance") {
    recs.push({
      id: "tp-tolerance",
      prioridade: "Média",
      titulo: "True Peak na zona de tolerância",
      acao: `True Peak ${a.true_peak_dbtp.toFixed(1)} dBTP. Funciona, mas margem apertada — qualquer recodificação pode passar do limite.`,
      como_fazer: "Ajuste o teto do seu limiter (LoudMax / W1 Limiter) para -1.0 dBTP. Custo zero, ganha segurança.",
      metrica: `True Peak ${a.true_peak_dbtp.toFixed(1)} dBTP`,
    });
  }

  // ── 2. LUFS vs alvo do gênero ────────────────────────────────────────────
  const lufs = a.lufs_integrated;
  if (lufs < lufsLow - 1.5) {
    const delta = (lufsLow - lufs).toFixed(1);
    recs.push({
      id: "lufs-quiet",
      prioridade: "Alta",
      titulo: "Faixa muito silenciosa para o gênero",
      acao: `Você está em ${lufs.toFixed(1)} LUFS — o gênero pede ${lufsLow} a ${lufsHigh} LUFS. Em playlists, sua música vai parecer "fraca" comparada ao resto.`,
      como_fazer: `Ganho de +${delta} dB no master via TDR Nova (grátis) ou plugin de ganho nativo da DAW. Depois bata num limiter (LoudMax) com teto -1 dBTP para não estourar.`,
      metrica: `LUFS integrado ${lufs.toFixed(1)} (alvo ${lufsLow}–${lufsHigh})`,
    });
  } else if (lufs > lufsHigh + 1.5) {
    recs.push({
      id: "lufs-loud",
      prioridade: "Média",
      titulo: "Compressão excessiva para o gênero",
      acao: `LUFS em ${lufs.toFixed(1)} — acima do alvo (${lufsLow} a ${lufsHigh}). Streaming vai baixar o volume e a dinâmica perdida fica audível.`,
      como_fazer: "Reduza o ganho de entrada do limiter em 1-2 dB e/ou alivie o threshold do compressor de master (Voxengo Marvel GEQ + nativo da DAW).",
      metrica: `LUFS integrado ${lufs.toFixed(1)} (alvo ${lufsLow}–${lufsHigh})`,
    });
  }

  // ── 3. Dinâmica (DR / crest factor) ──────────────────────────────────────
  const dr = a.dynamic_range_lu;
  if (dr < 5) {
    recs.push({
      id: "dr-flat",
      prioridade: "Alta",
      titulo: "Dinâmica esmagada",
      acao: `Range dinâmico de ${dr.toFixed(1)} LU — a faixa está "achatada". Em fones, soa fatigante; em caixa pequena, perde corpo.`,
      como_fazer: "Volte ao mix: alivie compressão paralela no bus de drums (TDR Kotelnikov — grátis, ratio 2:1, attack 30ms, release 100ms). No master, evite limitar mais que -3 dB de gain reduction.",
      metrica: `Dynamic Range ${dr.toFixed(1)} LU`,
    });
  } else if (dr > 14) {
    recs.push({
      id: "dr-wide",
      prioridade: "Baixa",
      titulo: "Dinâmica muito ampla para streaming",
      acao: `${dr.toFixed(1)} LU é ótimo para escuta crítica, mas em playlist os refrões podem sumir nos sistemas de auto-volume.`,
      como_fazer: "Compressão paralela leve (TDR Kotelnikov: ratio 4:1, attack 10ms, release 80ms, mix 30%) no bus principal antes do limiter.",
      metrica: `Dynamic Range ${dr.toFixed(1)} LU`,
    });
  }

  // ── 4. Brilho (centroid) ──────────────────────────────────────────────────
  const cen = a.spectral_centroid_hz;
  if (cen > 3800) {
    recs.push({
      id: "centroid-bright",
      prioridade: "Média",
      titulo: "Faixa muito brilhante",
      acao: `Centroide em ${Math.round(cen)} Hz — risco de fadiga em fones e celulares. Comum em mixes feitos em monitores pequenos.`,
      como_fazer: "Corte suave em 4-6 kHz (TDR Nova: shelf alto, -2 dB, Q 0.7). Cheque em fone barato antes de aprovar.",
      metrica: `Centroide espectral ${Math.round(cen)} Hz`,
    });
  } else if (cen < 1500) {
    recs.push({
      id: "centroid-dull",
      prioridade: "Média",
      titulo: "Faixa abafada",
      acao: `Centroide em ${Math.round(cen)} Hz — falta presença e ar. Pode sumir em fone bluetooth e som de carro.`,
      como_fazer: "Realce em 8-12 kHz (TDR Nova: shelf alto +1.5 a +2.5 dB, Q 0.5). Se ainda faltar definição, +1 dB em 2-4 kHz.",
      metrica: `Centroide espectral ${Math.round(cen)} Hz`,
    });
  }

  // ── 5. Flatness (presença de ruído) ──────────────────────────────────────
  if (a.spectral_flatness > 0.35) {
    recs.push({
      id: "flatness-noise",
      prioridade: "Média",
      titulo: "Sinal com excesso de ruído",
      acao: `Spectral flatness em ${a.spectral_flatness.toFixed(2)} — bastante conteúdo "ruidoso" (hiss, ar de microfone, vazamentos). Limpa o mix.`,
      como_fazer: "ReaFIR (ReaPlugs — grátis) em modo 'Subtract' nos canais de voz e violão para tirar o noise floor. Ou cabra de noise gate suave (TDR Nova com expander).",
      metrica: `Spectral Flatness ${a.spectral_flatness.toFixed(2)}`,
    });
  }

  // Ordena por prioridade
  const weight: Record<RecPriority, number> = { Alta: 0, Média: 1, Baixa: 2 };
  return recs.sort((a, b) => weight[a.prioridade] - weight[b.prioridade]);
}
