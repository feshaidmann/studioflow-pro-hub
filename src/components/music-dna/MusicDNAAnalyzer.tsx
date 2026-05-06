import { useState, useRef, useCallback, useEffect } from "react";
import { FeedbackModal } from "./FeedbackModal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Radar, RadarChart, PolarAngleAxis,
  ResponsiveContainer, Legend,
} from "recharts";
import { Upload, X, FileAudio, Music, MessageSquare, ListPlus, Check, Save, Trash2, History, Palette, ArrowRight, FolderKanban, Download, CheckCircle2, AlertTriangle, XCircle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProjects } from "@/contexts/ProjectContext";
import { useTasks } from "@/hooks/useTasks";
import { toast } from "sonner";
import {
  useSavedAnalyses, cacheLastAnalysis, getCachedAnalysis, clearCachedAnalysis,
  type SavedAnalysis,
} from "@/hooks/useSavedAnalyses";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { cn } from "@/lib/utils";
import { scrollToAnchor } from "@/lib/scrollToAnchor";
import { LufsCompatibility } from "@/components/music-dna/LufsCompatibility";
import { useMusicDnaBenchmarks, findBenchmarkForGenre } from "@/hooks/useMusicDnaBenchmarks";
import { spotifyFeaturesFromDiagnosis, FEATURE_DESCRIPTIONS, type MusicDnaBenchmark, type SpotifyFeatures } from "@/types/musicDna";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NeighborDetailDialog } from "@/components/music-dna/NeighborDetailDialog";
import { AcousticMatchPanel } from "@/components/music-dna/AcousticMatchPanel";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import {
  useMusicDNA,
  FEATURE_KEYS, FEATURE_LABELS,
  GENRE_PRESETS, calcDistance,
  toRadarData,
  type TrackInput, type Genre,
  type DiagnosisResult, type AudioFeatures, type CatalogNeighbor,
} from "@/hooks/useMusicDNA";

// ── ZOD SCHEMA ───────────────────────────────────────────────────────────────

const ACCEPTED_AUDIO = [
  "audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3",
  "audio/ogg", "audio/flac", "audio/aac", "audio/x-m4a", "audio/mp4",
];

