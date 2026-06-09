import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackModal } from "./FeedbackModal";
import {
  Radar, RadarChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis,
  ResponsiveContainer, Legend,
} from "recharts";
import { MessageSquare, ListPlus, Check, Save, Trash2, Download, CheckCircle2, AlertTriangle, XCircle, ChevronRight, User, ThumbsUp, ThumbsDown, Copy } from "lucide-react";
import { LinkAnalysisTrackDialog } from "@/components/spotify-import/LinkAnalysisTrackDialog";
import { useAcceptanceSignal } from "@/hooks/useAcceptanceSignal";
import { TrackVersionsPanel } from "@/components/music-dna/TrackVersionsPanel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTasks } from "@/hooks/useTasks";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { cn } from "@/lib/utils";
import { scrollToAnchor } from "@/lib/scrollToAnchor";
import { LufsCompatibility } from "@/components/music-dna/LufsCompatibility";
import { useMusicDnaBenchmarks, findBenchmarkForGenre } from "@/hooks/useMusicDnaBenchmarks";
import { spotifyFeaturesFromDiagnosis, FEATURE_DESCRIPTIONS, type MusicDnaBenchmark, type SpotifyFeatures } from "@/types/musicDna";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NeighborDetailDialog } from "@/components/music-dna/NeighborDetailDialog";
import { GenreMismatchHint } from "@/components/music-dna/GenreMismatchHint";
import { SpotifyPopularityCard } from "@/components/music-dna/SpotifyPopularityCard";
import { ActiveMonitorsCard } from "@/components/music-dna/ActiveMonitorsCard";
import {
  STAGE_LABEL,
  STAGE_PROFILES,
  type AudioStage,
} from "@/lib/musicDnaStages";
import { CatalogNeighborsPanel } from "@/components/music-dna/CatalogNeighborsPanel";
// AcousticMatchPanel deixou de ser usado no resultado público (mantido no codebase para uso futuro/admin).

import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import {
  GENRE_PRESETS, calcDistance,
  toRadarData,
  type TrackInput, type Genre,
  type DiagnosisResult, type AudioFeatures, type CatalogNeighbor,
} from "@/hooks/useMusicDNA";

// ── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function RadarTick(props: {
  payload?: { value: string };
  x?: number; y?: number; cx?: number; cy?: number;
  textAnchor?: string;
}) {
  const { payload, x = 0, y = 0, cx = 0, cy = 0 } = props;
  const label = payload?.value ?? "";
  // quebra rótulos longos em até 2 linhas (~12 chars por linha)
  const words = label.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > 12 && current) {
      lines.push(current);
      current = w;
    } else {
      current = (current ? current + " " : "") + w;
    }
  }
  if (current) lines.push(current);
  const limited = lines.slice(0, 2);
  if (lines.length > 2) limited[1] = limited[1].replace(/.{0,2}$/, "…");

  // empurra o rótulo levemente para fora, na direção do centro→ponto
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const offset = 6;
  const ox = x + (dx / dist) * offset;
  const oy = y + (dy / dist) * offset;

  // ancoragem horizontal por quadrante para evitar overflow
  const anchor: "start" | "middle" | "end" =
    Math.abs(dx) < 12 ? "middle" : dx > 0 ? "start" : "end";

  return (
    <text
      x={ox}
      y={oy}
      textAnchor={anchor}
      fill="hsl(var(--muted-foreground))"
      fontSize={10}
      style={{ pointerEvents: "none" }}
    >
      {limited.map((line, i) => (
        <tspan key={i} x={ox} dy={i === 0 ? 0 : 12}>{line}</tspan>
      ))}
    </text>
  );
}

