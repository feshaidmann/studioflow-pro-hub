import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Palette, Sparkles, Trash2, ImageIcon, Download, Copy, FileText, Dna, X, Music, User, CalendarDays, ChevronDown, Video, PlayCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import FormatSelector, { FORMAT_OPTIONS, type FormatOption } from "@/components/creative/FormatSelector";
import FormatChips from "@/components/creative/FormatChips";
import StyleChips from "@/components/creative/StyleChips";
import ImagePreview from "@/components/creative/ImagePreview";
import ReferenceImageUpload from "@/components/creative/ReferenceImageUpload";
import DeriveBatchDialog from "@/components/creative/DeriveBatchDialog";
import GalleryLightbox from "@/components/creative/GalleryLightbox";
import QuickTemplates, { type QuickTemplate } from "@/components/creative/QuickTemplates";
import { useCreativeAssets } from "@/hooks/useCreativeAssets";
import { useProjects } from "@/contexts/ProjectContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getCachedAnalysis } from "@/hooks/useSavedAnalyses";
import type { DiagnosisResult } from "@/hooks/useMusicDNA";
import { generateVideoLoop, type VideoPreset } from "@/components/creative/VideoLoopGenerator";
import { VideoEffectPicker } from "@/components/creative/VideoEffectPicker";
import type { Intensity, SpotEffect } from "@/components/creative/videoLayers";
import { useRateLimitDialog } from "@/hooks/useRateLimitDialog";

function QuotaIndicator() {
  const { quota } = useRateLimitDialog();
  if (!quota) return null;
  const dailyRemaining = Math.max(0, quota.daily_limit - quota.daily_used);
  // Only show when 5 or fewer remaining
  if (dailyRemaining > 5) return null;
  return (
    <div className="text-[11px] text-muted-foreground text-center">
      {dailyRemaining === 0
        ? "Limite diário atingido"
        : `${dailyRemaining} ${dailyRemaining === 1 ? "geração restante" : "gerações restantes"} hoje`}
    </div>
  );
}

async function downloadFile(url: string, filename: string) {
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  } catch {
    window.open(url, "_blank");
  }
}

const FORMAT_PROMPT_PREFIX: Record<string, string> = {
  instagram_post: "Post artístico para Instagram",
  story: "Story vertical impactante",
  youtube_cover: "Capa cinematográfica para YouTube",
  spotify_cover: "Capa artística para single/álbum",
  spotify_canvas: "Canvas animado vertical para Spotify",
  spotify_banner: "Banner horizontal para perfil Spotify",
  deezer_cover: "Capa artística para single/álbum",
  tidal_cover: "Capa artística para single/álbum",
  twitter_post: "Post visual para Twitter/X",
  custom: "Arte visual personalizada",
};

function getFormatPrefix(formatId: string): string {
  return FORMAT_PROMPT_PREFIX[formatId] || "Arte visual";
}

function buildDNAPrompt(diagnosis: DiagnosisResult, trackName: string, formatId = "spotify_cover"): string {
  const parts: string[] = [];
  const prefix = getFormatPrefix(formatId);
  const genre = diagnosis.genero_classificado;
  if (genre) {
    parts.push(`${prefix} de ${genre}.`);
  } else {
    parts.push(`${prefix} para single musical.`);
  }

  const mood = diagnosis.identidade?.mood_principal;
  if (mood) parts.push(`Atmosfera: ${mood}.`);

  const territory = diagnosis.identidade?.territorio_sonoro;
  if (territory) parts.push(`Cenário: ${territory}.`);

  const tags = diagnosis.identidade?.tags;
  if (tags && tags.length > 0) parts.push(`Elementos visuais: ${tags.join(", ")}.`);

  const instruments = diagnosis.detectedInstruments;
  if (instruments && instruments.length > 0) {
    parts.push(`Inclua ${instruments.join(" e ")} na composição.`);
  }

  if (trackName) parts.push(`Título da faixa: '${trackName}'.`);

  return parts.join(" ") || `${prefix} para single musical.`;
}

const CAPTION_PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "reels", label: "Reels / Shorts" },
  { value: "spotify", label: "Spotify" },
  { value: "tiktok", label: "TikTok" },
];

const CAPTION_OBJECTIVES = [
  { value: "pre-save", label: "Pré-save" },
  { value: "launch", label: "Lançamento" },
  { value: "engagement", label: "Engajamento" },
  { value: "storytelling", label: "Storytelling" },
];

