import { useState, useEffect } from "react";
import { Download, RefreshCw, Pencil, Layers, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const LOADING_PHASES = [
  "Interpretando sua ideia…",
  "Compondo a arte…",
  "Finalizando…",
];

const VIDEO_LOADING_PHASES = [
  "Interpretando sua ideia…",
  "Compondo a arte…",
  "Renderizando vídeo loop…",
  "Finalizando…",
];

interface Props {
  imageUrl: string | null;
  videoUrl?: string | null;
  isLoading: boolean;
  isVideoMode?: boolean;
  videoStatus?: string | null;
  onRegenerate: () => void;
  onEdit: () => void;
  onDownload: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  onDerive?: () => void;
  formatLabel?: string;
  aspectRatio?: number;
  width?: number;
  height?: number;
}

export default function ImagePreview({
  imageUrl, videoUrl, isLoading, isVideoMode, videoStatus,
  onRegenerate, onEdit, onDownload, onSave, isSaved,
  onDerive, formatLabel, aspectRatio = 1, width, height,
}: Props) {
  const [loadingPhase, setLoadingPhase] = useState(0);

  useEffect(() => {
    if (!isLoading) { setLoadingPhase(0); return; }
    const phases = isVideoMode ? VIDEO_LOADING_PHASES : LOADING_PHASES;
    const interval = setInterval(() => {
      setLoadingPhase((p) => (p + 1) % phases.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isLoading, isVideoMode]);

  const aspectClass = aspectRatio >= 1.5
    ? "aspect-video"
    : aspectRatio <= 0.65
      ? "aspect-[9/16]"
      : "aspect-square";

  // Wider previews for landscape formats; tighter for square/vertical
  const widthClass = aspectRatio >= 1.5 ? "max-w-2xl" : "max-w-md";

  if (isLoading) {
    const phases = isVideoMode ? VIDEO_LOADING_PHASES : LOADING_PHASES;
    return (
      <div className="flex flex-col items-center gap-4">
        <Skeleton className={cn("w-full rounded-xl", widthClass, aspectClass)} />
        <p className="text-sm text-muted-foreground animate-pulse">
          {videoStatus || phases[loadingPhase]}
        </p>
      </div>
    );
  }

  if (!imageUrl && !videoUrl) {
    return (
      <div className="flex items-center justify-center border border-dashed border-border/60 rounded-xl p-12 text-center">
        <p className="text-sm text-muted-foreground">
          Descreva sua ideia acima e clique em <strong>{isVideoMode ? "Gerar Vídeo Loop" : "Gerar"}</strong>.
        </p>
      </div>
    );
  }

  const isShowingVideo = !!videoUrl;
  const downloadLabel = isShowingVideo ? "Baixar .webm" : "Baixar";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={cn("relative rounded-xl overflow-hidden border border-border/40 shadow-sm w-full bg-muted/30", widthClass)}>
        {isShowingVideo ? (
          <video
            src={videoUrl!}
            className="w-full h-auto"
            autoPlay
            loop
            muted
            playsInline
            controls
          />
        ) : (
          <img src={imageUrl!} alt="Imagem gerada" className={cn("w-full h-auto")} />
        )}
      </div>

      {(formatLabel || isShowingVideo) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap justify-center">
          {formatLabel && <span className="bg-muted px-2 py-0.5 rounded-full">{formatLabel}</span>}
          {isShowingVideo && (
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">loop animado</span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-center">
        {onSave && (
          <Button size="sm" onClick={onSave} disabled={isSaved} variant={isSaved ? "outline" : "default"}>
            <Save className="h-3.5 w-3.5 mr-1.5" /> {isSaved ? "Salvo" : "Salvar"}
          </Button>
        )}
        <Button size="sm" variant={onSave ? "outline" : "default"} onClick={onDownload}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> {downloadLabel}
        </Button>
        <Button variant="outline" size="sm" onClick={onRegenerate}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Variação
        </Button>
        {!isShowingVideo && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
          </Button>
        )}
        {onDerive && !isShowingVideo && (
          <Button variant="ghost" size="sm" onClick={onDerive}>
            <Layers className="h-3.5 w-3.5 mr-1.5" /> Desdobrar
          </Button>
        )}
      </div>
    </div>
  );
}