function AcousticRadar({ trackFeatures, refFeatures }: {
  trackFeatures: AudioFeatures;
  refFeatures: AudioFeatures;
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart
        data={toRadarData(trackFeatures, refFeatures)}
        margin={{ top: 24, right: 64, bottom: 24, left: 64 }}
        outerRadius="72%"
      >
        <PolarGrid
          stroke="hsl(var(--border))"
          strokeOpacity={0.6}
          strokeDasharray="2 3"
        />
        <PolarAngleAxis
          dataKey="subject"
          tick={<RadarTick />}
          tickLine={false}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 1]}
          tick={false}
          axisLine={false}
          stroke="hsl(var(--border))"
        />
        <Radar name="Referência" dataKey="Referência"
          stroke="hsl(var(--primary) / 0.5)" fill="hsl(var(--primary) / 0.1)"
          strokeWidth={1.5} strokeDasharray="4 2"
        />
        <Radar name="Sua faixa" dataKey="Faixa"
          stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)"
          strokeWidth={2}
        />
        <Legend iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 8,
            color: "hsl(var(--muted-foreground))" }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function FeatureBar({ label, value, refValue }: {
  label: string; value: number; refValue?: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-[11px] uppercase tracking-widest font-mono text-muted-foreground">
          {label}
        </span>
        <span className="text-[11px] font-mono text-primary">
          {Math.round(value * 100)}%
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-border">
        {refValue != null && (
          <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 rounded bg-primary/40 z-10"
            style={{ left: `${refValue * 100}%` }} />
        )}
        <div className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

function PlatformCompatibilityCard({ lufs }: { lufs: number | null | undefined }) {
  if (typeof lufs !== "number" || !Number.isFinite(lufs)) return null;
  return (
    <Card className="border-l-4 border-l-primary animate-fade-in">
      <CardHeader className="pb-2 px-4 pt-3">
        <CardTitle className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-primary">
          <span>📡</span> Compatibilidade com plataformas
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <LufsCompatibility lufs={lufs} />
      </CardContent>
    </Card>
  );
}

function BenchmarkPanel({ diagnosis, benchmark }: { diagnosis: DiagnosisResult; benchmark?: MusicDnaBenchmark }) {
  const features = spotifyFeaturesFromDiagnosis(diagnosis);
  const benchmarkSource = benchmark ? "Catálogo de referência" : "Fallback acústico";
  const benchmarkLabel = benchmark ? benchmark.genero : diagnosis.genero_classificado || "Média geral";
  const tracks = benchmark?.total_faixas ?? 0;
  const artists = benchmark?.total_artistas ?? 0;
  const benchmarkCount = benchmark
    ? artists > 0
      ? `${tracks} faixas · ${artists} artistas`
      : `${tracks} faixas`
    : "Heurística local";
  const benchmarkMap: Partial<Record<keyof SpotifyFeatures, number | null>> = benchmark ? {
    danceability: benchmark.avg_danceability,
    energy: benchmark.avg_energy,
    speechiness: benchmark.avg_speechiness,
    acousticness: benchmark.avg_acousticness,
    instrumentalness: benchmark.avg_instrumentalness,
    liveness: benchmark.avg_liveness,
    valence: benchmark.avg_valence,
  } : {};
  const attrs: (keyof SpotifyFeatures)[] = ["danceability", "energy", "valence", "acousticness", "instrumentalness", "speechiness", "liveness"];

  return (
    <DiagCard icon="📈" title="Benchmark de comparação — atributos estilo Spotify" variant="primary">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2.5">
          {attrs.map((key) => (
            <FeatureBar
              key={key}
              label={FEATURE_DESCRIPTIONS[key]}
              value={features[key] as number}
              refValue={benchmarkMap[key] ?? undefined}
            />
          ))}
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted/30 border border-border p-3">
              <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Fonte</p>
              <p className="text-sm font-semibold">{benchmarkSource}</p>
              {benchmark && (
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">Recalculado a cada nova faixa importada</p>
              )}
            </div>

            <div className="rounded-lg bg-muted/30 border border-border p-3">
              <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Benchmark</p>
              <p className="text-sm font-semibold">{benchmarkLabel}</p>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{benchmarkCount}</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Médias agregadas em tempo real do catálogo curado (faixas reais processadas com librosa/pyloudnorm). Quando não há cobertura suficiente do gênero, cai automaticamente para o gênero pai (ex: Trap BR → Hip-Hop).
          </p>
        </div>
      </div>
    </DiagCard>
  );
}

function CompatibilityBadge({ result }: { result: DiagnosisResult }) {
  const genre = result.genero_classificado;
  const genrePreset = GENRE_PRESETS[genre as Genre];
  const score = genrePreset
    ? Math.round((1 - calcDistance(result.trackFeatures, genrePreset)) * 100)
    : Math.round((1 - result.distance) * 100);

  const topRef = result.referencias_proximas?.[0];

  const genreCfg = score >= 75
    ? "bg-primary/10 text-primary border-primary/30"
    : score >= 50
    ? "bg-primary/10 text-primary border-primary/30"
    : "bg-destructive/10 text-destructive border-destructive/30";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={cn(
        "inline-flex items-center gap-1.5 border rounded-full px-3 py-1",
        "text-[11px] font-mono uppercase tracking-wider", genreCfg
      )}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {score}% {genre}
      </span>
      {topRef && (
        <span className={cn(
          "inline-flex items-center gap-1.5 border rounded-full px-3 py-1",
          "text-[11px] font-mono uppercase tracking-wider",
          "bg-accent/10 text-accent-foreground border-accent/30"
        )}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {topRef.similaridade} {topRef.artista}
        </span>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: "Alta" | "Média" | "Baixa" }) {
  const styles: Record<string, string> = {
    Alta: "bg-destructive/10 text-destructive border-destructive/30",
    Média: "bg-accent/10 text-accent-foreground border-accent/30",
    Baixa: "bg-muted/20 text-muted-foreground border-border",
  };
  return (
    <span className={cn(
      "shrink-0 text-[11px] font-mono uppercase border rounded-full px-2 py-0.5 tracking-wider",
      styles[priority]
    )}>{priority}</span>
  );
}

function DiagCard({ icon, title, variant = "default", aiBadge = false, children }: {
  icon: string; title: string;
  variant?: "primary" | "success" | "destructive" | "default";
  /** Marca explicitamente que o conteúdo é interpretação da IA, não medição direta. */
  aiBadge?: boolean;
  children: React.ReactNode;
}) {
  const border = {
    primary: "border-l-primary",
    success: "border-l-green-500",
    destructive: "border-l-destructive",
    default: "border-l-border",
  }[variant];
  const color = {
    primary: "text-primary",
    success: "text-primary",
    destructive: "text-destructive",
    default: "text-muted-foreground",
  }[variant];

  return (
    <Card className={cn("border-l-4 animate-fade-in", border)}>
      <CardHeader className="pb-2 px-4 pt-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className={cn(
            "flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider", color
          )}>
            <span>{icon}</span>{title}
          </CardTitle>
          {aiBadge && (
            <span
              className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground border border-border rounded-full px-2 py-0.5"
              title="Texto gerado pela IA a partir das métricas — interpretação, não medição"
            >
              IA · interpretação
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">{children}</CardContent>
    </Card>
  );
}


function DetailSection({ id, children }: {
  id: string;
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16">
      {children}
    </section>
  );
}

function ExecutiveSummary({ diagnosis, proximosPassos, addedItems, onAddStep, analysisId, onSendSignal, stage = "master" }: {
  diagnosis: DiagnosisResult;
  proximosPassos: Array<{ prioridade: "Alta" | "Média" | "Baixa"; acao: string; impacto: string }>;
  addedItems: Set<string>;
  onAddStep: (acao: string, key: string) => void;
  analysisId?: string;
  onSendSignal?: (
    signal: "thumbs_up" | "thumbs_down" | "copied" | "impression",
    metadata?: Record<string, unknown>,
  ) => void;
  stage?: AudioStage;
}) {
  const [voted, setVoted] = useState<"thumbs_up" | "thumbs_down" | null>(null);
  const truePeak = diagnosis.realAnalysis?.true_peak_dbtp;
  const lufs = diagnosis.realAnalysis?.lufs_integrated;
  const dynamicRange = diagnosis.realAnalysis?.dynamic_range_lu;
  const profile = STAGE_PROFILES[stage];
  // (duration/formatDuration removidos: a Duração já aparece no MetricCard "Duração")
  const hasCoreMetrics = [truePeak, lufs, dynamicRange].every(
    (v) => typeof v === "number" && Number.isFinite(v),
  );

  // (Cards "Força/Gargalo/Próxima ação" foram removidos do resumo:
  // o 1º item dessas listas já aparece na seção "Diagnóstico" logo abaixo.)

  // Veredito por estágio:
  //  - master: alvo cheio de streaming (LUFS −15..−13, TP ≤−1, DR ≥7)
  //  - mix: só cobra True Peak e DR mínimo (LUFS folgado, vai ser decidido no master)
  //  - demo: nunca acende "pronta" — esconde badge ou mostra status neutro
  const status = (() => {
    if (profile.readyBadge === "hidden") {
      return { label: "Análise de demo", tone: "primary" as const };
    }
    if (!hasCoreMetrics) {
      return { label: "Análise incompleta", tone: "warning" as const };
    }
    const tp = truePeak as number;
    const lf = lufs as number;
    const dr = dynamicRange as number;
    if (profile.readyBadge === "mix") {
      if (tp > 0 || dr < 5) return { label: "Precisa revisão técnica", tone: "destructive" as const };
      if (tp <= -1 && dr >= 6) return { label: "Pronta pra mandar pro master", tone: "success" as const };
      return { label: "Boa base, ajustes de mix", tone: "primary" as const };
    }
    // master
    if (tp <= -1 && lf >= -15 && lf <= -13 && dr >= 7) {
      return { label: "Pronta para streaming", tone: "success" as const };
    }
    if (tp > 0 || dr < 5) return { label: "Precisa revisão técnica", tone: "destructive" as const };
    return { label: "Boa base, precisa ajustes", tone: "primary" as const };
  })();


  const toneClass = {
    success: "bg-primary/10 text-primary border-primary/30",
    destructive: "bg-destructive/10 text-destructive border-destructive/30",
    primary: "bg-primary/10 text-primary border-primary/30",
    warning: "bg-amber-100 text-amber-800 border-amber-300",
  }[status.tone];

  // Confiança da análise
  const totalCompared = diagnosis.catalogTotalCompared ?? 0;

  const stepsCount = proximosPassos.length;

  const extractionConfidence = (diagnosis.realAnalysis as { extraction_confidence?: "preview" | "full" | "external" } | undefined)?.extraction_confidence ?? "preview";
  const confidenceBadge = {
    preview: { label: "Análise rápida", tone: "bg-amber-100 text-amber-800 border-amber-300", title: "Métricas físicas confiáveis; perceptuais (energia/valência/dançabilidade) são estimativas heurísticas." },
    full: { label: "Análise completa", tone: "bg-primary/10 text-primary border-primary/30", title: "Faixa inteira analisada no browser. LUFS, True Peak e DR são medições reais; energia/valência/dançabilidade são estimativas heurísticas espectrais." },
    external: { label: "Catálogo verificado", tone: "bg-primary/10 text-primary border-primary/30", title: "Features consolidadas com dados externos." },
  }[extractionConfidence];

  // Snapshot de contexto enviado em todo sinal — permite fatiar A/B por
  // estágio/gênero/confiança sem precisar voltar para juntar com a análise.
  const signalContext: Record<string, unknown> = {
    stage,
    genre: diagnosis.genero_classificado ?? null,
    extraction_confidence: extractionConfidence,
  };

  // — Impression tracking — só conta como impressão depois de 1s no viewport
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const impressionSentRef = useRef(false);
  useEffect(() => {
    if (!analysisId || impressionSentRef.current) return;
    const el = summaryRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (timer) continue;
          timer = setTimeout(() => {
            if (impressionSentRef.current) return;
            impressionSentRef.current = true;
            onSendSignal?.("impression", signalContext);
            observer.disconnect();
          }, 1000);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      }
    }, { threshold: [0, 0.5, 1] });
    observer.observe(el);
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId]);

  const [downReason, setDownReason] = useState<string>("");
  const [showReasonBox, setShowReasonBox] = useState(false);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(diagnosis.diagnostico_resumo ?? "");
      toast.success("Resumo copiado");
      onSendSignal?.("copied", signalContext);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const handleVote = (signal: "thumbs_up" | "thumbs_down") => {
    if (voted) return;
    setVoted(signal);
    if (signal === "thumbs_up") {
      onSendSignal?.("thumbs_up", signalContext);
      toast.success("Obrigado pelo feedback!");
    } else {
      // thumbs_down: abre caixa pedindo motivo. Sinal vai junto com o motivo
      // (mesmo se vazio) quando o usuário enviar ou descartar.
      setShowReasonBox(true);
    }
  };

  const submitDown = (skip = false) => {
    const reason = skip ? "" : downReason.trim();
    onSendSignal?.("thumbs_down", { ...signalContext, reason });
    setShowReasonBox(false);
    toast.success(reason ? "Feedback registrado, obrigado!" : "Feedback registrado");
  };


  return (
    <section id="dna-resumo" className="scroll-mt-16">
      <Card className="border-l-4 border-l-primary animate-fade-in">
        <CardContent className="p-4 space-y-4">
          <div ref={summaryRef}>
            <p className="text-[11px] font-mono uppercase tracking-widest text-primary mb-1">Resumo executivo</p>
            <p className="text-sm leading-relaxed">{diagnosis.diagnostico_resumo}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("text-[11px] font-mono uppercase tracking-wider", toneClass)}>
              {status.label}
            </Badge>
            <Badge variant="outline" className={cn("text-[11px] font-mono uppercase tracking-wider", confidenceBadge.tone)} title={confidenceBadge.title}>
              {confidenceBadge.label}
            </Badge>
          </div>

          {/* A2 — Granular readiness checklist */}
          {hasCoreMetrics && profile.readyBadge !== "hidden" && (() => {
            const tp = truePeak as number;
            const lf = lufs as number;
            const dr = dynamicRange as number;
            const isMix = profile.readyBadge === "mix";
            const items = [
              ...(!isMix ? [{ label: "LUFS", val: `${lf.toFixed(1)} LUFS`, pass: lf >= -15 && lf <= -13 }] : []),
              { label: "True Peak", val: `${tp.toFixed(1)} dBTP`, pass: tp <= -1 },
              { label: "DR", val: `${dr.toFixed(1)} LU`, pass: isMix ? dr >= 5 : dr >= 7 },
            ];
            return (
              <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                  <div key={item.label} className={cn(
                    "flex items-center gap-1 text-[11px] font-mono border rounded-full px-2.5 py-0.5",
                    item.pass
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-destructive/10 text-destructive border-destructive/30"
                  )}>
                    {item.pass ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {item.label} · {item.val}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Feedback A/B */}
          {analysisId && (
            <div className="flex items-center justify-between gap-3 flex-wrap pt-1 border-t border-border/60">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                  Esse resumo te ajudou?
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant={voted === "thumbs_up" ? "default" : "ghost"}
                  className="h-7 w-7 p-0"
                  onClick={() => handleVote("thumbs_up")}
                  disabled={!!voted}
                  aria-label="Útil"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={voted === "thumbs_down" ? "default" : "ghost"}
                  className="h-7 w-7 p-0"
                  onClick={() => handleVote("thumbs_down")}
                  disabled={!!voted}
                  aria-label="Não útil"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs gap-1.5" onClick={handleCopy}>
                <Copy className="h-3.5 w-3.5" /> Copiar resumo
              </Button>
            </div>
          )}

          {/* A5 — Quick-jump to próximos passos */}
          {stepsCount > 0 && (
            <div className="pt-1.5 border-t border-border/60">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors py-0.5"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("dna:jump", { detail: { id: "dna-acoes" } }));
                  requestAnimationFrame(() => {
                    const el = document.getElementById("dna-acoes");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  });
                }}
              >
                <span className="flex items-center gap-1.5">
                  <ListPlus className="h-3 w-3" />
                  {stepsCount} próximo{stepsCount !== 1 ? "s passos" : " passo"} de produção
                </span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}

        </CardContent>
      </Card>
    </section>
  );
}

function MetricCard({ label, value, unit, help, target, range, digits = 1 }: {
  label: string;
  value: number | null | undefined;
  unit: string;
  help: string;
  target?: { min: number; max: number; ideal: number };
  range?: { min: number; max: number };
  digits?: number;
}) {
  const hasValue = typeof value === "number" && Number.isFinite(value);
  const fmtValue = hasValue
    ? (value as number).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : "—";

  let status: "ok" | "warn" | "bad" | "neutral" = "neutral";
  let pct = 50;
  if (hasValue && target && range) {
    const v = value as number;
    if (v >= target.min && v <= target.max) status = "ok";
    else if (v >= target.min - (target.max - target.min) * 0.5 && v <= target.max + (target.max - target.min) * 0.5) status = "warn";
    else status = "bad";
    pct = Math.max(0, Math.min(100, ((v - range.min) / (range.max - range.min)) * 100));
  }

  const StatusIcon = status === "ok" ? CheckCircle2 : status === "warn" ? AlertTriangle : status === "bad" ? XCircle : null;
  const statusColor = status === "ok"
    ? "text-primary"
    : status === "warn"
    ? "text-amber-600"
    : status === "bad"
    ? "text-destructive"
    : "text-muted-foreground";

  return (
    <Card className="text-center py-2.5 px-2 flex flex-col gap-1.5">
      <div className="flex items-center justify-center gap-1">
        <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">{label}</p>
        {StatusIcon && <StatusIcon className={cn("h-3 w-3", statusColor)} />}
      </div>
      <p className="text-base font-bold text-primary leading-tight">{fmtValue}</p>
      {unit && <p className="text-[11px] text-muted-foreground">{unit}</p>}
      {target && range && hasValue && (
        <div className="relative h-1 rounded-full bg-muted/60 mx-1 mt-0.5">
          <div
            className="absolute top-0 bottom-0 rounded-full bg-primary/20"
            style={{
              left: `${Math.max(0, ((target.min - range.min) / (range.max - range.min)) * 100)}%`,
              right: `${Math.max(0, 100 - ((target.max - range.min) / (range.max - range.min)) * 100)}%`,
            }}
          />
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-2 w-2 rounded-full border border-background",
              status === "ok" ? "bg-primary" : status === "warn" ? "bg-amber-500" : "bg-destructive"
            )}
            style={{ left: `${pct}%` }}
          />
        </div>
      )}
      {target && (
        <p className="text-[10px] font-mono text-muted-foreground leading-tight">
          alvo: {target.min} a {target.max}{unit ? ` ${unit}` : ""}
        </p>
      )}
      <p className="text-[11px] leading-tight text-foreground/70">{help}</p>
    </Card>
  );
}