const CAPTION_TONES = [
  { value: "authentic", label: "Autêntico" },
  { value: "emotional", label: "Emocional" },
  { value: "direct", label: "Direto" },
  { value: "poetic", label: "Poético" },
];

export default function Creative() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectIdParam = searchParams.get("project");
  const dnaParam = searchParams.get("dna");
  const { projects } = useProjects();
  const isMobile = useIsMobile();

  const [selectedFormat, setSelectedFormat] = useState<FormatOption>(FORMAT_OPTIONS[0]);
  const [style, setStyle] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedBase64, setGeneratedBase64] = useState<string | null>(null);
  const [savedToGallery, setSavedToGallery] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLoading, setEditingLoading] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("create");
  const [deriveDialogOpen, setDeriveDialogOpen] = useState(false);
  const [deriveImageUrl, setDeriveImageUrl] = useState<string>("");
  const [showAllFormats, setShowAllFormats] = useState(false);
  const [trackDetailsOpen, setTrackDetailsOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdParam || "none");

  // Gallery
  const [filterFormat, setFilterFormat] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; path: string } | null>(null);
  const [detailAsset, setDetailAsset] = useState<any>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [dnaCopyText, setDnaCopyText] = useState<string>("");
  const [dnaCopyLoading, setDnaCopyLoading] = useState(false);
  const [dnaSource, setDnaSource] = useState<DiagnosisResult | null>(null);
  const [dnaTrackName, setDnaTrackName] = useState("");
  const [trackName, setTrackName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [additionalText, setAdditionalText] = useState("");
  const [noText, setNoText] = useState(false);
  const [captionPlatform, setCaptionPlatform] = useState("instagram");
  const [captionObjective, setCaptionObjective] = useState("launch");
  const [captionTone, setCaptionTone] = useState("authentic");

  // Video loop state
  const [loopDuration, setLoopDuration] = useState<3 | 4 | 5>(4);
  const [videoPreset, setVideoPreset] = useState<VideoPreset>("cinematic");
  const [videoIntensity, setVideoIntensity] = useState<Intensity>("medium");
  const [videoSpots, setVideoSpots] = useState<SpotEffect[]>([]);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generatedVideoBlob, setGeneratedVideoBlob] = useState<Blob | null>(null);
  const [videoStatus, setVideoStatus] = useState<string | null>(null);
  const [videoRendering, setVideoRendering] = useState(false);

  const RELEASE_FORMATS = ["spotify_cover", "deezer_cover", "tidal_cover"];
  const isReleaseFormat = RELEASE_FORMATS.includes(selectedFormat.id);

  const { assets, isLoading: assetsLoading, generating, generate, generateBatch, generateText, saveAsset, deleteAsset } = useCreativeAssets();

  const linkedProject = selectedProjectId && selectedProjectId !== "none"
    ? projects.find((p) => p.id === selectedProjectId)
    : null;

  // DNA param: load analysis and pre-fill prompt
  useEffect(() => {
    if (!dnaParam) return;
    const loadDNA = async () => {
      let diagnosis: DiagnosisResult | null = null;
      let trackName = "";

      if (dnaParam === "session") {
        const cached = getCachedAnalysis();
        if (cached) {
          diagnosis = cached.diagnosis;
          trackName = cached.input?.name || "";
        }
      } else {
        const { data, error } = await supabase
          .from("music_dna_analyses")
          .select("*")
          .eq("id", dnaParam)
          .single();
        if (!error && data) {
          diagnosis = data.diagnosis as unknown as DiagnosisResult;
          trackName = data.track_name || "";
        }
      }

      if (diagnosis) {
        setDnaSource(diagnosis);
        setDnaTrackName(trackName);
        setTrackName(trackName);
        setTrackDetailsOpen(true); // Auto-open track details for DNA flow
        const spotifyFmt = FORMAT_OPTIONS.find((f) => f.id === "spotify_cover");
        const fmt = spotifyFmt || FORMAT_OPTIONS[0];
        if (spotifyFmt) setSelectedFormat(fmt);
        setPrompt(buildDNAPrompt(diagnosis, trackName, fmt.id));
        setActiveTab("create");
      }

      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("dna");
        return next;
      }, { replace: true });
    };
    loadDNA();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dnaParam]);

  // Update prompt when format changes
  useEffect(() => {
    if (dnaSource) {
      setPrompt(buildDNAPrompt(dnaSource, dnaTrackName, selectedFormat.id));
    } else if (prompt.trim()) {
      const allPrefixes = Object.values(FORMAT_PROMPT_PREFIX);
      let updated = prompt;
      for (const prefix of allPrefixes) {
        if (updated.startsWith(prefix)) {
          updated = getFormatPrefix(selectedFormat.id) + updated.slice(prefix.length);
          break;
        }
      }
      if (updated !== prompt) setPrompt(updated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFormat.id]);

  // Auto-fill artistName when project changes
  useEffect(() => {
    if (linkedProject?.artist && !artistName) {
      setArtistName(linkedProject.artist);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedProject?.artist]);

  // Auto-open track details if trackName has value
  useEffect(() => {
    if (trackName.trim() || artistName.trim()) {
      setTrackDetailsOpen(true);
    }
  }, []); // Only on mount

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast({ title: "Descreva sua ideia", description: "O campo de prompt não pode estar vazio.", variant: "destructive" });
      return;
    }
    const contextPrompt = linkedProject
      ? `Para o projeto "${linkedProject.name}" do artista "${linkedProject.artist}". ${prompt}`
      : prompt;

    const result = await generate({
      prompt: contextPrompt,
      style,
      format: selectedFormat.id,
      width: selectedFormat.width,
      height: selectedFormat.height,
      editImageUrl: referenceImage || undefined,
      projectId: selectedProjectId && selectedProjectId !== "none" ? selectedProjectId : undefined,
      trackName: trackName.trim() || undefined,
      artistName: artistName.trim() || undefined,
      releaseDate: releaseDate || undefined,
      additionalText: additionalText.trim() || undefined,
      noText: noText || undefined,
    });

    if (result) {
      setGeneratedImage(result.imageBase64);
      setGeneratedBase64(result.imageBase64);
      setSavedToGallery(false);
      setGeneratedVideoUrl(null);
      setGeneratedVideoBlob(null);

      // If selected format is a video, render the loop in the browser
      if (selectedFormat.isVideo) {
        try {
          setVideoRendering(true);
          setVideoStatus("Renderizando vídeo loop…");
          const blob = await generateVideoLoop({
            imageUrl: result.imageBase64,
            width: selectedFormat.width,
            height: selectedFormat.height,
            durationSec: loopDuration,
            preset: videoPreset,
            intensity: videoIntensity,
            spots: videoSpots,
          });
          const url = URL.createObjectURL(blob);
          setGeneratedVideoBlob(blob);
          setGeneratedVideoUrl(url);
          setVideoStatus(null);
        } catch (e: any) {
          toast({ title: "Erro ao gerar vídeo", description: e?.message || "Falha na renderização", variant: "destructive" });
        } finally {
          setVideoRendering(false);
        }
      }

    }
  }, [prompt, style, selectedFormat, linkedProject, selectedProjectId, generate, referenceImage, trackName, artistName, releaseDate, additionalText, noText, loopDuration, videoPreset, videoIntensity, videoSpots]);

  const handleGenerateCaption = useCallback(async () => {
    if (!prompt.trim() && !trackName.trim() && !dnaSource) {
      toast({ title: "Informe a música", description: "Preencha a ideia, o nome da faixa ou use um DNA Musical.", variant: "destructive" });
      return;
    }

    const captionPrompt = [
      linkedProject ? `Projeto: ${linkedProject.name}. Artista do projeto: ${linkedProject.artist}.` : "",
      prompt ? `Direção criativa/estética: ${prompt}` : "",
    ].filter(Boolean).join(" ");

    const dnaContext = dnaSource
      ? `Gênero: ${dnaSource.genero_classificado || ""}. Mood: ${dnaSource.identidade?.mood_principal || ""}. Território: ${dnaSource.identidade?.territorio_sonoro || ""}. Tags: ${(dnaSource.identidade?.tags || []).join(", ")}`
      : undefined;

    setDnaCopyLoading(true);
    const textResult = await generateText({
      prompt: captionPrompt || "Legenda para divulgação musical",
      dnaContext,
      trackName: trackName.trim() || dnaTrackName || undefined,
      artistName: artistName.trim() || linkedProject?.artist || undefined,
      releaseDate: releaseDate || undefined,
      platform: CAPTION_PLATFORMS.find((item) => item.value === captionPlatform)?.label || captionPlatform,
      objective: CAPTION_OBJECTIVES.find((item) => item.value === captionObjective)?.label || captionObjective,
      tone: CAPTION_TONES.find((item) => item.value === captionTone)?.label || captionTone,
      format: selectedFormat.label,
    });
    if (textResult?.text) setDnaCopyText(textResult.text);
    setDnaCopyLoading(false);
  }, [prompt, trackName, dnaSource, linkedProject, generateText, dnaTrackName, artistName, releaseDate, captionPlatform, captionObjective, captionTone, selectedFormat.label]);

  const handleVariation = useCallback(async () => {
    if (!generatedBase64 || !prompt.trim()) {
      handleGenerate();
      return;
    }
    const variationPrompt = `Crie uma variação desta arte mantendo o conceito mas alterando composição e paleta. Conceito original: ${prompt}`;
    const result = await generate({
      prompt: variationPrompt,
      style,
      format: selectedFormat.id,
      width: selectedFormat.width,
      height: selectedFormat.height,
      editImageUrl: generatedBase64,
      projectId: selectedProjectId && selectedProjectId !== "none" ? selectedProjectId : undefined,
      trackName: trackName.trim() || undefined,
      artistName: artistName.trim() || undefined,
      releaseDate: releaseDate || undefined,
      additionalText: additionalText.trim() || undefined,
      noText: noText || undefined,
    });
    if (result) {
      setGeneratedImage(result.imageBase64);
      setGeneratedBase64(result.imageBase64);
      setSavedToGallery(false);
    }
  }, [generatedBase64, prompt, style, selectedFormat, selectedProjectId, generate, handleGenerate, trackName, artistName, releaseDate, additionalText, noText]);

  const handleUseAsReference = (url: string) => {
    setReferenceImage(url);
    setActiveTab("create");
  };

  const handleDerive = (imageUrl: string) => {
    setDeriveImageUrl(imageUrl);
    setDeriveDialogOpen(true);
  };

  const handleEdit = () => {
    setEditPrompt("");
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editPrompt.trim() || !generatedBase64) return;
    setEditDialogOpen(false);
    setEditingLoading(true);
    const result = await generate({
      prompt: editPrompt,
      style,
      format: selectedFormat.id,
      width: selectedFormat.width,
      height: selectedFormat.height,
      editImageUrl: generatedBase64,
      projectId: selectedProjectId && selectedProjectId !== "none" ? selectedProjectId : undefined,
    });
    if (result) {
      setGeneratedImage(result.imageBase64);
      setGeneratedBase64(result.imageBase64);
      setSavedToGallery(false);
    }
    setEditingLoading(false);
  };

  const handleDownload = () => {
    if (generatedVideoUrl && generatedVideoBlob) {
      const a = document.createElement("a");
      a.href = generatedVideoUrl;
      a.download = `criativo_${selectedFormat.id}_${Date.now()}.webm`;
      a.click();
      return;
    }
    if (!generatedBase64) return;
    const a = document.createElement("a");
    a.href = generatedBase64;
    a.download = `criativo_${selectedFormat.id}_${Date.now()}.png`;
    a.click();
  };

  const handleSaveToGallery = async () => {
    if (savedToGallery) return;
    if (!generatedBase64 && !generatedVideoBlob) return;
    const result = await saveAsset({
      imageBase64: generatedBase64 || "",
      prompt,
      style,
      format: selectedFormat.id,
      width: selectedFormat.width,
      height: selectedFormat.height,
      projectId: selectedProjectId && selectedProjectId !== "none" ? selectedProjectId : undefined,
      videoBlob: generatedVideoBlob || undefined,
    });
    if (result) setSavedToGallery(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteAsset(deleteTarget.id, deleteTarget.path);
    setDeleteTarget(null);
  };

  const handleTemplateSelect = (template: QuickTemplate) => {
    setPrompt(template.prompt);
    setStyle(template.style);
    const fmt = FORMAT_OPTIONS.find((f) => f.id === template.formatId);
    if (fmt) setSelectedFormat(fmt);
  };

  // Filtered gallery
  const filteredAssets = assets.filter((a) => {
    if (filterFormat !== "all" && a.format !== filterFormat) return false;
    if (filterProject !== "all" && (a.project_id || "") !== filterProject) return false;
    return true;
  });

  const assetFormats = [...new Set(assets.map((a) => a.format))];
  const assetProjectIds = [...new Set(assets.filter((a) => a.project_id).map((a) => a.project_id!))];

  const canGenerate = prompt.trim().length > 0;
  const showStickyButton = isMobile && canGenerate && activeTab === "create";

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Palette className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Criativo</h1>
        {linkedProject && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {linkedProject.name}
          </span>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="create">
            <Sparkles className="h-3.5 w-3.5 mr-1" /> Criar
          </TabsTrigger>
          <TabsTrigger value="gallery">
            <ImageIcon className="h-3.5 w-3.5 mr-1" /> Galeria ({assets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4 mt-4">
          {/* 1. Format chips — first decision */}
          <div>
            <FormatChips
              selected={selectedFormat.id}
              onSelect={(f) => { setSelectedFormat(f); setShowAllFormats(false); }}
              onShowAll={() => setShowAllFormats(!showAllFormats)}
            />
            {showAllFormats && (
              <div className="mt-2 p-3 border border-border/60 rounded-xl bg-background">
                <FormatSelector selected={selectedFormat.id} onSelect={(f) => { setSelectedFormat(f); setShowAllFormats(false); }} />
              </div>
            )}
          </div>

          {/* 2. DNA banner */}
          {dnaSource && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex justify-between items-center animate-fade-in">
              <div className="flex items-center gap-3">
                <Dna className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">Criando arte para: <span className="text-primary">{dnaTrackName || "faixa"}</span></p>
                  <p className="text-xs text-muted-foreground">
                    {dnaSource.genero_classificado || "Gênero"} • Mood: {dnaSource.identidade?.mood_principal || "—"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                setDnaSource(null);
                setDnaTrackName("");
                setPrompt("");
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Controls */}
            <div className="space-y-4">
              {/* 3. Prompt — protagonist */}
              <div className="relative">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Descreva sua ideia
                </label>
                {!prompt.trim() && !generatedImage ? (
                  <div className="space-y-3">
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Ex: Capa minimalista com violão acústico e tons terrosos para single de MPB"
                      rows={3}
                      className="text-sm resize-none"
                    />
                    <QuickTemplates onSelect={handleTemplateSelect} />
                  </div>
                ) : (
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ex: Capa minimalista com violão acústico e tons terrosos para single de MPB"
                    rows={3}
                    className="text-sm resize-none"
                  />
                )}
              </div>

              {/* 4. Collapsible: Detalhes da faixa */}
              <Collapsible open={trackDetailsOpen} onOpenChange={setTrackDetailsOpen}>
                <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${!trackDetailsOpen ? "-rotate-90" : ""}`} />
                  <Music className="h-3.5 w-3.5" />
                  Detalhes da faixa
                  {!trackDetailsOpen && trackName && (
                    <span className="text-[10px] text-primary ml-auto truncate max-w-[150px]">{trackName}</span>
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-3 ml-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Music className="h-3 w-3" /> Nome da música
                      </label>
                      <Input
                        value={trackName}
                        onChange={(e) => setTrackName(e.target.value)}
                        placeholder="Ex: Noite Clara"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                        <User className="h-3 w-3" /> Artista
                      </label>
                      <Input
                        value={artistName}
                        onChange={(e) => setArtistName(e.target.value)}
                        placeholder="Ex: Maria Silva"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  {isReleaseFormat && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" /> Data de lançamento (opcional)
                      </label>
                      <DatePickerField
                        value={releaseDate}
                        onChange={setReleaseDate}
                        disablePast
                        placeholder="Selecionar data"
                        className="h-9 text-sm"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Texto adicional na arte (opcional)
                    </label>
                    <Input
                      value={additionalText}
                      onChange={(e) => setAdditionalText(e.target.value.slice(0, 60))}
                      placeholder='Ex: "feat. Maria", "EP Vol. 2", "Edição limitada"'
                      maxLength={60}
                      disabled={noText}
                      className="h-9 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {additionalText.length}/60 — texto extra que aparecerá na arte. A descrição acima nunca vira texto na imagem.
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/40 p-2.5">
                    <div className="min-w-0">
                      <label htmlFor="noText" className="text-xs font-medium block">Arte sem nenhum texto</label>
                      <p className="text-[10px] text-muted-foreground">Suprime título, artista, data e texto extra. Pura composição visual.</p>
                    </div>
                    <Switch id="noText" checked={noText} onCheckedChange={setNoText} />
                  </div>

                  {projects.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Projeto (opcional)</label>
                      <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Sem projeto vinculado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} — {p.artist}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* 5. Collapsible: Estilo e referência */}
              <Collapsible open={styleOpen} onOpenChange={setStyleOpen}>
                <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${!styleOpen ? "-rotate-90" : ""}`} />
                  Estilo e referência
                  {!styleOpen && (style || referenceImage) && (
                    <span className="text-[10px] text-primary ml-auto">
                      {[style, referenceImage ? "Ref. ✓" : ""].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-3 ml-1">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Estilo (opcional)</label>
                    <StyleChips selected={style} onSelect={setStyle} />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      Imagem de referência (opcional)
                    </label>
                    <ReferenceImageUpload image={referenceImage} onImageChange={setReferenceImage} />
                    {referenceImage && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        A IA usará esta imagem como base para criar sua peça.
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* 5b. Video loop config — only when format is video */}
              {selectedFormat.isVideo && (
                <div className="border border-primary/30 bg-primary/5 rounded-lg p-3 space-y-3 animate-fade-in">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                    <Video className="h-3.5 w-3.5" />
                    Configurações do loop animado
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Duração</label>
                    <Select value={String(loopDuration)} onValueChange={(v) => setLoopDuration(Number(v) as 3 | 4 | 5)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 segundos</SelectItem>
                        <SelectItem value="4">4 segundos</SelectItem>
                        <SelectItem value="5">5 segundos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <VideoEffectPicker
                    preset={videoPreset}
                    onPresetChange={setVideoPreset}
                    intensity={videoIntensity}
                    onIntensityChange={setVideoIntensity}
                    spots={videoSpots}
                    onSpotsChange={setVideoSpots}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    A IA gera a imagem e o navegador anima como vídeo loop perfeito (.webm) com camadas de efeito.
                  </p>
                </div>
              )}

              {/* 6. Generate button — desktop */}
              <div className="hidden md:block space-y-2">
                <QuotaIndicator />
                <Button
                  className="w-full"
                  onClick={handleGenerate}
                  disabled={generating || videoRendering || !canGenerate}
                >
                  {selectedFormat.isVideo ? <Video className="h-4 w-4 mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
                  {generating
                    ? "Gerando…"
                    : videoRendering
                      ? "Renderizando vídeo…"
                      : selectedFormat.isVideo
                        ? "Gerar Vídeo Loop"
                        : referenceImage
                          ? "Gerar a partir da referência"
                          : "Gerar Imagem"}
                </Button>
              </div>
            </div>

            {/* Right: Preview */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Preview</label>
              <ImagePreview
                imageUrl={generatedImage}
                videoUrl={generatedVideoUrl}
                isLoading={generating || editingLoading || videoRendering}
                isVideoMode={selectedFormat.isVideo}
                videoStatus={videoStatus}
                onRegenerate={handleVariation}
                onEdit={handleEdit}
                onDownload={handleDownload}
                onSave={handleSaveToGallery}
                isSaved={savedToGallery}
                onDerive={generatedImage && !generatedVideoUrl ? () => handleDerive(generatedImage) : undefined}
                formatLabel={selectedFormat.label}
                aspectRatio={selectedFormat.width / selectedFormat.height}
              />

              {/* DNA Copy Text Card */}
              {(dnaCopyText || dnaCopyLoading) && (
                <Card className="mt-4">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium">Legenda sugerida para redes sociais</span>
                    </div>
                    {dnaCopyLoading ? (
                      <p className="text-xs text-muted-foreground animate-pulse">Gerando legenda…</p>
                    ) : (
                      <>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{dnaCopyText}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 text-xs gap-1.5"
                          onClick={() => {
                            navigator.clipboard.writeText(dnaCopyText);
                            toast({ title: "Copiado!", description: "Legenda copiada para a área de transferência." });
                          }}
                        >
                          <Copy className="h-3 w-3" /> Copiar legenda
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="gallery" className="mt-4 space-y-4">
          {/* Gallery filters */}
          {assets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Select value={filterFormat} onValueChange={setFilterFormat}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue placeholder="Formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os formatos</SelectItem>
                  {assetFormats.map((f) => {
                    const opt = FORMAT_OPTIONS.find((fo) => fo.id === f);
                    return <SelectItem key={f} value={f}>{opt?.label || f}</SelectItem>;
                  })}
                </SelectContent>
              </Select>

              {assetProjectIds.length > 0 && (
                <Select value={filterProject} onValueChange={setFilterProject}>
                  <SelectTrigger className="h-8 w-[180px] text-xs">
                    <SelectValue placeholder="Projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os projetos</SelectItem>
                    {assetProjectIds.map((pid) => {
                      const proj = projects.find((p) => p.id === pid);
                      return <SelectItem key={pid} value={pid}>{proj?.name || "Projeto"}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {assetsLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : assets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhuma criação ainda.</p>
              <p className="text-xs mt-1">Gere sua primeira imagem na aba Criar.</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhuma arte encontrada com esses filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredAssets.map((a) => {
                const aspectClass = a.height > a.width
                  ? "aspect-[9/16]"
                  : a.width > a.height
                    ? "aspect-video"
                    : "aspect-square";
                const isVideoAsset = (a as any).media_type === "video";
                return (
                  <Card
                    key={a.id}
                    className="overflow-hidden cursor-pointer group relative"
                    onClick={() => setLightboxIndex(filteredAssets.indexOf(a))}
                  >
                    <CardContent className="p-0 relative">
                      {isVideoAsset ? (
                        <video
                          src={a.public_url || ""}
                          className={`w-full ${aspectClass} object-cover`}
                          muted
                          loop
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={a.public_url || ""}
                          alt={a.prompt.slice(0, 60)}
                          className={`w-full ${aspectClass} object-cover`}
                          loading="lazy"
                        />
                      )}
                      {isVideoAsset && (
                        <div className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 pointer-events-none">
                          <PlayCircle className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 pointer-events-none">
                        <p className="text-[10px] text-white/90 line-clamp-2">{a.prompt}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Sticky generate button — mobile only */}
      {showStickyButton && (
        <div className="fixed bottom-16 left-0 right-0 p-3 bg-background/95 backdrop-blur-sm border-t border-border/50 z-40 md:hidden space-y-2">
          <QuotaIndicator />
          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={generating || videoRendering || !canGenerate}
          >
            {selectedFormat.isVideo ? <Video className="h-4 w-4 mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
            {generating
              ? "Gerando…"
              : videoRendering
                ? "Renderizando vídeo…"
                : selectedFormat.isVideo
                  ? "Gerar Vídeo Loop"
                  : referenceImage
                    ? "Gerar a partir da referência"
                    : "Gerar Imagem"}
          </Button>
        </div>
      )}

      {/* Gallery Lightbox */}
      <GalleryLightbox
        assets={filteredAssets}
        index={lightboxIndex}
        open={lightboxIndex >= 0 && lightboxIndex < filteredAssets.length}
        onOpenChange={(open) => { if (!open) setLightboxIndex(-1); }}
        onIndexChange={setLightboxIndex}
        onDownload={downloadFile}
        onUseAsReference={handleUseAsReference}
        onDerive={handleDerive}
        onDelete={(id, path) => { setLightboxIndex(-1); setDeleteTarget({ id, path }); }}
        getProjectName={(pid) => pid ? projects.find((p) => p.id === pid)?.name : undefined}
      />

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar com IA</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Descreva as alterações que deseja na imagem.
          </p>
          <Textarea
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            placeholder="Ex: Remover o fundo, adicionar gradiente azul, e colocar o título 'Novo Single' em letras brancas no topo"
            rows={3}
            className="text-sm resize-none"
          />
          <Button onClick={handleEditSubmit} disabled={editingLoading || !editPrompt.trim()}>
            {editingLoading ? "Aplicando…" : "Aplicar Edição"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arte?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. A imagem será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Derive Batch Dialog */}
      <DeriveBatchDialog
        open={deriveDialogOpen}
        onOpenChange={setDeriveDialogOpen}
        baseImageUrl={deriveImageUrl}
        basePrompt={prompt}
        style={style}
        projectId={selectedProjectId && selectedProjectId !== "none" ? selectedProjectId : undefined}
        onGenerateBatch={generateBatch}
        onSaveAsset={saveAsset}
      />
    </div>
  );
}
