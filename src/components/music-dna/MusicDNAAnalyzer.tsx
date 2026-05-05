import { useState, useRef, useCallback, useEffect } from "react";
import { FeedbackModal } from "./FeedbackModal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Radar, RadarChart, PolarAngleAxis,
  ResponsiveContainer, Legend,
} from "recharts";
import { Upload, X, FileAudio, Music, MessageSquare, ListPlus, Check, Save, Trash2, History, Palette, ArrowRight, FolderKanban, Download } from "lucide-react";
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

import {
  useMusicDNA,
  FEATURE_KEYS, FEATURE_LABELS,
  GENRE_PRESETS, calcDistance,
  toRadarData,
  type TrackInput, type Genre,
  type DiagnosisResult, type AudioFeatures,
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

function ExecutiveSummary({ diagnosis }: { diagnosis: DiagnosisResult }) {
  const truePeak = diagnosis.realAnalysis?.true_peak_dbtp ?? diagnosis.audioAnalysis?.truePeak ?? -1;
  const lufs = diagnosis.realAnalysis?.lufs_integrated ?? diagnosis.audioAnalysis?.lufs ?? -14;
  const dynamicRange = diagnosis.realAnalysis?.dynamic_range_lu ?? diagnosis.audioAnalysis?.dynamicRange ?? 8;
  const primaryStrength = diagnosis.pontos_fortes?.[0] ?? "A faixa já apresenta uma identidade sonora reconhecível.";
  const mainBottleneck = diagnosis.gargalos_criativos?.[0] ?? "Vale refinar o contraste entre seções antes da finalização.";
  const nextAction = diagnosis.proximos_passos?.[0]?.acao ?? diagnosis.sugestoes_arranjo?.[0] ?? "Revisar mix e arranjo com foco no ponto mais sensível do diagnóstico.";

  // True Peak: alvo -1 dBTP com tolerância de ±1 dB → aceitável até 0 dBTP
  const status = truePeak <= 0 && lufs >= -16 && lufs <= -10 && dynamicRange >= 7
    ? { label: "Pronta para streaming", tone: "success" as const }
    : truePeak > 0 || dynamicRange < 5
    ? { label: "Precisa revisão técnica", tone: "destructive" as const }
    : { label: "Boa base, precisa ajustes", tone: "primary" as const };

  const toneClass = {
    success: "bg-primary/10 text-primary border-primary/30",
    destructive: "bg-destructive/10 text-destructive border-destructive/30",
    primary: "bg-primary/10 text-primary border-primary/30",
  }[status.tone];

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
                <p className="text-xs leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
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
    lines.push(diagnosis.identidade);
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
      lines.push(`- **${ref.artista}** — ${ref.similaridade}${ref.justificativa ? ` — ${ref.justificativa}` : ""}`);
    });
    lines.push("");
  }
  return lines.join("\n");
}