function buildAnalysisMarkdown(input: { name: string; references: string[]; notes?: string }, diagnosis: DiagnosisResult): string {
  const r = diagnosis.realAnalysis;
  const a = diagnosis.audioAnalysis;
  const lines: string[] = [];
  lines.push(`# DNA Musical — ${input.name}`);
  lines.push("");
  lines.push(`_Gerado em ${new Date().toLocaleString("pt-BR")}_`);
  lines.push("");
  if (input.references?.length) lines.push(`**Referências informadas:** ${input.references.join(", ")}`);
  if (input.notes) lines.push(`**Notas:** ${input.notes}`);
  lines.push("");
  lines.push("## Resumo executivo");
  lines.push(diagnosis.diagnostico_resumo || "—");
  lines.push("");
  lines.push("## Métricas técnicas");
  lines.push("| Métrica | Valor | Alvo de streaming |");
  lines.push("|---|---|---|");
  lines.push(`| LUFS integrado | ${r?.lufs_integrated ?? a?.lufs ?? "—"} | −15 a −13 LUFS |`);
  lines.push(`| True Peak | ${r?.true_peak_dbtp ?? a?.truePeak ?? "—"} dBTP | ≤ −1 dBTP |`);
  lines.push(`| Dynamic Range | ${r?.dynamic_range_lu ?? a?.dynamicRange ?? "—"} LU | ≥ 7 LU |`);
  lines.push(`| BPM | ${r?.bpm ?? "—"} | — |`);
  lines.push(`| Tom | ${r?.key ?? "—"} | — |`);
  if (r?.duration_sec) lines.push(`| Duração | ${Math.floor(r.duration_sec / 60)}:${String(Math.round(r.duration_sec % 60)).padStart(2, "0")} | — |`);
  lines.push("");
  lines.push("### Como ler");
  lines.push("- **LUFS** é o volume percebido nas plataformas. Acima do alvo, o streaming reduz; abaixo, sua faixa soa mais baixa que as concorrentes.");
  lines.push("- **True Peak** indica risco de distorção depois da compressão de áudio do streaming. Mantenha com folga abaixo de −1 dBTP.");
  lines.push("- **Dynamic Range** mede quanto a faixa respira. Valores muito baixos indicam compressão excessiva; muito altos, mix pouco coeso.");
  lines.push("");

  if (diagnosis.diagnostico_tecnico) {
    lines.push("## Avaliação técnica");
    lines.push(`- **LUFS:** ${diagnosis.diagnostico_tecnico.lufs_avaliacao}`);
    lines.push(`- **True Peak:** ${diagnosis.diagnostico_tecnico.true_peak_avaliacao}`);
    lines.push(`- **Dynamic Range:** ${diagnosis.diagnostico_tecnico.dynamic_range_avaliacao}`);
    lines.push(`- **Espectro:** ${diagnosis.diagnostico_tecnico.espectro_avaliacao}`);
    lines.push("");
  }
  if (diagnosis.identidade) {
    lines.push("## Identidade artística");
    lines.push(`- **Mood:** ${diagnosis.identidade.mood_principal}`);
    lines.push(`- **Território sonoro:** ${diagnosis.identidade.territorio_sonoro}`);
    lines.push(`- **Persona do ouvinte:** ${diagnosis.identidade.persona_ouvinte}`);
    if (diagnosis.identidade.tags?.length) lines.push(`- **Tags:** ${diagnosis.identidade.tags.join(", ")}`);
    lines.push("");
  }
  if (diagnosis.pontos_fortes?.length) {
    lines.push("## Pontos fortes");
    diagnosis.pontos_fortes.forEach(p => lines.push(`- ${p}`));
    lines.push("");
  }
  if (diagnosis.gargalos_criativos?.length) {
    lines.push("## Gargalos criativos");
    diagnosis.gargalos_criativos.forEach(p => lines.push(`- ${p}`));
    lines.push("");
  }
  if (diagnosis.sugestoes_arranjo?.length) {
    lines.push("## Sugestões de arranjo");
    diagnosis.sugestoes_arranjo.forEach(p => lines.push(`- ${p}`));
    lines.push("");
  }
  if (diagnosis.proximos_passos?.length) {
    lines.push("## Próximos passos");
    diagnosis.proximos_passos.forEach((p) => {
      const acao = typeof p === "string" ? p : p.acao;
      const prio = typeof p === "string" ? "" : ` _(prioridade: ${p.prioridade})_`;
      lines.push(`- ${acao}${prio}`);
    });
    lines.push("");
  }
  if (diagnosis.referencias_proximas?.length) {
    lines.push("## Referências próximas");
    diagnosis.referencias_proximas.forEach(ref => {
      lines.push(`- **${ref.artista}** — ${ref.similaridade}${ref.motivo ? ` — ${ref.motivo}` : ""}`);
    });
    lines.push("");
  }
  // Bloco "Vizinhos no catálogo" omitido do export (classificador interno / banco de referências em curadoria)

  return lines.join("\n");
}