const formSchema = z.object({
  name: z.string().min(1, "Nome da faixa é obrigatório"),
  references: z.array(z.string()).max(5),
  notes: z.string().optional(),
  projectId: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

// ── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function AcousticRadar({ trackFeatures, refFeatures }: {
  trackFeatures: AudioFeatures;
  refFeatures: AudioFeatures;
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={toRadarData(trackFeatures, refFeatures)}
        margin={{ top: 16, right: 30, bottom: 16, left: 30 }}>
        <PolarAngleAxis dataKey="subject"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
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
          wrapperStyle={{ fontSize: 11,
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

function BenchmarkPanel({ diagnosis, benchmark }: { diagnosis: DiagnosisResult; benchmark?: MusicDnaBenchmark }) {
  const features = spotifyFeaturesFromDiagnosis(diagnosis);
  const benchmarkSource = benchmark ? "Banco público" : "Preset local";
  const benchmarkLabel = benchmark ? benchmark.genero : diagnosis.genero_classificado || "Média geral";
  const benchmarkCount = benchmark?.total_faixas ? `${benchmark.total_faixas} faixas` : "Fallback acústico";
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
            </div>
            <div className="rounded-lg bg-muted/30 border border-border p-3">
              <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Benchmark</p>
              <p className="text-sm font-semibold">{benchmarkLabel} · {benchmarkCount}</p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            As referências artísticas completas ficam ocultas; a IA recebe apenas um recorte técnico relevante e exibe aqui no relatório os 3–5 artistas mais próximos.
          </p>
          <LufsCompatibility lufs={diagnosis.realAnalysis.lufs_integrated} />
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

function DiagCard({ icon, title, variant = "default", children }: {
  icon: string; title: string;
  variant?: "primary" | "success" | "destructive" | "default";
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
        <CardTitle className={cn(
          "flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider", color
        )}>
          <span>{icon}</span>{title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">{children}</CardContent>
    </Card>
  );
}

function DetailSection({ id, title, icon, children }: {
  id: string;
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (detail?.id === id) setOpen(true);
    };
    window.addEventListener("dna:jump", handler);
    return () => window.removeEventListener("dna:jump", handler);
  }, [id]);
  return (
    <section id={id} className="scroll-mt-16">
      <Collapsible open={open} onOpenChange={setOpen} className="md:hidden rounded-lg border border-border bg-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-2"><span>{icon}</span>{title}</span>
          <span className="text-primary">{open ? "−" : "+"}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4">
          {children}
        </CollapsibleContent>
      </Collapsible>
      <div className="hidden md:block">{children}</div>
    </section>
  );
}

function ExecutiveSummary({ diagnosis, onAddAllSteps, allStepsAdded }: {
  diagnosis: DiagnosisResult;
  onAddAllSteps: () => void;
  allStepsAdded: boolean;
}) {
  const truePeak = diagnosis.realAnalysis?.true_peak_dbtp;
  const lufs = diagnosis.realAnalysis?.lufs_integrated;
  const dynamicRange = diagnosis.realAnalysis?.dynamic_range_lu;
  const duration = diagnosis.realAnalysis?.duration_sec;
  const hasCoreMetrics = [truePeak, lufs, dynamicRange].every(
    (v) => typeof v === "number" && Number.isFinite(v),
  );

  const primaryStrength = diagnosis.pontos_fortes?.[0] ?? "A faixa já apresenta uma identidade sonora reconhecível.";
  const mainBottleneck = diagnosis.gargalos_criativos?.[0] ?? "Vale refinar o contraste entre seções antes da finalização.";
  const nextAction = diagnosis.proximos_passos?.[0]?.acao ?? diagnosis.sugestoes_arranjo?.[0] ?? "Revisar mix e arranjo com foco no ponto mais sensível do diagnóstico.";

  // Status só vira "Pronta" se TODAS as métricas críticas existem e estão dentro do alvo
  const status = !hasCoreMetrics
    ? { label: "Análise incompleta", tone: "warning" as const }
    : (truePeak as number) <= 0 && (lufs as number) >= -16 && (lufs as number) <= -10 && (dynamicRange as number) >= 7
    ? { label: "Pronta para streaming", tone: "success" as const }
    : (truePeak as number) > 0 || (dynamicRange as number) < 5
    ? { label: "Precisa revisão técnica", tone: "destructive" as const }
    : { label: "Boa base, precisa ajustes", tone: "primary" as const };

  const toneClass = {
    success: "bg-primary/10 text-primary border-primary/30",
    destructive: "bg-destructive/10 text-destructive border-destructive/30",
    primary: "bg-primary/10 text-primary border-primary/30",
    warning: "bg-amber-100 text-amber-800 border-amber-300",
  }[status.tone];

  // Confiança da análise
  const totalCompared = diagnosis.catalogTotalCompared ?? 0;
  const formatDuration = (sec: number) =>
    `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
  const stepsCount = diagnosis.proximos_passos?.length ?? 0;

  return (
    <section id="dna-resumo" className="scroll-mt-16">
      <Card className="border-l-4 border-l-primary animate-fade-in">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-primary mb-1">Resumo executivo</p>
              <p className="text-sm leading-relaxed">{diagnosis.diagnostico_resumo}</p>
            </div>
            <Badge variant="outline" className={cn("text-[11px] font-mono uppercase tracking-wider", toneClass)}>
              {status.label}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {[
              { label: "Força principal", text: primaryStrength },
              { label: "Gargalo principal", text: mainBottleneck },
              { label: "Próxima ação", text: nextAction },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-muted/30 border border-border p-3">
                <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-1">{item.label}</p>
                <p className="text-sm leading-relaxed text-foreground/85">{item.text}</p>
              </div>
            ))}
          </div>

          {/* CTA primário + chips de confiança */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/60">
            <div className="flex flex-wrap gap-1.5">
              {totalCompared > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 border border-border px-2 py-0.5 text-[11px] font-mono text-foreground/70">
                  Catálogo: {totalCompared.toLocaleString("pt-BR")} faixas
                </span>
              )}
              {typeof duration === "number" && Number.isFinite(duration) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 border border-border px-2 py-0.5 text-[11px] font-mono text-foreground/70">
                  Trecho: 0:00–{formatDuration(duration)}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 border border-border px-2 py-0.5 text-[11px] font-mono text-foreground/70">
                {hasCoreMetrics ? "Métricas globais OK" : "Métricas globais parciais"}
              </span>
            </div>
            {stepsCount > 0 && (
              <Button
                size="sm"
                onClick={onAddAllSteps}
                disabled={allStepsAdded}
                className="text-xs gap-1.5"
              >
                {allStepsAdded ? (
                  <><Check className="h-3.5 w-3.5" /> {stepsCount} ações adicionadas</>
                ) : (
                  <><ListPlus className="h-3.5 w-3.5" /> Adicionar {stepsCount} ações ao checklist</>
                )}
              </Button>
            )}
          </div>
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
      <p className="text-[11px] leading-tight text-foreground/70">{help}</p>
    </Card>
  );
}
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildAnalysisMarkdown(input: { name: string; references: string[]; notes?: string }, diagnosis: DiagnosisResult): string {
  const r = diagnosis.realAnalysis;
  const a = diagnosis.audioAnalysis;
  const lines: string[] = [];
  lines.push(`# DNA Musical — ${input.name}`);
  lines.push("");
  lines.push(`_Gerado em ${new Date().toLocaleString("pt-BR")}_`);
  lines.push("");
  if (diagnosis.genero_classificado) lines.push(`**Gênero classificado:** ${diagnosis.genero_classificado}`);
  if (input.references?.length) lines.push(`**Referências informadas:** ${input.references.join(", ")}`);
  if (input.notes) lines.push(`**Notas:** ${input.notes}`);
  lines.push("");
  lines.push("## Resumo executivo");
  lines.push(diagnosis.diagnostico_resumo || "—");
  lines.push("");
  lines.push("## Métricas técnicas");
  lines.push(`- LUFS integrado: ${r?.lufs_integrated ?? a?.lufs ?? "—"}`);
  lines.push(`- True Peak: ${r?.true_peak_dbtp ?? a?.truePeak ?? "—"} dBTP`);
  lines.push(`- Dynamic Range: ${r?.dynamic_range_lu ?? a?.dynamicRange ?? "—"} LU`);
  lines.push(`- BPM: ${r?.bpm ?? "—"}`);
  lines.push(`- Tom: ${r?.key ?? "—"}`);
  if (r?.duration_sec) lines.push(`- Duração: ${Math.floor(r.duration_sec / 60)}:${String(Math.round(r.duration_sec % 60)).padStart(2, "0")}`);
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
  if (diagnosis.catalogNeighbors?.length) {
    lines.push("## Vizinhos no catálogo (referência interna)");
    diagnosis.catalogNeighbors.forEach(n => {
      const sim = Math.round((Number(n.similarity_score) || 0) * 100);
      const tom = n.key_name ? ` — ${n.key_name}${n.mode ? ` ${n.mode}` : ""}` : "";
      lines.push(`- **${n.band}** (${n.filename}) — ${sim}%${tom} — BPM ${n.tempo_bpm ?? "—"} · LUFS ${n.lufs_integrated ?? "—"}`);
    });
    lines.push("");
  }
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
  if (diagnosis.genero_classificado) writeText(`Gênero classificado: ${diagnosis.genero_classificado}`, { size: 10, color: [80, 80, 80] });
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
  if (diagnosis.catalogNeighbors?.length) {
    heading("Vizinhos no catálogo de referência");
    diagnosis.catalogNeighbors.forEach((n) => {
      const sim = Math.round((Number(n.similarity_score) || 0) * 100);
      const tom = n.key_name ? ` — ${n.key_name}${n.mode ? ` ${n.mode}` : ""}` : "";
      bullet(`${n.band} (${n.filename}) — ${sim}%${tom} — BPM ${n.tempo_bpm ?? "—"} · LUFS ${n.lufs_integrated ?? "—"}`);
    });
  }

  const safeName = input.name.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60) || "dna-musical";
  doc.save(`dna-musical_${safeName}.pdf`);
  toast.success("Relatório PDF baixado");
}

function FormView({ onSubmit, isPending, projects }: {
  onSubmit: (v: FormValues, file: File) => void;
  isPending: boolean;
  projects: Array<{ id: string; name: string; artist: string }>;
}) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      references: [], notes: "", projectId: "",
    },
  });


  const handleFile = useCallback((file: File) => {
    setFileError(null);
    if (!ACCEPTED_AUDIO.includes(file.type) && !file.name.match(/\.(wav|mp3|ogg|flac|aac|m4a)$/i)) {
      setFileError("Formato não suportado. Use WAV, MP3, OGG, FLAC ou AAC.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setFileError("Arquivo muito grande. Máximo 50 MB.");
      return;
    }
    setAudioFile(file);
    if (!form.getValues("name")) {
      const nameFromFile = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
      form.setValue("name", nameFromFile);
    }
  }, [form]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFormSubmit = (values: FormValues) => {
    if (!audioFile) {
      setFileError("Selecione um arquivo de áudio");
      return;
    }
    onSubmit(values, audioFile);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Upload zone */}
        <Card className="animate-slide-up">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-primary">
              🎵  Arquivo de áudio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!audioFile ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                  isDragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                )}
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium">
                    Arraste seu arquivo ou clique para selecionar
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    WAV, MP3, OGG, FLAC, AAC — até 50 MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".wav,.mp3,.ogg,.flac,.aac,.m4a"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                <FileAudio className="h-8 w-8 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{audioFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(audioFile.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => { setAudioFile(null); setFileError(null); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            {fileError && (
              <p className="text-xs text-destructive mt-2">{fileError}</p>
            )}
          </CardContent>
        </Card>

        {/* Track info */}
        <Card className="animate-slide-up [animation-delay:0.03s]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-primary">
              📋  Detalhes da faixa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] uppercase tracking-widest font-mono text-muted-foreground">
                  Nome da faixa *
                </FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Maré Alta — versão demo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="projectId" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] uppercase tracking-widest font-mono text-muted-foreground">
                  Vincular a um projeto (opcional)
                </FormLabel>
                <Select
                  value={field.value || "__none__"}
                  onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sem projeto vinculado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">Sem projeto vinculado</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}{p.artist ? ` — ${p.artist}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <Collapsible>
              <CollapsibleTrigger className="text-[11px] uppercase tracking-widest font-mono text-muted-foreground hover:text-foreground transition-colors">
                + Notas adicionais (opcional)
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: Verso com violão e voz, refrão quer explodir mas não sobe o suficiente…"
                        className="resize-none min-h-[68px]"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )} />
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        <div className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground leading-relaxed animate-fade-in">
          <span className="text-primary shrink-0 mt-0.5">ℹ</span>
          <span>
            O sistema analisa o áudio real (LUFS, True Peak, Dynamic Range, BPM, Tom, Espectro),
            detecta seções e calcula features acústicas. A IA gera diagnóstico técnico e sugestões de produção.
          </span>
        </div>

        <Button type="submit" disabled={isPending} className="w-full font-semibold animate-scale-in">
          {isPending ? "Analisando…" : "Analisar DNA Musical →"}
        </Button>
      </form>
    </Form>
  );
}

