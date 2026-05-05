import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Palette, Sparkles, ImageIcon, FileText, Dna, X, Music, User,
  CalendarDays, ChevronDown, Video, PlayCircle, FolderKanban,
  ArrowLeft, RefreshCw,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import FormatSelector, { FORMAT_OPTIONS, type FormatOption } from "@/components/creative/FormatSelector";
import StyleChips from "@/components/creative/StyleChips";
import ImagePreview from "@/components/creative/ImagePreview";
import ReferenceImageUpload from "@/components/creative/ReferenceImageUpload";
import DeriveBatchDialog from "@/components/creative/DeriveBatchDialog";
import GalleryLightbox from "@/components/creative/GalleryLightbox";
import CaptionGeneratorCard from "@/components/creative/CaptionGeneratorCard";
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
import { cleanTrackName } from "@/lib/trackName";
import { AIQuotaBadge } from "@/components/ui/ai-quota-badge";
import { trackEvent } from "@/lib/analytics";
import { markChecklistItem } from "@/hooks/useReleaseChecklist";
import { useAuth } from "@/contexts/AuthContext";

// Mapeia formato gerado → chave do Checklist de Lançamento
const FORMAT_TO_CHECKLIST_KEY: Record<string, string> = {
  spotify_cover: "capa",
  deezer_cover: "capa",
  tidal_cover: "capa",
  youtube_cover: "thumbnail",
  reels_loop: "reels",
  story: "stories",
};

// ── Tipos de material — define formato implicitamente ─────────────────────
type MaterialType = "capa" | "post" | "story" | "reels" | "legenda";

const MATERIAL_OPTIONS: Array<{
  id: MaterialType;
  label: string;
  description: string;
  formatId: string;
  icon: string;
}> = [
  { id: "capa",    label: "Capa do single",      description: "3000×3000 · Spotify, Deezer, Tidal", formatId: "spotify_cover",    icon: "🎵" },
  { id: "post",    label: "Post de lançamento",   description: "1080×1080 · Instagram feed",          formatId: "instagram_post",   icon: "📸" },
  { id: "story",   label: "Story",                description: "1080×1920 · Instagram, TikTok",       formatId: "story",            icon: "◻" },
  { id: "reels",   label: "Reels / Shorts loop",  description: "1080×1920 · vídeo loop animado",      formatId: "reels_loop",       icon: "▶" },
  { id: "legenda", label: "Só a legenda",          description: "Texto de divulgação para qualquer canal", formatId: "",            icon: "✏" },
];

// ── Etapas da jornada ─────────────────────────────────────────────────────
type JourneyStep = "configure" | "result" | "caption";

// ── Helpers (mantidos do original) ───────────────────────────────────────
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
  reels_loop: "Loop vertical para Reels/Shorts",
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

// Filtra APENAS jargão de engenharia de áudio sem equivalente visual.
// Instrumentos musicais (violão, guitarra, piano, sanfona, etc.) são PRESERVADOS —
// têm valor direto para direção de arte de capa. Removemos só termos técnicos
// de produção que não correspondem a nenhuma imagem.
const AUDIO_ENGINEERING_TERMS = [
  /\b(lufs|dbtp|dbtfs|rms|true peak|headroom|sidechain|transientes?|compressão|compressor|limiter|equalizador|reverb|delay|plugin|daw|masterização|mixagem|spectral|rolloff|frequência|khz|espectro|dynamic range)\b/gi,
];