interface GaugeConfig {
  label: string;
  value: number | null | undefined;
  unit: string;
  min: number;
  max: number;
  ideal: [number, number]; // faixa ideal
  format?: (v: number) => string;
}

function renderGaugeCanvas(cfg: GaugeConfig): string {
  const W = 360, H = 220;
  const canvas = document.createElement("canvas");
  canvas.width = W * 2; canvas.height = H * 2; // retina
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2, cy = H - 40, radius = 110;
  const startAngle = Math.PI, endAngle = 2 * Math.PI;
  const range = cfg.max - cfg.min;

  // arco base cinza
  ctx.lineWidth = 18;
  ctx.lineCap = "butt";
  ctx.strokeStyle = "#e5e7eb";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.stroke();

  // faixa ideal (verde)
  const idealStart = startAngle + ((cfg.ideal[0] - cfg.min) / range) * Math.PI;
  const idealEnd = startAngle + ((cfg.ideal[1] - cfg.min) / range) * Math.PI;
  ctx.strokeStyle = "#86efac";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, Math.max(idealStart, startAngle), Math.min(idealEnd, endAngle));
  ctx.stroke();

  // ponteiro
  if (cfg.value != null && Number.isFinite(cfg.value)) {
    const clamped = Math.max(cfg.min, Math.min(cfg.max, cfg.value));
    const angle = startAngle + ((clamped - cfg.min) / range) * Math.PI;
    const inIdeal = clamped >= cfg.ideal[0] && clamped <= cfg.ideal[1];
    const color = inIdeal ? "#16a34a" : (clamped < cfg.ideal[0] ? "#f59e0b" : "#dc2626");
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * (radius - 4), cy + Math.sin(angle) * (radius - 4));
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // labels min/max
  ctx.fillStyle = "#9ca3af";
  ctx.font = "11px Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(cfg.min), cx - radius, cy + 16);
  ctx.fillText(String(cfg.max), cx + radius, cy + 16);

  // valor central
  ctx.fillStyle = "#111827";
  ctx.font = "bold 28px Helvetica, Arial, sans-serif";
  const valTxt = cfg.value != null && Number.isFinite(cfg.value)
    ? (cfg.format ? cfg.format(cfg.value) : cfg.value.toFixed(1))
    : "—";
  ctx.fillText(`${valTxt} ${cfg.unit}`.trim(), cx, cy - 14);

  // título
  ctx.fillStyle = "#374151";
  ctx.font = "bold 13px Helvetica, Arial, sans-serif";
  ctx.fillText(cfg.label, cx, 24);

  // faixa ideal label
  ctx.fillStyle = "#6b7280";
  ctx.font = "10px Helvetica, Arial, sans-serif";
  ctx.fillText(`ideal: ${cfg.ideal[0]} a ${cfg.ideal[1]} ${cfg.unit}`.trim(), cx, cy + 32);

  return canvas.toDataURL("image/png");
}