// ── LOADING VIEW ─────────────────────────────────────────────────────────────

function LoadingView({ trackName, logs, progress }: {
  trackName: string; logs: string[]; progress: number;
}) {
  return (
    <div className="space-y-6 py-4 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="text-4xl">🧬</div>
        <h3 className="text-lg font-bold">Analisando "{trackName}"</h3>
        <p className="text-sm text-muted-foreground">
          Web Audio · AcousticBrainz/Deezer · Atributos Spotify · Diagnóstico IA
        </p>
      </div>
      <Progress value={progress} className="h-1" />
      <Card>
        <CardContent className="p-4 space-y-1">
          {logs.length === 0 && <p className="text-xs text-muted-foreground">Iniciando…</p>}
          {logs.map((log, i) => (
            <div key={i} className={cn(
              "flex items-center gap-2 text-xs py-1.5",
              i < logs.length - 1
                ? "text-muted-foreground border-b border-border"
                : "text-foreground font-medium"
            )}>
              {i === logs.length - 1 && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              )}
              {log}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── RESULT VIEW ──────────────────────────────────────────────────────────────

function ResultView({ input, diagnosis, benchmark, onReset, onSave, isSaved, isSaving, savedAnalysisId, projects }: {
  input: TrackInput | { name: string; notes?: string; references: string[]; projectId?: string };
  diagnosis: DiagnosisResult;
  benchmark?: MusicDnaBenchmark;
  savedAnalysisId?: string;
  onReset: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  isSaving?: boolean;
  projects?: Array<{ id: string; name: string }>;
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [allStepsAdded, setAllStepsAdded] = useState(false);
  const [openNeighbor, setOpenNeighbor] = useState<CatalogNeighbor | null>(null);
  const { addTask } = useTasks();
  const {
    identidade, diagnostico_tecnico, analise_seccoes,
    referencias_proximas, pontos_fortes, gargalos_criativos,
    sugestoes_arranjo, proximos_passos, diagnostico_resumo,
    distance, trackFeatures, refFeatures, audioAnalysis, realAnalysis, externalLookup,
    catalogNeighbors,
  } = diagnosis;

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

  const handleAddAllSteps = async () => {
    const steps = proximos_passos ?? [];
    let count = 0;
    for (let i = 0; i < steps.length; i++) {
      const key = `passo-${i}`;
      if (addedItems.has(key)) continue;
      const task = await addTask({ description: `[DNA] ${steps[i].acao}`, source: "music-dna" });
      if (task) { setAddedItems(prev => new Set(prev).add(key)); count++; }
    }
    setAllStepsAdded(true);
    if (count > 0) toast.success(`${count} ações adicionadas ao checklist`);
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

  const technicalItems = diagnostico_tecnico ? [
    { label: "LUFS", help: "volume percebido em plataformas", text: diagnostico_tecnico.lufs_avaliacao },
    { label: "True Peak", help: "risco de distorção após compressão/streaming", text: diagnostico_tecnico.true_peak_avaliacao },
    { label: "Dynamic Range", help: "variação entre trechos suaves e fortes", text: diagnostico_tecnico.dynamic_range_avaliacao },
    { label: "Espectro", help: "brilho, presença e distribuição de frequências", text: diagnostico_tecnico.espectro_avaliacao },
  ] : [];

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
            <Badge variant="outline" className="text-xs font-mono bg-primary/10 border-primary/30 text-primary">
              {diagnosis.genero_classificado || "Gênero não classificado"}
            </Badge>
            {input.references.length > 0 && (
              <span className="text-xs text-foreground/75">
                {input.references.slice(0, 2).join(", ")}
              </span>
            )}
            <Badge variant="outline" className="text-xs font-mono bg-muted/30 border-border text-foreground/75">
              Fonte: {externalLookup?.fonte ?? "web_audio"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CompatibilityBadge result={diagnosis} />
          <Button variant="outline" size="sm" onClick={onReset} className="text-xs">
            ← Nova análise
          </Button>
        </div>
      </div>

      <ExecutiveSummary diagnosis={diagnosis} onAddAllSteps={handleAddAllSteps} allStepsAdded={allStepsAdded} />

      <NextStepsBar diagnosis={diagnosis} input={input} isSaved={!!isSaved} savedAnalysisId={savedAnalysisId} />

      <div className="sticky top-2 z-20 -mx-1 flex gap-1.5 overflow-x-auto rounded-lg border border-border bg-background/95 p-1 backdrop-blur animate-fade-in">
        {[
          { label: "Resumo", id: "dna-resumo" },
          { label: "Identidade", id: "dna-identidade" },
          { label: "Ações", id: "dna-acoes" },
          { label: "Referências", id: "dna-referencias" },
          { label: "Técnico", id: "dna-tecnico" },
        ].map((item) => (
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

      {/* IDENTIDADE — promovida para logo após o resumo */}
      <section id="dna-identidade" className="scroll-mt-16">
        <DiagCard icon="🎭" title="Identidade da Faixa" variant="primary">
          <div className="space-y-3">
            <div>
              <p className="text-base font-bold">{identidade?.mood_principal}</p>
              <p className="text-xs text-foreground/75 mt-1 leading-relaxed">
                {identidade?.territorio_sonoro}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(identidade?.tags ?? []).map(tag => (
                <Badge key={tag} variant="outline"
                  className="text-xs font-mono bg-primary/10 border-primary/30 text-primary">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="rounded-md bg-muted/30 p-2.5 text-xs text-foreground/75 leading-relaxed">
              <span className="text-primary">🎧 Ouvinte: </span>
              {identidade?.persona_ouvinte}
            </div>
          </div>
        </DiagCard>
      </section>

      <section id="dna-acoes" className="scroll-mt-16 space-y-4">
        <DiagCard icon="🚀" title="Próximos passos de produção" variant="success">
          <div className="space-y-2">
            {(proximos_passos ?? []).map((p, i) => {
              const key = `passo-${i}`;
              const added = addedItems.has(key);
              return (
                <div key={i} className="flex gap-3 items-start bg-muted/20 rounded-lg p-3">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DiagCard icon="✅" title="Pontos fortes" variant="success">
            <ul className="space-y-1.5">
              {(pontos_fortes ?? []).map((p, i) => (
                <li key={i} className="flex gap-2 text-xs leading-relaxed">
                  <span className="text-primary shrink-0 font-bold">+</span> {p}
                </li>
              ))}
            </ul>
          </DiagCard>

          <DiagCard icon="⚠️" title="Gargalos criativos" variant="destructive">
            <ul className="space-y-1.5">
              {(gargalos_criativos ?? []).map((g, i) => (
                <li key={i} className="flex gap-2 text-xs leading-relaxed">
                  <span className="text-destructive shrink-0 font-bold">!</span> {g}
                </li>
              ))}
            </ul>
          </DiagCard>
        </div>

        <DiagCard icon="🎛️" title="Sugestões de arranjo, timbragem e mix" variant="primary">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {(sugestoes_arranjo ?? []).map((s, i) => {
              const key = `arranjo-${i}`;
              const added = addedItems.has(key);
              return (
                <div key={i}
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

      {/* REFERÊNCIAS — unificadas em Tabs (Catálogo Real + Sugestões IA) */}
      <section id="dna-referencias" className="scroll-mt-16 space-y-4">
        <DiagCard icon="🔗" title="Referências mais próximas">
          <Tabs defaultValue={catalogNeighbors && catalogNeighbors.length > 0 ? "catalogo" : "ia"} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="catalogo" className="text-xs">
                Catálogo Real
                {catalogNeighbors && catalogNeighbors.length > 0 && (
                  <span className="ml-1.5 text-foreground/60">({catalogNeighbors.length})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="ia" className="text-xs">
                Sugestões IA
                {referencias_proximas && referencias_proximas.length > 0 && (
                  <span className="ml-1.5 text-foreground/60">({referencias_proximas.length})</span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="catalogo" className="space-y-2 mt-3">
              <p className="rounded-md bg-muted/30 p-2.5 text-xs text-foreground/75 leading-relaxed">
                Comparação técnica calibrada (LUFS, dinâmica, espectro, ritmo e atributos perceptivos) contra o catálogo interno. <strong>Não é identificação por fingerprint</strong> — extratores diferentes (browser vs. catálogo) podem deslocar BPM, tom e energia, então o ranking é uma aproximação técnica.
                {totalCompared > 0 && <> Comparado contra <strong>{totalCompared}</strong> faixas. Clique em uma para o detalhe.</>}
              </p>
              {(() => {
                const topSim = catalogNeighbors && catalogNeighbors.length > 0
                  ? Math.round((Number(catalogNeighbors[0].similarity_score) || 0) * 100)
                  : 0;
                if (catalogNeighbors && catalogNeighbors.length > 0 && topSim < 55) {
                  return (
                    <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-amber-800 leading-relaxed">
                      Confiança baixa: nenhuma faixa do catálogo ficou tecnicamente muito próxima desta. Trate as referências abaixo como aproximações.
                    </p>
                  );
                }
                return null;
              })()}
              {(!catalogNeighbors || catalogNeighbors.length === 0) && (
                <p className="text-xs text-foreground/70 py-3 text-center">Nenhum vizinho técnico encontrado no catálogo.</p>
              )}
              {catalogNeighbors && catalogNeighbors.map((n, i) => {
                const sim = Math.round((Number(n.similarity_score) || 0) * 100);
                const simColor = sim >= 80 ? "text-primary" : sim >= 55 ? "text-amber-700" : "text-foreground/60";
                return (
                  <button
                    type="button"
                    key={`${n.band}-${n.filename}-${i}`}
                    onClick={() => setOpenNeighbor(n)}
                    className={cn(
                      "w-full text-left flex flex-col gap-1 py-2 px-2 -mx-2 rounded-md text-xs transition-colors hover:bg-muted/40",
                      i < catalogNeighbors.length - 1 && "border-b border-border",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{n.band}</p>
                        <p className="text-xs text-foreground/70 truncate">{n.filename}</p>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className={cn("font-mono text-sm", simColor)}>{sim}%</span>
                        {n.genre && (
                          <span className="text-xs text-foreground/70 uppercase tracking-wide">{n.genre}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs font-mono text-foreground/70">
                      <span>BPM {fmt(n.tempo_bpm, 0)} <span className="text-primary/70">({fmtDelta(n.tempo_bpm, realAnalysis?.bpm, 0)})</span></span>
                      <span>LUFS {fmt(n.lufs_integrated)} <span className="text-primary/70">({fmtDelta(n.lufs_integrated, realAnalysis?.lufs_integrated)})</span></span>
                      <span>DR {fmt(n.dynamic_range_db)} LU</span>
                      {n.key_name && <span>Tom {n.key_name}{n.mode ? ` ${n.mode}` : ""}</span>}
                    </div>
                  </button>
                );
              })}
            </TabsContent>

            <TabsContent value="ia" className="space-y-2 mt-3">
              <p className="rounded-md bg-muted/30 p-2.5 text-xs text-foreground/75 leading-relaxed">
                Sugestões da IA com base em proximidade técnica/sonora. Não são recomendações para copiar estética.
              </p>
              {(!referencias_proximas || referencias_proximas.length === 0) && (
                <p className="text-xs text-foreground/70 py-3 text-center">Nenhuma sugestão gerada.</p>
              )}
              {(referencias_proximas ?? []).map((r, i) => (
                <div key={i} className={cn(
                  "flex justify-between items-start gap-3 py-2 text-xs",
                  i < (referencias_proximas?.length ?? 0) - 1 && "border-b border-border"
                )}>
                  <div>
                    <p className="font-semibold">{r.artista}</p>
                    <p className="text-foreground/75 mt-0.5">{r.motivo}</p>
                  </div>
                  <span className="font-mono text-primary shrink-0">{r.similaridade}</span>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </DiagCard>

        <BenchmarkPanel diagnosis={diagnosis} benchmark={benchmark} />
      </section>

      <DetailSection id="dna-tecnico" icon="🔬" title="Métricas e diagnóstico técnico">
        <div className="space-y-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 animate-fade-in">
            <MetricCard
              label="LUFS" value={lufsValue} unit="LUFS"
              help="volume percebido em plataformas"
              target={{ min: -15, max: -13, ideal: -14 }}
              range={{ min: -30, max: -6 }}
            />
            <MetricCard
              label="True Peak" value={tpValue} unit="dBTP"
              help="risco de distorção após streaming"
              target={{ min: -2, max: -1, ideal: -1 }}
              range={{ min: -6, max: 0 }}
            />
            <MetricCard
              label="DR" value={drValue} unit="LU"
              help="variação suave/forte"
              target={{ min: 7, max: 12, ideal: 9 }}
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

          {diagnostico_tecnico && (
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

      {analise_seccoes && (
        <DetailSection id="dna-secoes" icon="📊" title="Análise de seções">
          <DiagCard icon="📊" title="Análise de Seções" variant="default">
            <div className="space-y-3">
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
          </DiagCard>
        </DetailSection>
      )}

      <DetailSection id="dna-perfil" icon="📡" title="Perfil acústico">
        <Card className="animate-scale-in">
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-primary">
              <span>📡</span> Perfil Acústico
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <AcousticRadar trackFeatures={trackFeatures} refFeatures={refFeatures} />
              <div className="space-y-2.5">
                {FEATURE_KEYS.map(k => (
                  <FeatureBar key={k} label={FEATURE_LABELS[k]}
                    value={trackFeatures[k]} refValue={refFeatures[k]} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </DetailSection>

      {realAnalysis?.sections && realAnalysis.sections.length > 0 && (
        <DetailSection id="dna-timeline" icon="🎬" title="Timeline de seções">
          <Card className="animate-fade-in">
            <CardHeader className="pb-2 px-4 pt-3">
              <CardTitle className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                <span>🎬</span> Timeline de Seções
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex gap-0.5 h-6 rounded overflow-hidden">
                {realAnalysis.sections.map((s, i) => {
                  const totalDuration = realAnalysis.duration_sec;
                  const width = ((s.end_sec - s.start_sec) / totalDuration) * 100;
                  const colors: Record<string, string> = {
                    intro: "bg-primary/20",
                    verse: "bg-primary/40",
                    pre_chorus: "bg-accent/40",
                    chorus: "bg-primary/80",
                    bridge: "bg-secondary/70",
                    outro: "bg-muted-foreground/30",
                  };
                  return (
                    <div
                      key={i}
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
                  { label: "verse", color: "bg-primary/40" },
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
            </CardContent>
          </Card>
        </DetailSection>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-lg bg-muted/20 border border-border flex-wrap">
        <p className="text-xs text-muted-foreground">
          Gerado pelo Assistente IA · Compartilhe com o produtor
        </p>
        <div className="flex gap-2 flex-wrap">
          {onSave && !isSaved && (
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={onSave} disabled={isSaving}>
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
          <CreateArtButton isSaved={isSaved} savedAnalysisId={savedAnalysisId} />
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setFeedbackOpen(true)}>
            <MessageSquare className="h-3 w-3" />
            Ajustar análise
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={onReset}>
            Nova análise
          </Button>
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

// ── NEXT STEPS BAR ───────────────────────────────────────────────────────────

function NextStepsBar({
  diagnosis,
  input,
  isSaved,
  savedAnalysisId,
}: {
  diagnosis: DiagnosisResult;
  input: TrackInput | { name: string; notes?: string; references: string[]; projectId?: string };
  isSaved: boolean;
  savedAnalysisId?: string;
}) {
  const navigate = useNavigate();
  const projectId = (input as { projectId?: string }).projectId;
  const dnaParam = isSaved && savedAnalysisId ? savedAnalysisId : "session";
  const genre = diagnosis.genero_classificado || "";
  const trackTitle = encodeURIComponent(input.name || "");

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 animate-fade-in">
      <p className="text-[11px] font-mono uppercase tracking-widest text-primary mb-2">
        Próximos passos
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs bg-background"
          onClick={() => navigate(`/criativo?dna=${dnaParam}`)}
        >
          <Palette className="h-3.5 w-3.5" /> Gerar capa com este DNA
        </Button>
        {projectId && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs bg-background"
            onClick={() => navigate(`/projects/${projectId}`)}
          >
            <FolderKanban className="h-3.5 w-3.5" /> Voltar ao projeto
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── CREATE ART BUTTON ────────────────────────────────────────────────────────

function CreateArtButton({ isSaved, savedAnalysisId }: { isSaved: boolean; savedAnalysisId?: string }) {
  const navigate = useNavigate();
  const handleClick = () => {
    const dnaParam = isSaved && savedAnalysisId ? savedAnalysisId : "session";
    navigate(`/criativo?dna=${dnaParam}`);
  };
  return (
    <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleClick}>
      <Palette className="h-3 w-3" />
      🎨 Criar arte com este DNA
    </Button>
  );
}

// ── SAVED ANALYSES LIST ──────────────────────────────────────────────────────

function SavedAnalysesList({ onLoad }: {
  onLoad: (analysis: SavedAnalysis) => void;
}) {
  const { savedAnalyses, isLoading, deleteAnalysis } = useSavedAnalyses();

  if (isLoading || savedAnalyses.length === 0) return null;

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-mono uppercase tracking-wider text-primary flex items-center gap-2">
          <History className="h-3.5 w-3.5" /> Análises salvas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {savedAnalyses.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border hover:border-primary/30 transition-colors cursor-pointer group"
            onClick={() => onLoad(a)}
          >
            <FileAudio className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{a.track_name}</p>
              <p className="text-[11px] text-muted-foreground font-mono">
                {a.genre} · {new Date(a.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); deleteAnalysis(a.id); }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

export function MusicDNAAnalyzer() {
  const { progress, logs, result, isPending, error, analyze, reset } = useMusicDNA();
  const [lastInput, setLastInput] = useState<{ name: string; notes?: string; references: string[]; projectId?: string } | null>(null);
  const [viewingDiagnosis, setViewingDiagnosis] = useState<DiagnosisResult | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const { saveAnalysis, isSaving } = useSavedAnalyses();
  const { data: benchmarks } = useMusicDnaBenchmarks();
  const { projects } = useProjects();

  // Restore cached analysis on mount
  useEffect(() => {
    if (!result && !isPending) {
      const cached = getCachedAnalysis();
      if (cached) {
        setLastInput(cached.input);
        setViewingDiagnosis(cached.diagnosis);
        setRestoredFromCache(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cache result when a new analysis completes
  useEffect(() => {
    if (result && lastInput) {
      cacheLastAnalysis(lastInput, result);
      setViewingDiagnosis(result);
      setIsSaved(false);
      setRestoredFromCache(false);
    }
  }, [result, lastInput]);

  const handleSubmit = (values: FormValues, file: File) => {
    const input: TrackInput = {
      name: values.name,
      file,
      notes: values.notes,
      references: values.references,
    };
    setLastInput({ ...input, projectId: values.projectId || undefined });
    setViewingDiagnosis(null);
    setRestoredFromCache(false);
    analyze(input);
  };

  const handleReset = () => {
    clearCachedAnalysis();
    setViewingDiagnosis(null);
    setLastInput(null);
    setIsSaved(false);
    setSavedAnalysisId(undefined);
    setRestoredFromCache(false);
    reset();
  };

  const [savedAnalysisId, setSavedAnalysisId] = useState<string | undefined>(undefined);
  const [restoredFromCache, setRestoredFromCache] = useState(false);

  const handleSave = () => {
    if (lastInput && (viewingDiagnosis || result)) {
      saveAnalysis(
        { input: lastInput, diagnosis: (viewingDiagnosis || result)! },
        {
          onSuccess: ({ id }) => {
            setIsSaved(true);
            setSavedAnalysisId(id);
          },
        }
      );
    }
  };

  const handleLoadSaved = (saved: SavedAnalysis) => {
    const meta = saved.input_metadata as { name: string; notes?: string; references: string[]; projectId?: string };
    const input = { ...meta, projectId: meta.projectId ?? saved.project_id ?? undefined };
    setLastInput(input);
    setViewingDiagnosis(saved.diagnosis);
    setIsSaved(true);
    setSavedAnalysisId(saved.id);
    setRestoredFromCache(false);
    cacheLastAnalysis(input, saved.diagnosis);
  };

  const activeDiagnosis = viewingDiagnosis || result;
  const activeBenchmark = findBenchmarkForGenre(benchmarks, activeDiagnosis?.genero_classificado);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {error && (
        <div className="mb-4 flex gap-2 items-start p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <span className="font-bold shrink-0">⚠</span>
          <span>
            {error.message}{" "}
            <button className="underline hover:no-underline" onClick={handleReset}>
              Tentar novamente
            </button>
          </span>
        </div>
      )}

      {!activeDiagnosis && !isPending && (
        <div className="mb-5 animate-slide-up">
          <div className="flex items-center gap-2 mb-1">
            <Music className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Analisador de DNA Musical</h1>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Faça upload da sua demo para receber um diagnóstico técnico avançado com análise espectral,
            detecção de BPM e tom, segmentação por seções e sugestões de produção.
          </p>
        </div>
      )}

      {activeDiagnosis && lastInput ? (
        <>
          {restoredFromCache && (
            <div className="mb-4 flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border border-border animate-fade-in">
              <p className="text-xs text-muted-foreground">
                <History className="inline h-3 w-3 mr-1.5 -mt-0.5" />
                Você está vendo a última análise restaurada da sessão.
              </p>
              <Button variant="outline" size="sm" className="text-xs gap-1.5 shrink-0" onClick={handleReset}>
                ↻ Nova análise
              </Button>
            </div>
          )}
          <ResultView
            input={lastInput}
            diagnosis={activeDiagnosis}
            benchmark={activeBenchmark}
            onReset={handleReset}
            onSave={handleSave}
            isSaved={isSaved}
            isSaving={isSaving}
            savedAnalysisId={savedAnalysisId}
            projects={projects}
          />
        </>
      ) : isPending ? (
        <LoadingView
          trackName={lastInput?.name ?? ""}
          logs={logs}
          progress={progress}
        />
      ) : (
        <>
          <FormView onSubmit={handleSubmit} isPending={isPending} projects={projects} />
          <div className="mt-6">
            <SavedAnalysesList onLoad={handleLoadSaved} />
          </div>
        </>
      )}
    </div>
  );
}

export default MusicDNAAnalyzer;
