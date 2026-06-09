import { useState, useRef, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, X, FileAudio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { resolveStage, type AudioStage } from "@/lib/musicDnaStages";
import { GENRE_PRESETS, type Genre } from "@/hooks/useMusicDNA";
import { StageSelector } from "@/components/music-dna/StageSelector";

export const ACCEPTED_AUDIO = [
  "audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3",
  "audio/ogg", "audio/flac", "audio/aac", "audio/x-m4a", "audio/mp4",
  "audio/aiff", "audio/x-aiff", "audio/x-aifc",
];

export const GENRE_ENUM_VALUES = Object.keys(GENRE_PRESETS) as [Genre, ...Genre[]];

/**
 * Subconjunto dos GENRE_PRESETS alinhado à taxonomia canônica do
 * `supabase/functions/music-dna-analyze/genre-map.ts` (genre_canonical()).
 * Mantém apenas gêneros com pool real no catálogo (level strong/usable/proxy)
 * e ordena por contagem real em `music_reference_tracks`.
 *
 * Removidos por não terem pool no catálogo refatorado:
 *   Forró / Piseiro, Axé / Pop Bahia, Trap BR, Rap BR, Synth-Pop,
 *   Lo-Fi Hip Hop, Sertanejo Universitário, Rock Alternativo BR,
 *   Grunge (coberto por Rock), Reggae BR (coberto por Reggae),
 *   Funk (coberto por Funk Carioca), Ambient (coberto por Eletrônica / House).
 */
export const GENRE_DROPDOWN_OPTIONS: Genre[] = [
  "Bossa Nova",
  "Samba",
  "MPB Contemporânea",
  "Rock",
  "Rock Alternativo",
  "Folk Rock",
  "Reggae",
  "Hip-Hop",
  "Jazz",
  "Blues",
  "Sertanejo Raiz",
  "Heavy Metal",
  "Pagode",
  "Eletrônica / House",
  "R&B / Soul",
  "Pop Brasileiro",
  "Pop Internacional",
  "Country",
  "Indie BR",
  "Punk Rock",
  "Funk Carioca",
];

export const formSchema = z.object({
  name: z.string().trim().min(1, "Nome da faixa é obrigatório").max(200),
  references: z.array(z.string()).max(5),
  projectId: z.string().optional(),
  stage: z.enum(["demo", "mix", "master"]),
  genre: z.enum(GENRE_ENUM_VALUES).optional(),
});
export type FormValues = z.infer<typeof formSchema>;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FormView({ onSubmit, isPending, projects, defaultProjectId }: {
  onSubmit: (v: FormValues, file: File) => void;
  isPending: boolean;
  projects: Array<{ id: string; name: string; artist: string; stage?: string }>;
  defaultProjectId?: string;
}) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [stageTouched, setStageTouched] = useState(false);
  const [refInput, setRefInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      references: [], projectId: defaultProjectId ?? "", stage: "master",
    },
  });

  useEffect(() => {
    if (!defaultProjectId) return;
    form.setValue("projectId", defaultProjectId);
    if (!stageTouched) {
      const proj = projects.find((p) => p.id === defaultProjectId);
      if (proj?.stage) {
        const derived = resolveStage(undefined, proj.stage);
        form.setValue("stage", derived);
      }
    }
  }, [defaultProjectId, form, projects, stageTouched]);



  const handleFile = useCallback((file: File) => {
    setFileError(null);
    if (!ACCEPTED_AUDIO.includes(file.type) && !file.name.match(/\.(wav|mp3|ogg|flac|aac|m4a|aiff|aif)$/i)) {
      setFileError("Formato não suportado. Use MP3, WAV, FLAC, M4A, OGG ou AIFF.");
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

  const handleAddRef = () => {
    const trimmed = refInput.trim();
    if (!trimmed) return;
    const current = form.getValues("references");
    if (current.length >= 5 || current.includes(trimmed)) { setRefInput(""); return; }
    form.setValue("references", [...current, trimmed]);
    setRefInput("");
  };

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
        {/* Expectation strip — shown before any field to set context */}
        <div className="flex items-start gap-2 rounded-lg bg-muted/30 border border-border px-3 py-2.5 text-xs text-muted-foreground leading-relaxed animate-fade-in">
          <span className="text-primary shrink-0 mt-0.5">🧬</span>
          <span>
            Analisa LUFS, True Peak, BPM, tom, espectro e seções — a IA gera diagnóstico técnico e sugestões de produção.{" "}
            <span className="font-medium text-foreground/70">Leva ~20–60s.</span>
          </span>
        </div>

        {/* Upload zone */}
        <Card className="animate-slide-up">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-primary">
              Arquivo de áudio
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
                    MP3, WAV, FLAC, M4A, OGG, AIFF — até 50 MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.wav,.flac,.m4a,.ogg,.aiff,.aif"
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
              Detalhes da faixa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 1. Track name — auto-filled from file */}
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

            {/* 2. Stage — most impactful: determines what the AI focuses on */}
            <FormField control={form.control} name="stage" render={({ field }) => {
              const projectId = form.watch("projectId");
              const proj = projects.find((p) => p.id === projectId);
              const derived = proj?.stage ? resolveStage(undefined, proj.stage) : null;
              return (
                <FormItem>
                  <FormControl>
                    <StageSelector
                      value={field.value as AudioStage}
                      onChange={(s) => { setStageTouched(true); field.onChange(s); }}
                      derivedFromProject={derived}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }} />

            {/* 3. Genre — determines benchmark and streaming context */}
            <FormField control={form.control} name="genre" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] uppercase tracking-widest font-mono text-muted-foreground">
                  Gênero principal (opcional)
                </FormLabel>
                <Select
                  value={field.value ?? "__none__"}
                  onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Não informar" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">Não informar</SelectItem>
                    {GENRE_DROPDOWN_OPTIONS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">
                  Ajusta o benchmark de comparação e o contexto de streaming nas sugestões da IA.
                </p>
                <FormMessage />
              </FormItem>
            )} />

            {/* 4. References — orients IA vocabulary and tone */}
            <FormField control={form.control} name="references" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11px] uppercase tracking-widest font-mono text-muted-foreground">
                  Referências artísticas (até 5, opcional)
                </FormLabel>
                <div className="space-y-2">
                  {field.value.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {field.value.map((ref, i) => (
                        <Badge key={ref} variant="secondary" className="gap-1 pl-2.5 pr-1.5 text-xs font-normal">
                          {ref}
                          <button
                            type="button"
                            onClick={() => field.onChange(field.value.filter((_, idx) => idx !== i))}
                            className="ml-0.5 hover:text-destructive transition-colors"
                            aria-label={`Remover ${ref}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  {field.value.length < 5 && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ex: Seu Jorge, Emicida, Djonga…"
                        value={refInput}
                        onChange={(e) => setRefInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); handleAddRef(); }
                        }}
                        className="flex-1 h-9"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 h-9 text-xs px-3"
                        onClick={handleAddRef}
                        disabled={!refInput.trim()}
                      >
                        Adicionar
                      </Button>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Orienta o vocabulário e o tom das sugestões. Não afeta as métricas medidas.
                  </p>
                </div>
                <FormMessage />
              </FormItem>
            )} />

            {/* 5. Optional context — collapsible */}
            <Collapsible>
              <CollapsibleTrigger className="text-[11px] uppercase tracking-widest font-mono text-muted-foreground hover:text-foreground transition-colors">
                + Contexto adicional (opcional)
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-3">
                <FormField control={form.control} name="projectId" render={({ field }) => {
                  return (
                    <FormItem>
                      <FormLabel className="text-[11px] uppercase tracking-widest font-mono text-muted-foreground">
                        Vincular a um projeto
                      </FormLabel>
                      <Select
                        value={field.value || "__none__"}
                        onValueChange={(v) => {
                          const newId = v === "__none__" ? "" : v;
                          field.onChange(newId);
                          if (!stageTouched) {
                            const proj = projects.find((p) => p.id === newId);
                            const derived = resolveStage(undefined, proj?.stage);
                            form.setValue("stage", derived);
                          }
                        }}
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
                  );
                }} />
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>


        <Button type="submit" disabled={isPending} className="w-full font-semibold animate-scale-in">
          {isPending ? "Analisando…" : "Analisar DNA Musical →"}
        </Button>
      </form>
    </Form>
  );
}