async function downloadAnalysisReport(input: { name: string; references: string[]; notes?: string }, diagnosis: DiagnosisResult) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeText = (text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {}) => {
    const { size = 11, bold = false, color = [40, 40, 40], gap = 4 } = opts;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, maxW);
    for (const line of lines) {
      ensureSpace(size + gap);
      doc.text(line, margin, y);
      y += size + gap;
    }
  };

  const heading = (text: string) => {
    y += 8;
    ensureSpace(22);
    writeText(text, { size: 13, bold: true, color: [20, 20, 20], gap: 6 });
    doc.setDrawColor(220);
    doc.line(margin, y - 2, pageW - margin, y - 2);
    y += 6;
  };

  const bullet = (text: string) => {
    const lines = doc.splitTextToSize(text, maxW - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    lines.forEach((line: string, i: number) => {
      ensureSpace(15);
      if (i === 0) doc.text("•", margin, y);
      doc.text(line, margin + 14, y);
      y += 15;
    });
  };

  // Cabeçalho
  writeText("DNA Musical", { size: 20, bold: true, color: [20, 20, 20], gap: 6 });
  writeText(input.name, { size: 14, bold: true, color: [60, 60, 60], gap: 4 });
  writeText(`Gerado em ${new Date().toLocaleString("pt-BR")}`, { size: 9, color: [120, 120, 120], gap: 4 });
  if (input.references?.length) writeText(`Referências informadas: ${input.references.join(", ")}`, { size: 10, color: [80, 80, 80] });
  if (input.notes) writeText(`Notas: ${input.notes}`, { size: 10, color: [80, 80, 80] });

  heading("Resumo executivo");
  writeText(diagnosis.diagnostico_resumo || "—");

  const r = diagnosis.realAnalysis;
  const a = diagnosis.audioAnalysis;
  heading("Métricas técnicas");
  bullet(`LUFS integrado: ${r?.lufs_integrated ?? a?.lufs ?? "—"}`);
  bullet(`True Peak: ${r?.true_peak_dbtp ?? a?.truePeak ?? "—"} dBTP`);
  bullet(`Dynamic Range: ${r?.dynamic_range_lu ?? a?.dynamicRange ?? "—"} LU`);
  bullet(`BPM: ${r?.bpm ?? "—"}`);
  bullet(`Tom: ${r?.key ?? "—"}`);
  if (r?.duration_sec) bullet(`Duração: ${Math.floor(r.duration_sec / 60)}:${String(Math.round(r.duration_sec % 60)).padStart(2, "0")}`);

  // Gauges visuais
  const toNum = (v: unknown): number | undefined => {
    if (v == null) return undefined;
    const n = typeof v === "number" ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : undefined;
  };
  const lufsVal = toNum(r?.lufs_integrated ?? a?.lufs);
  const tpVal = toNum(r?.true_peak_dbtp ?? a?.truePeak);
  const drVal = toNum(r?.dynamic_range_lu ?? a?.dynamicRange);
  const gauges: GaugeConfig[] = [
    { label: "LUFS integrado", value: lufsVal, unit: "LUFS", min: -30, max: -6, ideal: [-16, -10] },
    { label: "True Peak", value: tpVal, unit: "dBTP", min: -6, max: 3, ideal: [-3, 0] },
    { label: "Dynamic Range", value: drVal, unit: "LU", min: 0, max: 20, ideal: [7, 14] },
  ];
  try {
    heading("Indicadores visuais");
    const gaugeW = (maxW - 12) / 3;
    const gaugeH = gaugeW * (220 / 360);
    ensureSpace(gaugeH + 6);
    gauges.forEach((g, i) => {
      try {
        const png = renderGaugeCanvas(g);
        doc.addImage(png, "PNG", margin + i * (gaugeW + 6), y, gaugeW, gaugeH);
      } catch (err) {
        console.error("[DNA PDF] gauge render failed", g.label, err);
      }
    });
    y += gaugeH + 8;
  } catch (err) {
    console.error("[DNA PDF] gauges section failed", err);
  }


  if (diagnosis.diagnostico_tecnico) {
    heading("Avaliação técnica");
    bullet(`LUFS — ${diagnosis.diagnostico_tecnico.lufs_avaliacao}`);
    bullet(`True Peak — ${diagnosis.diagnostico_tecnico.true_peak_avaliacao}`);
    bullet(`Dynamic Range — ${diagnosis.diagnostico_tecnico.dynamic_range_avaliacao}`);
    bullet(`Espectro — ${diagnosis.diagnostico_tecnico.espectro_avaliacao}`);
  }

  if (diagnosis.identidade) {
    heading("Identidade artística");
    bullet(`Mood: ${diagnosis.identidade.mood_principal}`);
    bullet(`Território sonoro: ${diagnosis.identidade.territorio_sonoro}`);
    bullet(`Persona do ouvinte: ${diagnosis.identidade.persona_ouvinte}`);
    if (diagnosis.identidade.tags?.length) bullet(`Tags: ${diagnosis.identidade.tags.join(", ")}`);
  }

  if (diagnosis.pontos_fortes?.length) {
    heading("Pontos fortes");
    diagnosis.pontos_fortes.forEach(bullet);
  }
  if (diagnosis.gargalos_criativos?.length) {
    heading("Gargalos criativos");
    diagnosis.gargalos_criativos.forEach(bullet);
  }
  if (diagnosis.sugestoes_arranjo?.length) {
    heading("Sugestões de arranjo");
    diagnosis.sugestoes_arranjo.forEach(bullet);
  }
  if (diagnosis.proximos_passos?.length) {
    heading("Próximos passos");
    diagnosis.proximos_passos.forEach((p) => {
      const acao = typeof p === "string" ? p : p.acao;
      const prio = typeof p === "string" ? "" : ` (prioridade: ${p.prioridade})`;
      bullet(`${acao}${prio}`);
    });
  }
  if (diagnosis.referencias_proximas?.length) {
    heading("Referências próximas");
    diagnosis.referencias_proximas.forEach((ref) => {
      bullet(`${ref.artista} — ${ref.similaridade}${ref.motivo ? ` — ${ref.motivo}` : ""}`);
    });
  }
  // Bloco "Vizinhos no catálogo" omitido do PDF (classificador interno / banco de referências em curadoria)


  const safeName = input.name.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60) || "dna-musical";
  doc.save(`dna-musical_${safeName}.pdf`);
  toast.success("Relatório PDF baixado");
}

// ── RESULT VIEW ──────────────────────────────────────────────────────────────