function stripEngineeringTerms(value?: string | null): string | null {
  if (!value) return null;
  const cleaned = AUDIO_ENGINEERING_TERMS.reduce((text, pattern) => text.replace(pattern, ""), value)
    .replace(/[()[\]{}]/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .trim();
  return cleaned.length > 2 ? cleaned : null;
}

// Contexto visual por gênero no mercado fonográfico BR
// Ancora a direção de arte na estética real de cada gênero
const GENRE_VISUAL_CONTEXT: Record<string, string> = {
  "Funk Carioca":           "Brazilian Funk visual culture: close-up artist portrait with bold saturated colors, urban street aesthetic, strong graphic typography, raw energy",
  "Sertanejo Universitário":"Brazilian Sertanejo visual: warm earthy tones, countryside or night venue atmosphere, emotional artist imagery, professional photographic quality",
  "Sertanejo Raiz":         "Sertanejo Raiz visual identity: rural Brazilian landscape, acoustic guitar or viola caipira, warm golden-hour light, handmade artisanal aesthetic",
  "MPB Contemporânea":      "Contemporary Brazilian MPB: photographic or fine illustration, restrained palette, contemplative and literary atmosphere, intimate and sophisticated",
  "Samba":                  "Brazilian Samba visual culture: warm percussion instruments, Rio de Janeiro aesthetics, community and celebration, rich ochre and terracotta tones",
  "Pagode":                 "Pagode visual identity: intimate gathering, warm natural light, acoustic Brazilian instruments (cavaquinho, pandeiro), emotional and communal energy",
  "Forró / Piseiro":        "Forró visual culture: Northeastern Brazilian colors, accordion, energetic dance imagery, vibrant warm palette evoking Bahia and Pernambuco interior",
  "Indie BR":               "Brazilian Indie visual: lo-fi photography or illustration, DIY aesthetic, urban São Paulo or Rio scenes, muted film-camera colors, introspective",
  "Rock Alternativo BR":    "Brazilian Alternative Rock: electric guitars, raw urban energy, high contrast photography or graphic art, expressive and rebellious atmosphere",
  "Rap BR":                 "Brazilian Rap/Hip-Hop: urban Brazilian landscapes (favela, periphery, downtown), strong typography, social realism, high contrast photography",
  "R&B / Soul":             "Brazilian R&B/Soul: sensual warm lighting, intimate portrait photography, gradients from deep purple to warm amber, skin texture and emotion",
  "Trap BR":                "Brazilian Trap: dark cinematic mood, blue and purple neon accents, luxury and street aesthetics, dramatic shadows and high contrast",
  "Axé / Pop Bahia":        "Axé/Bahian Pop: vibrant festival colors, Salvador da Bahia imagery, carnival energy, warm tropical light, celebration and movement",
  "Eletrônica / House":     "Brazilian Electronic: abstract geometric patterns, synthetic neon gradients, club and festival atmosphere, futuristic and kinetic energy",
  "Lo-Fi Hip Hop":          "Lo-Fi Hip Hop: cozy interior scenes, soft warm lighting, animation or illustration style, nostalgic analog grain, solitude and study atmosphere",
  "Bossa Nova":             "Bossa Nova: Rio de Janeiro 1960s sophistication, intimate jazz club ambiance, film noir influence, elegant restraint, muted or black-and-white palette",
  "Reggae BR":              "Brazilian Reggae: coastal tropical imagery, relaxed beach community, green and gold and red palette, organic textures, roots and nature",
  "Indie Folk":             "Indie Folk: natural landscapes, forest and mountain imagery, handmade textures, warm analog film photography, quiet introspective atmosphere",
  "Pop Brasileiro":         "Contemporary Brazilian Pop: clean production-forward aesthetics aligned with international pop standards, bright palette, polished artist imagery",
  "Pop Internacional":      "International Pop standards: high production value, global aesthetic, clean contemporary typography, thumbnail-optimized at 40×40px",
};

function buildDNAPrompt(diagnosis: DiagnosisResult, trackName: string, formatId = "spotify_cover"): string {
  const parts: string[] = [];
  const prefix = getFormatPrefix(formatId);
  const genre = diagnosis.genero_classificado;
  const genreVisual = genre ? GENRE_VISUAL_CONTEXT[genre] : null;

  // Gênero + contexto visual do mercado BR
  if (genre && genreVisual) {
    parts.push(`${prefix} for a ${genre} track. Visual context for this genre in the Brazilian phonographic market: ${genreVisual}.`);
  } else if (genre) {
    parts.push(`${prefix} for a ${genre} track.`);
  } else {
    parts.push(`${prefix} for a Brazilian music single.`);
  }

  // Título como inspiração conceitual
  if (trackName.trim()) {
    parts.push(`Use the title "${trackName.trim()}" as conceptual inspiration for visual metaphors, symbols, setting and color palette — without rendering the title text in the image unless the text field is explicitly enabled.`);
  }

  parts.push("Build a clear image structure: well-defined primary subject, background with depth, foreground texture, and breathing room for typography.");

  // Mood — filtra apenas jargão técnico, preserva vocabulário emocional
  const mood = stripEngineeringTerms(diagnosis.identidade?.mood_principal);
  if (mood) parts.push(`Emotional atmosphere: ${mood}.`);

  // Território sonoro — contexto de escuta informa escala e intimidade da cena
  const territory = stripEngineeringTerms(diagnosis.identidade?.territorio_sonoro);
  if (territory) parts.push(`Listening context: ${territory} — let this inform the scene's intimacy, scale and environment.`);

  // Persona do ouvinte — ancora a estética no público-alvo real do gênero
  const persona = stripEngineeringTerms(diagnosis.identidade?.persona_ouvinte);
  if (persona) parts.push(`Target audience: ${persona} — the visual should resonate with this listener profile's aesthetic expectations.`);

  // Tags — agora SEM filtro de instrumentos (violão, sanfona, bateria têm valor visual)
  const tags = diagnosis.identidade?.tags?.filter((t) => t?.trim().length > 0).slice(0, 8);
  if (tags && tags.length > 0) parts.push(`Visual mood keywords: ${tags.join(", ")}.`);

  // Referências próximas — ancora a estética em artistas reais do mercado
  const refs = diagnosis.referencias_proximas;
  if (refs && refs.length > 0) {
    const refArtists = refs.slice(0, 3).map((r) => r.artista).filter(Boolean);
    if (refArtists.length > 0) {
      parts.push(`Closest sonic references: ${refArtists.join(", ")} — draw from the visual identity these artists use in their cover art and promotional materials.`);
    }
  }

  parts.push("Cinematic art direction: 35mm–50mm lens equivalent, moderate depth of field, expressive lighting matching the emotional atmosphere, controlled contrast, cohesive color palette.");
  parts.push("Do not render musical notation, chord charts, audio waveforms, BPM numbers, or any technical audio production elements.");

  return parts.join(" ") || `${prefix} for a Brazilian music single.`;
}

// ── Prefs persistidas ─────────────────────────────────────────────────────
const PREFS_KEY = "sfp_creative_prefs_v2";
type CreativePrefs = {
  materialType?: MaterialType;
  style?: string | null;
  projectId?: string;
  noText?: boolean;
  videoPreset?: VideoPreset;
  loopDuration?: 3 | 4 | 5;
  videoIntensity?: Intensity;
};

function loadPrefs(): CreativePrefs {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(PREFS_KEY) : null;
    return raw ? (JSON.parse(raw) as CreativePrefs) : {};
  } catch {
    return {};
  }
}