function downloadAnalysisReport(input: { name: string; references: string[]; notes?: string }, diagnosis: DiagnosisResult) {
  const md = buildAnalysisMarkdown(input, diagnosis);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const safeName = input.name.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60) || "dna-musical";
  const a = document.createElement("a");
  a.href = url;
  a.download = `dna-musical_${safeName}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success("Relatório baixado");
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

function ResultView({ input, diagnosis, benchmark, onReset, onSave, isSaved, isSaving, savedAnalysisId }: {
  input: TrackInput | { name: string; notes?: string; references: string[] };
  diagnosis: DiagnosisResult;
  benchmark?: MusicDnaBenchmark;
  savedAnalysisId?: string;
  onReset: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  isSaving?: boolean;
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const { addTask } = useTasks();
  const {
    identidade, diagnostico_tecnico, analise_seccoes,
    referencias_proximas, pontos_fortes, gargalos_criativos,
    sugestoes_arranjo, proximos_passos, diagnostico_resumo,
    distance, trackFeatures, refFeatures, audioAnalysis, realAnalysis, externalLookup,
  } = diagnosis;

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

  // Sticky nav (~40px) + folga visual; evita que o título da seção fique escondido atrás da barra
  const jumpTo = (id: string) => {
    // Avisa Collapsibles (mobile) para abrirem antes do scroll
    window.dispatchEvent(new CustomEvent("dna:jump", { detail: { id } }));
    // Pequeno delay para o collapsible montar conteúdo antes de medir posição
    requestAnimationFrame(() => {
      scrollToAnchor(id, { extraOffset: 56 });
    });
  };
  const metricItems = [
    { label: "LUFS", value: `${realAnalysis?.lufs_integrated ?? audioAnalysis?.lufs ?? "—"}`, unit: "LUFS", help: "volume percebido em plataformas" },
    { label: "True Peak", value: `${realAnalysis?.true_peak_dbtp ?? audioAnalysis?.truePeak ?? "—"}`, unit: "dBTP", help: "risco de distorção após streaming" },
    { label: "DR", value: `${realAnalysis?.dynamic_range_lu ?? audioAnalysis?.dynamicRange ?? "—"}`, unit: "LU", help: "variação entre partes suaves e fortes" },
    { label: "BPM", value: `${realAnalysis?.bpm ?? "—"}`, unit: "", help: "pulso médio detectado" },
    { label: "Tom", value: `${realAnalysis?.key ?? "—"}`, unit: "", help: "centro tonal provável" },
    { label: "Duração", value: realAnalysis ? formatDuration(realAnalysis.duration_sec) : "—", unit: "", help: "tempo total da faixa" },
  ];
  const technicalItems = diagnostico_tecnico ? [
    { label: "LUFS", help: "volume percebido em plataformas", text: diagnostico_tecnico.lufs_avaliacao },
    { label: "True Peak", help: "risco de distorção após compressão/streaming", text: diagnostico_tecnico.true_peak_avaliacao },
    { label: "Dynamic Range", help: "variação entre trechos suaves e fortes", text: diagnostico_tecnico.dynamic_range_avaliacao },
    { label: "Espectro", help: "brilho, presença e distribuição de frequências", text: diagnostico_tecnico.espectro_avaliacao },
  ] : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap animate-slide-up">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
            Diagnóstico
          </p>
          <h2 className="text-xl font-bold">{input.name}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-[11px] font-mono bg-primary/10 border-primary/30 text-primary">
              {diagnosis.genero_classificado || "Gênero não classificado"}
            </Badge>
            {input.references.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {input.references.slice(0, 2).join(", ")}
              </span>
            )}
            <Badge variant="outline" className="text-[11px] font-mono bg-muted/30 border-border text-muted-foreground">
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

      <NextStepsBar diagnosis={diagnosis} input={input} isSaved={!!isSaved} savedAnalysisId={savedAnalysisId} />

      <div className="sticky top-2 z-20 -mx-1 flex gap-1.5 overflow-x-auto rounded-lg border border-border bg-background/95 p-1 backdrop-blur animate-fade-in">
        {[
          { label: "Resumo", id: "dna-resumo" },
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

      <ExecutiveSummary diagnosis={diagnosis} />

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
                    <p className="text-[10px] text-muted-foreground mt-1">
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

      <section id="dna-referencias" className="scroll-mt-16 space-y-4">
        <DiagCard icon="🔗" title="Referências mais próximas">
          <div className="space-y-2">
            <p className="rounded-md bg-muted/30 p-2.5 text-[11px] text-muted-foreground leading-relaxed">
              Essas referências indicam proximidade técnica/sonora, não uma sugestão para copiar estética.
            </p>
            {(referencias_proximas ?? []).map((r, i) => (
              <div key={i} className={cn(
                "flex justify-between items-start gap-3 py-2 text-xs",
                i < (referencias_proximas?.length ?? 0) - 1 && "border-b border-border"
              )}>
                <div>
                  <p className="font-semibold">{r.artista}</p>
                  <p className="text-muted-foreground mt-0.5">{r.motivo}</p>
                </div>
                <span className="font-mono text-primary shrink-0">{r.similaridade}</span>
              </div>
            ))}
          </div>
        </DiagCard>

        <BenchmarkPanel diagnosis={diagnosis} benchmark={benchmark} />
      </section>

      <section id="dna-identidade" className="scroll-mt-16">
        <DiagCard icon="🎭" title="Identidade da Faixa" variant="primary">
          <div className="space-y-3">
            <div>
              <p className="text-base font-bold">{identidade?.mood_principal}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {identidade?.territorio_sonoro}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(identidade?.tags ?? []).map(tag => (
                <Badge key={tag} variant="outline"
                  className="text-[11px] font-mono bg-primary/10 border-primary/30 text-primary">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="rounded-md bg-muted/30 p-2.5 text-[11px] text-muted-foreground leading-relaxed">
              <span className="text-primary">🎧 Ouvinte: </span>
              {identidade?.persona_ouvinte}
            </div>
          </div>
        </DiagCard>
      </section>

      <DetailSection id="dna-tecnico" icon="🔬" title="Métricas e diagnóstico técnico">
        <div className="space-y-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 animate-fade-in">
            {metricItems.map((m) => (
              <Card key={m.label} className="text-center py-2.5 px-1">
                <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">{m.label}</p>
                <p className="text-base font-bold text-primary leading-tight">{m.value}</p>
                {m.unit && <p className="text-[11px] text-muted-foreground">{m.unit}</p>}
                <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{m.help}</p>
              </Card>
            ))}
          </div>

          {diagnostico_tecnico && (
            <DiagCard icon="🔬" title="Diagnóstico Técnico" variant="primary">
              <div className="space-y-3">
                {technicalItems.map((item) => (
                  <div key={item.label} className="bg-muted/30 rounded-lg p-3 border-l-2 border-primary/30">
                    <div className="mb-1 flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-[11px] font-mono uppercase tracking-widest text-primary">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">{item.help}</p>
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