export function ResultView({ input, diagnosis, benchmark, onReset, onSave, isSaved, isSaving, savedAnalysisId, onEnsureSaved, projects }: {
  input: TrackInput | { name: string; notes?: string; references: string[]; projectId?: string; stage?: AudioStage };
  diagnosis: DiagnosisResult;
  benchmark?: MusicDnaBenchmark;
  savedAnalysisId?: string;
  onReset: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  isSaving?: boolean;
  onEnsureSaved?: () => Promise<string | undefined>;
  projects?: Array<{ id: string; name: string }>;
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [openNeighbor, setOpenNeighbor] = useState<CatalogNeighbor | null>(null);
  const { addTask } = useTasks();
  const stage: AudioStage = ((input as { stage?: AudioStage }).stage ?? "master");
  const stageProfile = STAGE_PROFILES[stage];
  const {
    identidade, diagnostico_tecnico, analise_seccoes,
    referencias_proximas, pontos_fortes, gargalos_criativos,
    sugestoes_arranjo, proximos_passos, diagnostico_resumo,
    distance, trackFeatures, refFeatures, audioAnalysis, realAnalysis, externalLookup,
    catalogNeighbors,
  } = diagnosis;
  const catalogTotal = diagnosis.catalogTotal ?? 0;
  const catalogGenreCount = diagnosis.catalogGenreCount ?? 0;
  const strictGenreUsed = diagnosis.strictGenreUsed ?? false;

  // Only show catalog neighbors that share the classified genre AND are close enough (≥55% similarity).
  // Cross-genre or low-similarity entries add noise without actionable insight.
  const classifiedGenreNorm = (diagnosis.genero_classificado ?? "").toLowerCase().trim();
  const relevantNeighbors = (catalogNeighbors ?? []).filter((n) => {
    if (n.similarity_score < 0.55) return false;
    const ng = (n.genre ?? "").toLowerCase().trim();
    return ng === classifiedGenreNorm || ng.includes(classifiedGenreNorm) || classifiedGenreNorm.includes(ng);
  });

  const fmt = (n: number | null | undefined, digits = 1) =>
    typeof n === "number" && Number.isFinite(n)
      ? n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })
      : "—";
  const fmtDelta = (a: number | null | undefined, b: number | null | undefined, digits = 1) => {
    if (typeof a !== "number" || !Number.isFinite(a) || typeof b !== "number" || !Number.isFinite(b)) return "—";
    const d = a - b;
    const sign = d > 0 ? "+" : d < 0 ? "−" : "±";
    return `${sign}${Math.abs(d).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
  };

  const formatDuration = (sec: number) =>
    `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

  const handleAddToTasks = async (description: string, key: string) => {
    const task = await addTask({
      description: `[DNA] ${description}`,
      source: "music-dna",
    });
    if (task) {
      setAddedItems(prev => new Set(prev).add(key));
      toast.success("Adicionado à lista de tarefas");
    }
  };

  const { send: sendSignal } = useAcceptanceSignal();
  const summaryVariant = (diagnosis.summaryVariant === "B" ? "B" : "A") as "A" | "B";

  const ensureSignal = async (signal: "thumbs_up" | "thumbs_down" | "copied" | "task_created") => {
    const id = savedAnalysisId ?? (await onEnsureSaved?.());
    if (id) sendSignal({ analysisId: id, variant: summaryVariant, signal });
  };


  // Sticky nav (~40px) + folga visual; evita que o título da seção fique escondido atrás da barra
  const jumpTo = (id: string) => {
    // Avisa Collapsibles (mobile) para abrirem antes do scroll
    window.dispatchEvent(new CustomEvent("dna:jump", { detail: { id } }));
    // Pequeno delay para o collapsible montar conteúdo antes de medir posição
    requestAnimationFrame(() => {
      scrollToAnchor(id, { extraOffset: 56 });
    });
  };
  const lufsValue = realAnalysis?.lufs_integrated ?? audioAnalysis?.lufs ?? null;
  const tpValue = realAnalysis?.true_peak_dbtp ?? audioAnalysis?.truePeak ?? null;
  const drValue = realAnalysis?.dynamic_range_lu ?? audioAnalysis?.dynamicRange ?? null;
  const bpmValue = realAnalysis?.bpm ?? null;
  const keyValue = realAnalysis?.key ?? null;
  const durationValue = realAnalysis ? formatDuration(realAnalysis.duration_sec) : null;

  // Só exibe itens com avaliação qualitativa real e acionável — MetricCards já mostram valores/alvos.
  // Heurística: rejeita textos curtos, genéricos ("ok", "dentro do alvo") ou sem verbo de ação/recomendação.
  const ACTIONABLE_RX = /\b(ajust|reduz|aument|considere|recomend|evite|use|adicion|comprim|equaliz|cort|atenu|reforc|suaviz|alvo|abaixo|acima|sugiro|sugere|precisa|deveria|pode|risco|atenção|cuidado|melhor)/i;
  const technicalItems = (diagnostico_tecnico ? [
    { label: "LUFS", help: "volume percebido em plataformas", text: diagnostico_tecnico.lufs_avaliacao },
    { label: "True Peak", help: "risco de distorção após compressão/streaming", text: diagnostico_tecnico.true_peak_avaliacao },
    { label: "Dynamic Range", help: "variação entre trechos suaves e fortes", text: diagnostico_tecnico.dynamic_range_avaliacao },
    { label: "Espectro", help: "brilho, presença e distribuição de frequências", text: diagnostico_tecnico.espectro_avaliacao },
  ] : []).filter((it) => {
    const t = typeof it.text === "string" ? it.text.trim() : "";
    return t.length >= 60 && ACTIONABLE_RX.test(t);
  });

  // Breadcrumb data
  const projectId = (input as { projectId?: string }).projectId;
  const projectName = projectId ? projects?.find((p) => p.id === projectId)?.name : undefined;
  const totalCompared = diagnosis.catalogTotalCompared ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap animate-slide-up">
        <div className="min-w-0">
          {projectId && (
            <Breadcrumb className="mb-2">
              <BreadcrumbList className="text-xs">
                <BreadcrumbItem>
                  <BreadcrumbLink
                    className="cursor-pointer hover:text-primary"
                    onClick={() => window.location.assign("/projects")}
                  >
                    Projetos
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink
                    className="cursor-pointer hover:text-primary truncate max-w-[200px] inline-block align-bottom"
                    onClick={() => window.location.assign(`/projects?id=${projectId}`)}
                  >
                    {projectName ?? "Projeto"}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>DNA Musical</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )}
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
            Diagnóstico
          </p>
          <h2 className="text-xl font-bold">{input.name}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {input.references.length > 0 && (
              <span className="text-xs text-foreground/75">
                {input.references.slice(0, 2).join(", ")}
              </span>
            )}
            {/* Badge "Fonte" removido — informação já vive no badge de confiança do Resumo Executivo */}

          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onReset} className="text-xs">
            ← Nova análise
          </Button>
        </div>
      </div>

      <ExecutiveSummary
        diagnosis={diagnosis}
        proximosPassos={proximos_passos ?? []}
        addedItems={addedItems}
        onAddStep={handleAddToTasks}
        analysisId={savedAnalysisId}
        onSendSignal={(signal) => ensureSignal(signal)}
        stage={stage}
      />

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] leading-relaxed text-foreground/80 animate-fade-in">
        <span className="font-mono uppercase tracking-widest text-primary mr-1.5">
          Estágio: {STAGE_LABEL[stage]}
        </span>
        <span className="text-muted-foreground">{stageProfile.contextNote}</span>
      </div>

      {diagnosis.classifierHint && (
        <GenreMismatchHint
          hint={diagnosis.classifierHint}
          declared={(input as { genre?: string }).genre ?? diagnosis.genero_classificado}
          analysisId={savedAnalysisId}
        />
      )}

      <div className="sticky top-2 z-20 -mx-1 flex gap-1.5 overflow-x-auto rounded-lg border border-border bg-background/95 p-1 backdrop-blur animate-fade-in">
        {[
          { label: "Resumo", id: "dna-resumo", show: true },
          { label: "Técnico", id: "dna-tecnico", show: true },
          { label: "Seções", id: "dna-secoes", show: !!analise_seccoes || (realAnalysis?.sections?.length ?? 0) > 0 },
          { label: "Diagnóstico", id: "dna-acoes", show: true },
          { label: "Identidade", id: "dna-identidade", show: true },
          { label: "Benchmark", id: "dna-referencias", show: true },
        ].filter((i) => i.show).map((item) => (
          <Button
            key={item.id}
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 text-[11px]"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              jumpTo(item.id);
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <DetailSection id="dna-tecnico" icon="🔬" title="Métricas e diagnóstico técnico">
        <div className="space-y-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 animate-fade-in">
            {stageProfile.enforceLufs && (
              <MetricCard
                label="LUFS" value={lufsValue} unit="LUFS"
                help="volume percebido em plataformas"
                target={{ min: -15, max: -13, ideal: -14 }}
                range={{ min: -30, max: -6 }}
              />
            )}
            {stageProfile.enforceTruePeak && (
              <MetricCard
                label="True Peak" value={tpValue} unit="dBTP"
                help="risco de distorção após streaming"
                target={{ min: -2, max: -1, ideal: -1 }}
                range={{ min: -6, max: 0 }}
              />
            )}
            <MetricCard
              label="DR" value={drValue} unit="LU"
              help={stageProfile.drMode === "strict" ? "variação suave/forte" : "variação dinâmica (referência)"}
              target={stageProfile.drMode === "strict"
                ? { min: 7, max: 12, ideal: 9 }
                : stageProfile.drMode === "soft"
                ? { min: 6, max: 14, ideal: 9 }
                : undefined}
              range={{ min: 2, max: 18 }}
            />

            <MetricCard
              label="BPM" value={bpmValue} unit=""
              help="pulso médio detectado"
              digits={0}
            />
            <Card className="text-center py-2.5 px-2 flex flex-col gap-1.5">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Tom</p>
              <p className="text-base font-bold text-primary leading-tight">{keyValue ?? "—"}</p>
              <p className="text-xs leading-tight text-foreground/70">centro tonal provável</p>
            </Card>
            <Card className="text-center py-2.5 px-2 flex flex-col gap-1.5">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Duração</p>
              <p className="text-base font-bold text-primary leading-tight">{durationValue ?? "—"}</p>
              <p className="text-xs leading-tight text-foreground/70">tempo total da faixa</p>
            </Card>
          </div>

          {diagnostico_tecnico && technicalItems.length > 0 && (
            <DiagCard icon="🔬" title="Diagnóstico Técnico" variant="primary">
              <div className="space-y-3">
                {technicalItems.map((item) => (
                  <div key={item.label} className="bg-muted/30 rounded-lg p-3 border-l-2 border-primary/30">
                    <div className="mb-1 flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-xs font-mono uppercase tracking-widest text-primary">{item.label}</p>
                      <p className="text-xs text-foreground/70">{item.help}</p>
                    </div>
                    <p className="text-xs leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </DiagCard>
          )}
        </div>
      </DetailSection>

      {(analise_seccoes || (realAnalysis?.sections && realAnalysis.sections.length > 0)) && (
        <DetailSection id="dna-secoes" icon="📊" title="Seções da faixa">
          <Card className="animate-fade-in">
            <CardHeader className="pb-2 px-4 pt-3">
              <CardTitle className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-primary">
                <span>📊</span> Seções da faixa
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {realAnalysis?.sections && realAnalysis.sections.length > 0 && (
                <div>
                  <div className="flex gap-0.5 h-6 rounded overflow-hidden">
                    {realAnalysis.sections.map((s, i) => {
                      const totalDuration = realAnalysis.duration_sec;
                      const width = ((s.end_sec - s.start_sec) / totalDuration) * 100;
                      const colors: Record<string, string> = {
                        intro: "bg-primary/20",
                        verse: "bg-sky-500/55",
                        pre_chorus: "bg-accent/40",
                        chorus: "bg-primary/80",
                        bridge: "bg-secondary/70",
                        outro: "bg-muted-foreground/30",
                      };
                      return (
                        <div
                          key={`seg-${s.start_sec}`}
                          className={cn("flex items-center justify-center text-[7px] font-mono text-foreground/80 uppercase", colors[s.label] || "bg-muted")}
                          style={{ width: `${width}%` }}
                          title={`${s.label} (${s.start_sec.toFixed(0)}s–${s.end_sec.toFixed(0)}s) · LUFS ${s.lufs} · E ${Math.round(s.energy * 100)}%`}
                        >
                          {width > 8 ? s.label.replace("_", " ") : ""}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 mt-2 flex-wrap">
                    {[
                      { label: "intro", color: "bg-primary/20" },
                      { label: "verse", color: "bg-sky-500/55" },
                      { label: "pre chorus", color: "bg-accent/40" },
                      { label: "chorus", color: "bg-primary/80" },
                      { label: "bridge", color: "bg-secondary/70" },
                      { label: "outro", color: "bg-muted-foreground/30" },
                    ].filter(l => realAnalysis.sections.some(s => s.label === l.label.replace(" ", "_")))
                      .map(l => (
                        <div key={l.label} className="flex items-center gap-1">
                          <div className={cn("w-2 h-2 rounded-sm", l.color)} />
                          <span className="text-[11px] font-mono uppercase text-muted-foreground">{l.label}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              {analise_seccoes && (
                <div className="space-y-2 pt-1">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                      Contraste Verso → Refrão
                    </p>
                    <p className="text-xs leading-relaxed">{analise_seccoes.contraste_verso_refrao}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                      <p className="text-[11px] font-mono uppercase tracking-widest text-primary mb-1">
                        Seção mais forte
                      </p>
                      <p className="text-xs leading-relaxed">{analise_seccoes.secao_mais_forte}</p>
                    </div>
                    <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/20">
                      <p className="text-[11px] font-mono uppercase tracking-widest text-destructive mb-1">
                        Seção mais fraca
                      </p>
                      <p className="text-xs leading-relaxed">{analise_seccoes.secao_mais_fraca}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </DetailSection>
      )}

      {/* DIAGNÓSTICO — após as métricas, o contexto para interpretar os dados já está estabelecido */}
      <section id="dna-acoes" className="scroll-mt-16 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DiagCard icon="✅" title="Pontos fortes" variant="success">
            <ul className="space-y-1.5">
              {(pontos_fortes ?? []).map((p, i) => (
                <li key={`pf-${i}`} className="flex gap-2 text-xs leading-relaxed">
                  <span className="text-primary shrink-0 font-bold">+</span> {p}
                </li>
              ))}
            </ul>
          </DiagCard>

          <DiagCard icon="⚠️" title="Gargalos criativos" variant="destructive">
            <ul className="space-y-1.5">
              {(gargalos_criativos ?? []).map((g, i) => (
                <li key={`gc-${i}`} className="flex gap-2 text-xs leading-relaxed">
                  <span className="text-destructive shrink-0 font-bold">!</span> {g}
                </li>
              ))}
            </ul>
          </DiagCard>
        </div>

        <DiagCard icon="🚀" title="Próximos passos de produção" variant="success">
          <div className="space-y-2">
            {(proximos_passos ?? []).map((p, i) => {
              const key = `passo-${i}`;
              const added = addedItems.has(key);
              return (
                <div key={key} className="flex gap-3 items-start bg-muted/20 rounded-lg p-3">
                  <PriorityBadge priority={p.prioridade} />
                  <div className="flex-1">
                    <p className="text-xs leading-relaxed">{p.acao}</p>
                    <p className="text-xs text-foreground/70 mt-1">
                      Impacto: {p.impacto}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-6 w-6 shrink-0", added ? "text-primary" : "text-muted-foreground hover:text-primary")}
                    onClick={() => !added && handleAddToTasks(p.acao, key)}
                    disabled={added}
                    title={added ? "Já adicionado" : "Adicionar à lista de tarefas"}
                  >
                    {added ? <Check className="h-3.5 w-3.5" /> : <ListPlus className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              );
            })}
          </div>
        </DiagCard>

        <DiagCard icon="🎛️" title="Sugestões de arranjo, timbragem e mix" variant="primary" aiBadge>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {(sugestoes_arranjo ?? []).map((s, i) => {
              const key = `arranjo-${i}`;
              const added = addedItems.has(key);
              return (
                <div key={key}
                  className="bg-muted/30 rounded-lg p-3 text-xs leading-relaxed border-l-2 border-primary/40 flex items-start gap-2">
                  <span className="flex-1">{s}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-6 w-6 shrink-0", added ? "text-primary" : "text-muted-foreground hover:text-primary")}
                    onClick={() => !added && handleAddToTasks(s, key)}
                    disabled={added}
                    title={added ? "Já adicionado" : "Adicionar à lista de tarefas"}
                  >
                    {added ? <Check className="h-3.5 w-3.5" /> : <ListPlus className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              );
            })}
          </div>
        </DiagCard>
      </section>

      {/* IDENTIDADE */}
      <section id="dna-identidade" className="scroll-mt-16">
        <DiagCard icon="🎭" title="Identidade da Faixa" variant="primary" aiBadge>
          <div className="space-y-3">
            <div>
              <p className="text-base font-bold">{identidade?.mood_principal}</p>
              <p className="text-xs text-foreground/75 mt-1 leading-relaxed">
                {identidade?.territorio_sonoro}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              {(identidade?.tags ?? []).map(tag => (
                <Badge key={tag} variant="outline"
                  className="text-xs font-mono bg-primary/10 border-primary/30 text-primary">
                  {tag}
                </Badge>
              ))}
              {identidade?.persona_ouvinte && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-6 px-2 text-[11px] gap-1 ml-1">
                      <User className="h-3 w-3" /> Ver perfil do ouvinte
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 text-xs space-y-2">
                    <p className="font-semibold text-primary text-[11px] uppercase tracking-wider">Persona do ouvinte</p>
                    <p className="leading-relaxed">{identidade.persona_ouvinte}</p>
                    <p className="text-[11px] text-muted-foreground border-t border-border pt-2 leading-relaxed">
                      Use isso ao escolher hashtags, pitch de playlist e direção visual da capa.
                    </p>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </DiagCard>
      </section>

      {/* BENCHMARK — only when a real genre-matched benchmark exists */}
      {benchmark && (
        <section id="dna-referencias" className="scroll-mt-16 space-y-4">
          <BenchmarkPanel diagnosis={diagnosis} benchmark={benchmark} />
        </section>
      )}

      {/* Perfil acústico (Radar + Bars vs GENRE_PRESETS) removido:
          os atributos estilo Spotify já são comparados em "Referências" via BenchmarkPanel
          contra o banco real (music_dna_benchmarks). refFeatures permanece no diagnosis
          para uso interno (acceptance signal, distância de catálogo). */}




      {/* AcousticMatchPanel removido do resultado: as referências unificadas (catálogo + IA) já cobrem o caso de uso. */}

      {/* PlaylistMatchCard — desativado temporariamente */}

      {realAnalysis && stageProfile.showCatalogNeighbors && relevantNeighbors.length > 0 && (
        <div className="grid gap-4 md:grid-cols-1">
          <CatalogNeighborsPanel
            neighbors={relevantNeighbors}
            totalCompared={diagnosis.catalogTotalCompared ?? diagnosis.catalogTotal}
            userTrack={{
              bpm: typeof realAnalysis.bpm === "number" ? realAnalysis.bpm : undefined,
              lufs: realAnalysis.lufs_integrated,
              energy: realAnalysis.energy,
              danceability: realAnalysis.danceability,
              dynamic_range: realAnalysis.dynamic_range_lu,
              spectral_centroid: realAnalysis.spectral_centroid_hz,
              key: (realAnalysis as { key_name?: string }).key_name,
            }}
          />
        </div>
      )}

      {/* Popularidade no Spotify */}
      <SpotifyPopularityCard
        spotifyTrackId={diagnosis.externalLookup?.spotify_id ?? null}
        genre={diagnosis.genero_classificado ?? null}
      />

      {/* Playlists Compatíveis (Spotify) — desativado temporariamente */}

      {savedAnalysisId && (
        <TrackVersionsPanel trackName={input.name} currentAnalysisId={savedAnalysisId} />
      )}

      {/* Monitoramentos Ativos */}
      <ActiveMonitorsCard />


      {/* Footer */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-lg bg-muted/20 border border-border flex-wrap">
        <p className="text-xs text-muted-foreground">
          Gerado pelo Assistente IA · Compartilhe com o produtor
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Cluster primário */}
          <div className="flex gap-2 flex-wrap items-center">
            {onSave && !isSaved && (
              <Button variant="default" size="sm" className="text-xs gap-1.5" onClick={onSave} disabled={isSaving}>
                <Save className="h-3 w-3" />
                {isSaving ? "Salvando…" : "Salvar análise"}
              </Button>
            )}
            {isSaved && (
              <span className="inline-flex items-center gap-1.5 text-xs text-primary px-3 py-1">
                <Check className="h-3 w-3" /> Salva
              </span>
            )}
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => downloadAnalysisReport(input, diagnosis)}>
              <Download className="h-3 w-3" />
              Baixar relatório
            </Button>

          </div>

          <Separator orientation="vertical" className="h-6 mx-1 hidden sm:block" />

          {/* Cluster secundário */}
          <div className="flex gap-2 flex-wrap items-center">
            <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => setFeedbackOpen(true)}>
              <MessageSquare className="h-3 w-3" />
              Ajustar análise
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={onReset}>
              Nova análise
            </Button>
          </div>
        </div>
      </div>

      <NeighborDetailDialog
        neighbor={openNeighbor}
        open={!!openNeighbor}
        onOpenChange={(open) => !open && setOpenNeighbor(null)}
        userTrack={{
          bpm: realAnalysis?.bpm ?? null,
          lufs: realAnalysis?.lufs_integrated ?? null,
          energy: realAnalysis?.energy ?? null,
          danceability: realAnalysis?.danceability ?? null,
          dynamic_range: realAnalysis?.dynamic_range_lu ?? null,
          key: realAnalysis?.key ?? null,
        }}
      />
      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} diagnosis={diagnosis} />
    </div>
  );
}