// ─────────────────────────────────────────────────────────────────────────
export default function Creative() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectIdParam = searchParams.get("project");
  const dnaParam = searchParams.get("dna");
  const { projects } = useProjects();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const initialPrefs = loadPrefs();

  // ── Estado principal ──────────────────────────────────────────────────
  const [step, setStep] = useState<JourneyStep>("configure");
  const [materialType, setMaterialType] = useState<MaterialType>(
    initialPrefs.materialType ?? "capa",
  );

  // Formato derivado do tipo de material selecionado
  const selectedFormat =
    FORMAT_OPTIONS.find(
      (f) => f.id === (MATERIAL_OPTIONS.find((m) => m.id === materialType)?.formatId ?? "spotify_cover"),
    ) ?? FORMAT_OPTIONS[0];

  // ── Contexto do projeto ───────────────────────────────────────────────
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projectIdParam || initialPrefs.projectId || "none",
  );

  const linkedProject = selectedProjectId && selectedProjectId !== "none"
    ? projects.find((p) => p.id === selectedProjectId)
    : null;

  // ── DNA ───────────────────────────────────────────────────────────────
  const [dnaSource, setDnaSource] = useState<DiagnosisResult | null>(null);
  const [dnaTrackName, setDnaTrackName] = useState("");
  const [dnaAnalysisId, setDnaAnalysisId] = useState<string | null>(null);

  // ── Detalhes da faixa ─────────────────────────────────────────────────
  const [trackName, setTrackName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [additionalText, setAdditionalText] = useState("");
  const [noText, setNoText] = useState<boolean>(initialPrefs.noText ?? false);
  const [trackDetailsOpen, setTrackDetailsOpen] = useState(false);

  // ── Estilo e referência ───────────────────────────────────────────────
  const [style, setStyle] = useState<string | null>(initialPrefs.style ?? null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [styleOpen, setStyleOpen] = useState(false);
  const [showAllFormats, setShowAllFormats] = useState(false);

  // ── Prompt ────────────────────────────────────────────────────────────
  const [prompt, setPrompt] = useState("");

  // ── Geração de imagem ─────────────────────────────────────────────────
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedBase64, setGeneratedBase64] = useState<string | null>(null);
  const [savedToGallery, setSavedToGallery] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [editingLoading, setEditingLoading] = useState(false);

  // ── Vídeo loop ────────────────────────────────────────────────────────
  const [loopDuration, setLoopDuration] = useState<3 | 4 | 5>(initialPrefs.loopDuration ?? 4);
  const [videoPreset, setVideoPreset] = useState<VideoPreset>(initialPrefs.videoPreset ?? "cinematic");
  const [videoIntensity, setVideoIntensity] = useState<Intensity>(initialPrefs.videoIntensity ?? "medium");
  const [videoSpots, setVideoSpots] = useState<SpotEffect[]>([]);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generatedVideoBlob, setGeneratedVideoBlob] = useState<Blob | null>(null);
  const [videoStatus, setVideoStatus] = useState<string | null>(null);
  const [videoRendering, setVideoRendering] = useState(false);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);

  // ── Galeria ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("create");
  const [filterFormat, setFilterFormat] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>(projectIdParam || "all");
  const [gallerySearch, setGallerySearch] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; path: string } | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [deriveDialogOpen, setDeriveDialogOpen] = useState(false);
  const [deriveImageUrl, setDeriveImageUrl] = useState<string>("");

  const {
    assets, captions, captionsLoading, isLoading: assetsLoading,
    generating, generate, generateBatch, generateText,
    saveAsset, deleteAsset, saveCaption, deleteCaption,
  } = useCreativeAssets();

  // ── Persistência de prefs ─────────────────────────────────────────────
  useEffect(() => {
    try {
      const prefs: CreativePrefs = {
        materialType,
        style,
        projectId: selectedProjectId,
        noText,
        videoPreset,
        loopDuration,
        videoIntensity,
      };
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch { /* QuotaExceeded */ }
  }, [materialType, style, selectedProjectId, noText, videoPreset, loopDuration, videoIntensity]);

  // ── Carregamento do DNA via param ─────────────────────────────────────
  useEffect(() => {
    if (!dnaParam) return;
    const loadDNA = async () => {
      let diagnosis: DiagnosisResult | null = null;
      let tName = "";
      let analysisId: string | null = null;

      if (dnaParam === "session") {
        const cached = getCachedAnalysis();
        if (cached) {
          diagnosis = cached.diagnosis;
          tName = cleanTrackName(cached.input?.name || "");
        }
      } else {
        const { data, error } = await supabase
          .from("music_dna_analyses")
          .select("*")
          .eq("id", dnaParam)
          .single();
        if (!error && data) {
          diagnosis = data.diagnosis as unknown as DiagnosisResult;
          tName = cleanTrackName(data.track_name || "");
          analysisId = data.id;
        }
      }

      if (diagnosis) {
        setDnaSource(diagnosis);
        setDnaTrackName(tName);
        setDnaAnalysisId(analysisId);
        setTrackName(tName);
        setTrackDetailsOpen(true);
        setPrompt(buildDNAPrompt(diagnosis, tName, selectedFormat.id));
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

  // ── Pré-popula detalhes da faixa quando vem do projeto (one-shot) ─────
  const projectPrefilledRef = useRef(false);
  useEffect(() => {
    if (projectPrefilledRef.current) return;
    if (!projectIdParam || !linkedProject) return;
    projectPrefilledRef.current = true;
    if (!trackName.trim() && linkedProject.name) {
      setTrackName(cleanTrackName(linkedProject.name));
    }
    if (!artistName.trim() && linkedProject.artist) {
      setArtistName(linkedProject.artist);
    }
    setTrackDetailsOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectIdParam, linkedProject]);

  // ── Analytics: módulo aberto ─────────────────────────────────────────
  useEffect(() => {
    trackEvent("creative_opened", {
      from_project: !!projectIdParam,
      has_dna: !!dnaParam,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Recalcula prompt quando o formato muda (e há DNA ativo) ──────────
  useEffect(() => {
    if (dnaSource) {
      setPrompt(buildDNAPrompt(dnaSource, dnaTrackName, selectedFormat.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFormat.id]);

  // ── Quando o material muda para "legenda", pula direto para caption ───
  useEffect(() => {
    if (materialType === "legenda" && step === "result") {
      setStep("caption");
    }
  }, [materialType, step]);

  // ── Helpers de geração ────────────────────────────────────────────────
  // Não injetamos "Para o projeto X do artista Y" no prompt textual — a IA
  // de imagem renderiza essas strings literalmente como texto na arte.
  // O contexto vai apenas pelos campos estruturados (projectId, dnaContext,
  // trackName, artistName), que controlam tipografia de forma explícita.
  const contextPrompt = prompt;

  const handleGenerate = useCallback(async () => {
    if (materialType === "legenda") {
      setStep("caption");
      return;
    }
    if (!prompt.trim()) {
      toast({ title: "Descreva sua ideia", description: "O campo de prompt não pode estar vazio.", variant: "destructive" });
      return;
    }

    const result = await generate({
      prompt: contextPrompt,
      style,
      format: selectedFormat.id,
      width: selectedFormat.width,
      height: selectedFormat.height,
      editImageUrl: referenceImage || undefined,
      referenceMode: referenceImage ? "identity" : undefined,
      projectId: selectedProjectId !== "none" ? selectedProjectId : undefined,
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
      setStep("result");
      trackEvent("creative_generated", {
        format: selectedFormat.id,
        has_dna: !!dnaSource,
        has_reference: !!referenceImage,
        project_linked: selectedProjectId !== "none",
      });

      if (selectedFormat.isVideo) {
        try {
          setVideoRendering(true);
          setVideoProgress(0);
          setVideoStatus("Renderizando vídeo loop…");
          const blob = await generateVideoLoop({
            imageUrl: result.imageBase64,
            width: selectedFormat.width,
            height: selectedFormat.height,
            durationSec: loopDuration,
            preset: videoPreset,
            intensity: videoIntensity,
            spots: videoSpots,
            onProgress: (p) => setVideoProgress(p),
          });
          const url = URL.createObjectURL(blob);
          setGeneratedVideoBlob(blob);
          setGeneratedVideoUrl(url);
          setVideoStatus(null);
        } catch (e: any) {
          toast({ title: "Erro ao gerar vídeo", description: e?.message || "Falha na renderização", variant: "destructive" });
        } finally {
          setVideoRendering(false);
          setVideoProgress(null);
        }
      }
    }
  }, [
    materialType, prompt, contextPrompt, style, selectedFormat,
    referenceImage, selectedProjectId, trackName, artistName,
    releaseDate, additionalText, noText, loopDuration, videoPreset,
    videoIntensity, videoSpots, generate,
  ]);

  const handleVariation = useCallback(async () => {
    if (!generatedBase64 || !prompt.trim()) { handleGenerate(); return; }
    const result = await generate({
      prompt: `Crie uma variação desta arte mantendo o conceito mas alterando composição e paleta. Conceito original: ${prompt}`,
      style,
      format: selectedFormat.id,
      width: selectedFormat.width,
      height: selectedFormat.height,
      editImageUrl: generatedBase64,
      referenceMode: "variation",
      projectId: selectedProjectId !== "none" ? selectedProjectId : undefined,
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

  const handleEditSubmit = async () => {
    if (!editPrompt.trim() || !generatedBase64) return;
    setEditDialogOpen(false);
    setEditingLoading(true);
    try {
      const result = await generate({
        prompt: editPrompt,
        style,
        format: selectedFormat.id,
        width: selectedFormat.width,
        height: selectedFormat.height,
        editImageUrl: generatedBase64,
        referenceMode: "edit",
        projectId: selectedProjectId !== "none" ? selectedProjectId : undefined,
      });
      if (result) {
        setGeneratedImage(result.imageBase64);
        setGeneratedBase64(result.imageBase64);
        setSavedToGallery(false);
      }
    } finally {
      setEditingLoading(false);
    }
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
      projectId: selectedProjectId !== "none" ? selectedProjectId : undefined,
      videoBlob: generatedVideoBlob || undefined,
    });
    if (result) {
      setSavedToGallery(true);
      trackEvent("creative_saved_to_gallery", {
        format: selectedFormat.id,
        project_linked: selectedProjectId !== "none",
        media_type: generatedVideoBlob ? "video" : "image",
      });

      // Auto-marca item correspondente no checklist do projeto vinculado
      if (selectedProjectId !== "none" && user?.id) {
        const checklistKey = FORMAT_TO_CHECKLIST_KEY[selectedFormat.id];
        if (checklistKey) {
          try {
            const { alreadyChecked, label } = await markChecklistItem(
              selectedProjectId,
              user.id,
              checklistKey,
            );
            if (!alreadyChecked && label) {
              toast({
                title: "Checklist atualizado",
                description: `"${label}" marcado no checklist de lançamento.`,
              });
            }
          } catch {
            /* silencioso — não bloqueia o fluxo */
          }
        }
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteAsset(deleteTarget.id, deleteTarget.path);
    setDeleteTarget(null);
  };

  const handleUseAsReference = (url: string) => {
    setReferenceImage(url);
    setActiveTab("create");
  };

  const handleDerive = (imageUrl: string) => {
    setDeriveImageUrl(imageUrl);
    setDeriveDialogOpen(true);
  };

  // Volta para a etapa de configuração sem perder o contexto
  const handleBackToConfigure = () => {
    setStep("configure");
  };

  // ── Contexto para legenda ─────────────────────────────────────────────
  const dnaCaptionContext = dnaSource
    ? `Gênero: ${dnaSource.genero_classificado || ""}. Mood: ${dnaSource.identidade?.mood_principal || ""}. Território: ${dnaSource.identidade?.territorio_sonoro || ""}. Tags: ${(dnaSource.identidade?.tags || []).join(", ")}`
    : undefined;

  const captionPrompt = [
    linkedProject ? `Projeto: ${linkedProject.name}. Artista do projeto: ${linkedProject.artist}.` : "",
    prompt ? `Direção criativa/estética: ${prompt}` : "",
  ].filter(Boolean).join(" ");

  // ── Galeria ───────────────────────────────────────────────────────────
  const galleryQuery = gallerySearch.trim().toLowerCase();
  const filteredAssets = assets.filter((a) => {
    if (filterFormat !== "all" && a.format !== filterFormat) return false;
    if (filterProject !== "all" && (a.project_id || "") !== filterProject) return false;
    if (galleryQuery) {
      const haystack = `${a.prompt || ""} ${a.style || ""}`.toLowerCase();
      if (!haystack.includes(galleryQuery)) return false;
    }
    return true;
  });
  const hasGalleryFilters = filterFormat !== "all" || filterProject !== "all" || galleryQuery !== "";
  const clearGalleryFilters = () => { setFilterFormat("all"); setFilterProject("all"); setGallerySearch(""); };
  const assetFormats = [...new Set(assets.map((a) => a.format))];
  const assetProjectIds = [...new Set(assets.filter((a) => a.project_id).map((a) => a.project_id!))];

  const isReleaseFormat = ["spotify_cover", "deezer_cover", "tidal_cover"].includes(selectedFormat.id);
  const canGenerate = materialType === "legenda" || prompt.trim().length > 0;

  // ── Label do botão de geração ─────────────────────────────────────────
  const generateLabel = (() => {
    if (generating) return "Gerando…";
    if (videoRendering) {
      return videoProgress != null
        ? `Renderizando vídeo… ${Math.round(videoProgress * 100)}%`
        : "Renderizando vídeo…";
    }
    if (materialType === "legenda") return "Criar legenda";
    if (materialType === "reels") return "Gerar Vídeo Loop";
    if (referenceImage) return "Gerar a partir da referência";
    return `Gerar ${MATERIAL_OPTIONS.find((m) => m.id === materialType)?.label ?? "arte"}`;
  })();

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4 pb-20 md:pb-6">

      {/* Header */}
      <div className="flex items-center gap-2">
        <Palette className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Criativo</h1>
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

        {/* ── ABA CRIAR ───────────────────────────────────────────────── */}
        <TabsContent value="create" className="space-y-4 mt-4">

          {/* ── Context chip do projeto ── */}
          {linkedProject && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FolderKanban className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-primary/70 leading-none mb-0.5">Para o projeto</p>
                  <p className="text-[13px] font-medium text-foreground truncate">{linkedProject.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[12px]">
                  <Link
                    to={`/projects/${linkedProject.id}`}
                    onClick={() => trackEvent("creative_returned_to_project", { from: "context_chip" })}
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                    Voltar ao projeto
                  </Link>
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSelectedProjectId("none");
                    const next = new URLSearchParams(searchParams);
                    next.delete("project");
                    setSearchParams(next, { replace: true });
                  }}
                  aria-label="Remover vínculo com o projeto"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ── DNA chip — entrada nobre ── */}
          {dnaSource && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex justify-between items-center animate-fade-in">
              <div className="flex items-center gap-3">
                <Dna className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    DNA Musical: <span className="text-primary">{dnaTrackName || "faixa"}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dnaSource.genero_classificado || "Gênero"} · Mood: {dnaSource.identidade?.mood_principal || "—"}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px] shrink-0">Ativo</Badge>
              <Button
                variant="ghost" size="icon" className="h-7 w-7 ml-1"
                onClick={() => { setDnaSource(null); setDnaTrackName(""); setDnaAnalysisId(null); setPrompt(""); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              ETAPA: CONFIGURE — configuração completa antes de gerar
          ══════════════════════════════════════════════════════════════ */}
          {step === "configure" && (
            <div className="max-w-3xl space-y-4">

              {/* 1. O que criar — pergunta principal */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">O que você quer criar?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MATERIAL_OPTIONS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMaterialType(m.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        materialType === m.id
                          ? "border-primary/40 bg-primary/5 text-foreground"
                          : "border-border/60 bg-background hover:bg-muted/40 text-foreground"
                      }`}
                    >
                      <span className="text-xl leading-none">{m.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight">{m.label}</p>
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{m.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resto da configuração só aparece se não for "só legenda" */}
              {materialType !== "legenda" && (
                <>
                  {/* 2. Prompt */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Direção criativa
                    </label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Ex: Capa minimalista com atmosfera noturna e tons terrosos para single de MPB"
                      rows={3}
                      className="text-sm resize-none"
                    />
                    {dnaSource && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Sugestão gerada do DNA Musical. Edite à vontade.
                      </p>
                    )}
                  </div>

                  {/* 3. Detalhes da faixa — colapsável */}
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
                            onBlur={() => setTrackName((v) => cleanTrackName(v))}
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
                          placeholder='Ex: "feat. Maria", "EP Vol. 2"'
                          maxLength={60}
                          disabled={noText}
                          className="h-9 text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">{additionalText.length}/60</p>
                      </div>

                      <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/40 p-2.5">
                        <div className="min-w-0">
                          <label htmlFor="noText" className="text-xs font-medium block">Arte sem nenhum texto</label>
                          <p className="text-[10px] text-muted-foreground">Pura composição visual.</p>
                        </div>
                        <Switch id="noText" checked={noText} onCheckedChange={setNoText} />
                      </div>

                      {!linkedProject && projects.length > 0 && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Projeto (opcional)</label>
                          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sem projeto vinculado" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum</SelectItem>
                              {projects.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name} — {p.artist}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* 4. Estilo e referência — colapsável */}
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
                        <label className="text-xs font-medium text-muted-foreground mb-2 block">Imagem de referência (opcional)</label>
                        <ReferenceImageUpload image={referenceImage} onImageChange={setReferenceImage} />
                        {referenceImage && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            A IA usará esta imagem como referência, preservando feições do artista.
                          </p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* 5. Formato avançado — acesso opcional */}
                  <Collapsible open={showAllFormats} onOpenChange={setShowAllFormats}>
                    <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${!showAllFormats ? "-rotate-90" : ""}`} />
                      Formato personalizado
                      <span className="text-[10px] text-muted-foreground ml-1">
                        ({selectedFormat.label} · {selectedFormat.description})
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      <FormatSelector
                        selected={selectedFormat.id}
                        onSelect={(f) => {
                          const match = MATERIAL_OPTIONS.find((m) => m.formatId === f.id);
                          if (match) setMaterialType(match.id);
                          setShowAllFormats(false);
                        }}
                      />
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Configurações de vídeo loop */}
                  {selectedFormat.isVideo && (
                    <div className="border border-primary/30 bg-primary/5 rounded-lg p-3 space-y-3 animate-fade-in">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                        <Video className="h-3.5 w-3.5" />
                        Configurações do loop animado
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1 block">Duração</label>
                        <Select value={String(loopDuration)} onValueChange={(v) => setLoopDuration(Number(v) as 3 | 4 | 5)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 segundos</SelectItem>
                            <SelectItem value="4">4 segundos</SelectItem>
                            <SelectItem value="5">5 segundos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <VideoEffectPicker
                        preset={videoPreset} onPresetChange={setVideoPreset}
                        intensity={videoIntensity} onIntensityChange={setVideoIntensity}
                        spots={videoSpots} onSpotsChange={setVideoSpots}
                      />
                      {isMobile && (
                        <p className="text-[11px] text-muted-foreground bg-muted/30 border border-border rounded-md px-2.5 py-1.5 leading-snug">
                          💡 Renderização de vídeo é mais estável no desktop.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Preview de texto na arte */}
              {materialType !== "legenda" && (
                <div className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Texto na arte</p>
                    {noText ? (
                      <p className="text-xs text-foreground">Sem texto — apenas composição visual</p>
                    ) : trackName.trim() || artistName.trim() || additionalText.trim() ? (
                      <p className="text-xs text-foreground truncate">
                        {[
                          trackName.trim() && `«${trackName.trim()}»`,
                          artistName.trim(),
                          additionalText.trim() && `"${additionalText.trim()}"`,
                        ].filter(Boolean).join(" · ")}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Nenhum texto definido — abra <em>Detalhes da faixa</em> para adicionar
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-muted-foreground">Sem texto</span>
                    <Switch checked={noText} onCheckedChange={setNoText} />
                  </div>
                </div>
              )}

              {/* Botão de geração */}
              <div className="space-y-2">
                <div className="flex justify-center"><AIQuotaBadge variant="text" /></div>
                <Button
                  className="w-full"
                  onClick={handleGenerate}
                  disabled={generating || videoRendering || !canGenerate}
                >
                  {materialType === "reels" || selectedFormat.isVideo
                    ? <Video className="h-4 w-4 mr-1.5" />
                    : <Sparkles className="h-4 w-4 mr-1.5" />}
                  {generateLabel}
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              ETAPA: RESULT — imagem gerada + ação sequencial para legenda
          ══════════════════════════════════════════════════════════════ */}
          {step === "result" && (
            <div className="max-w-3xl space-y-4">

              {/* Botão de voltar para reconfigurar */}
              <button
                onClick={handleBackToConfigure}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className="h-3.5 w-3.5 rotate-90" />
                Editar configurações
              </button>

              {/* Preview da imagem gerada */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {MATERIAL_OPTIONS.find((m) => m.id === materialType)?.label ?? "Arte gerada"}
                  {linkedProject && <span className="text-primary"> · {linkedProject.name}</span>}
                </p>
                <ImagePreview
                  imageUrl={generatedImage}
                  videoUrl={generatedVideoUrl}
                  isLoading={generating || editingLoading || videoRendering}
                  isVideoMode={selectedFormat.isVideo}
                  videoStatus={videoStatus}
                  videoProgress={videoProgress}
                  onRegenerate={handleVariation}
                  onEdit={() => { setEditPrompt(""); setEditDialogOpen(true); }}
                  onDownload={handleDownload}
                  onSave={handleSaveToGallery}
                  isSaved={savedToGallery}
                  onDerive={generatedImage && !generatedVideoUrl ? () => handleDerive(generatedImage) : undefined}
                  formatLabel={selectedFormat.label}
                  aspectRatio={selectedFormat.width / selectedFormat.height}
                  width={selectedFormat.width}
                  height={selectedFormat.height}
                />
              </div>

              {/* ── Prompt contextual para legenda — aparece APÓS a imagem ── */}
              <div className="rounded-xl border border-warning/40 bg-warning/15 p-4">
                <p className="text-sm font-medium mb-1">Quer criar a legenda de lançamento?</p>
                <p className="text-xs text-muted-foreground mb-3">
                  A arte está pronta. Gere a legenda para Instagram, TikTok, WhatsApp ou onde precisar.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setStep("caption")}>
                    <FileText className="h-3.5 w-3.5" />
                    Criar legenda
                  </Button>
                  <Button
                    size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground"
                    onClick={handleBackToConfigure}
                  >
                    Criar outro material
                  </Button>
                </div>
              </div>

              {/* Voltar ao projeto */}
              {linkedProject && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    {savedToGallery ? "✓ Salvo na galeria do projeto" : "Ainda não salvo na galeria"}
                  </span>
                  <Button asChild variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
                    <Link
                      to={`/projects/${linkedProject.id}`}
                      onClick={() => trackEvent("creative_returned_to_project", { from: "result_step" })}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Voltar ao projeto
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              ETAPA: CAPTION — gerador de legenda contextual
          ══════════════════════════════════════════════════════════════ */}
          {step === "caption" && (
            <div className="max-w-3xl space-y-4">

              <button
                onClick={() => setStep(generatedImage ? "result" : "configure")}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className="h-3.5 w-3.5 rotate-90" />
                {generatedImage ? "Ver a arte gerada" : "Voltar para configurações"}
              </button>

              {/* Contexto da legenda */}
              {generatedImage && (
                <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                  <img
                    src={generatedImage}
                    alt="Arte gerada"
                    className="h-12 w-12 object-cover rounded-md shrink-0"
                    style={{ aspectRatio: `${selectedFormat.width}/${selectedFormat.height}` }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium">Arte gerada</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {selectedFormat.label}
                      {trackName && ` · ${trackName}`}
                    </p>
                  </div>
                </div>
              )}

              <CaptionGeneratorCard
                prompt={captionPrompt || prompt}
                dnaContext={dnaCaptionContext}
                trackName={trackName.trim() || dnaTrackName || undefined}
                artistName={artistName.trim() || undefined}
                releaseDate={releaseDate || undefined}
                projectId={selectedProjectId !== "none" ? selectedProjectId : undefined}
                formatLabel={selectedFormat.label}
                captions={captions}
                captionsLoading={captionsLoading}
                generateText={generateText}
                saveCaption={saveCaption}
                deleteCaption={deleteCaption}
              />

              {/* Ações pós-legenda */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline" size="sm" className="h-8 text-xs gap-1.5"
                  onClick={handleBackToConfigure}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Criar outro material
                </Button>
                {linkedProject && (
                  <Button asChild variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
                    <Link
                      to={`/projects/${linkedProject.id}`}
                      onClick={() => trackEvent("creative_returned_to_project", { from: "caption_step" })}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Voltar ao projeto
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}

        </TabsContent>

        {/* ── ABA GALERIA ─────────────────────────────────────────────── */}
        <TabsContent value="gallery" className="mt-4 space-y-4">
          {assets.length > 0 && (
            <div className="flex flex-col gap-2">
              {filterProject !== "all" && projects.find((p) => p.id === filterProject) && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FolderKanban className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-[12px] text-foreground truncate">
                      Filtrando por: <span className="font-medium">{projects.find((p) => p.id === filterProject)?.name}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => setFilterProject("all")}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    aria-label="Remover filtro do projeto"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="relative">
                <Input
                  value={gallerySearch}
                  onChange={(e) => setGallerySearch(e.target.value)}
                  placeholder="Buscar por prompt ou estilo…"
                  className="h-9 text-sm pr-8"
                />
                {gallerySearch && (
                  <button
                    onClick={() => setGallerySearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Limpar busca"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Select value={filterFormat} onValueChange={setFilterFormat}>
                  <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Formato" /></SelectTrigger>
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
                    <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Projeto" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os projetos</SelectItem>
                      {assetProjectIds.map((pid) => {
                        const proj = projects.find((p) => p.id === pid);
                        return <SelectItem key={pid} value={pid}>{proj?.name || "Projeto"}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                )}
                <span className="text-[11px] text-muted-foreground ml-auto">
                  {filteredAssets.length} de {assets.length}
                </span>
              </div>
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
            <div className="text-center py-8 text-muted-foreground space-y-2">
              <p className="text-sm">Nenhuma arte encontrada com esses filtros.</p>
              {hasGalleryFilters && (
                <Button variant="outline" size="sm" onClick={clearGalleryFilters} className="h-8">
                  <X className="h-3.5 w-3.5 mr-1" /> Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredAssets.map((a) => {
                const aspectClass = a.height > a.width
                  ? "aspect-[9/16]" : a.width > a.height ? "aspect-video" : "aspect-square";
                const isVideoAsset = (a as any).media_type === "video";
                return (
                  <Card
                    key={a.id}
                    className="overflow-hidden cursor-pointer group relative"
                    onClick={() => setLightboxIndex(filteredAssets.indexOf(a))}
                  >
                    <CardContent className="p-0 relative">
                      {isVideoAsset ? (
                        <video src={a.public_url || ""} className={`w-full ${aspectClass} object-cover`} muted loop playsInline preload="metadata" />
                      ) : (
                        <img src={a.public_url || ""} alt={a.prompt.slice(0, 60)} className={`w-full ${aspectClass} object-cover`} loading="lazy" />
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

      {/* Lightbox */}
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

      {/* Dialog de edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar com IA</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Descreva as alterações que deseja na imagem.</p>
          <Textarea
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            placeholder="Ex: Remover o fundo, adicionar gradiente azul, colocar o título em letras brancas no topo"
            rows={3}
            className="text-sm resize-none"
          />
          <Button onClick={handleEditSubmit} disabled={editingLoading || !editPrompt.trim()}>
            {editingLoading ? "Aplicando…" : "Aplicar Edição"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Dialog de exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arte?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é irreversível. A imagem será removida permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de derivação em lote */}
      <DeriveBatchDialog
        open={deriveDialogOpen}
        onOpenChange={setDeriveDialogOpen}
        baseImageUrl={deriveImageUrl}
        basePrompt={prompt}
        style={style}
        projectId={selectedProjectId !== "none" ? selectedProjectId : undefined}
        onGenerateBatch={generateBatch}
        onSaveAsset={saveAsset}
      />
    </div>
  );
}
