import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, Download, Upload, Layers, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FORMAT_OPTIONS } from "@/components/creative/FormatSelector";
import type { CreativeAsset } from "@/hooks/useCreativeAssets";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  assets: CreativeAsset[];
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIndexChange: (index: number) => void;
  onDownload: (url: string, filename: string) => void;
  onUseAsReference: (url: string) => void;
  onDerive: (url: string) => void;
  onDelete: (id: string, path: string) => void;
  getProjectName?: (projectId: string | null) => string | undefined;
}

export default function GalleryLightbox({
  assets, index, open, onOpenChange, onIndexChange,
  onDownload, onUseAsReference, onDerive, onDelete, getProjectName,
}: Props) {
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const touchStartX = useRef<number | null>(null);

  const asset = assets[index];

  const goPrev = useCallback(() => {
    if (index > 0) {
      setSlideDir("right");
      onIndexChange(index - 1);
      setPromptExpanded(false);
    }
  }, [index, onIndexChange]);

  const goNext = useCallback(() => {
    if (index < assets.length - 1) {
      setSlideDir("left");
      onIndexChange(index + 1);
      setPromptExpanded(false);
    }
  }, [index, assets.length, onIndexChange]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, goPrev, goNext, onOpenChange]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Preload neighbors
  useEffect(() => {
    if (!open) return;
    [index - 1, index + 1].forEach((i) => {
      const a = assets[i];
      if (a?.public_url && a.media_type !== "video") {
        const img = new Image();
        img.src = a.public_url;
      }
    });
  }, [open, index, assets]);

  // Reset slide direction after animation
  useEffect(() => {
    if (slideDir) {
      const t = setTimeout(() => setSlideDir(null), 220);
      return () => clearTimeout(t);
    }
  }, [slideDir, index]);

  if (!open || !asset) return null;

  const isVideo = asset.media_type === "video";
  const formatOpt = FORMAT_OPTIONS.find((f) => f.id === asset.format);
  const projectName = getProjectName?.(asset.project_id);
  const date = new Date(asset.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
  const fileExt = isVideo ? "webm" : "png";

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(asset.prompt);
    toast({ title: "Prompt copiado!" });
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx > 0) goPrev();
      else goNext();
    }
    touchStartX.current = null;
  };

  const content = (
    <div
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col animate-in fade-in-0 duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="text-sm font-medium tabular-nums text-muted-foreground">
          {index + 1} / {assets.length}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={() => onOpenChange(false)}
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Media area */}
      <div
        className="flex-1 min-h-0 flex items-center justify-center px-2 sm:px-4 relative"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Prev */}
        {index > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-background/60 hover:bg-background/90 backdrop-blur z-10"
            onClick={goPrev}
            aria-label="Anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}

        <div
          key={asset.id}
          className={cn(
            "max-w-full max-h-full flex items-center justify-center",
            slideDir === "left" && "animate-in slide-in-from-right-4 fade-in-0 duration-200",
            slideDir === "right" && "animate-in slide-in-from-left-4 fade-in-0 duration-200",
          )}
        >
          {isVideo ? (
            <video
              src={asset.public_url || ""}
              className="max-w-full max-h-[75vh] sm:max-h-[80vh] object-contain rounded-lg shadow-2xl"
              autoPlay
              loop
              muted
              playsInline
              controls
            />
          ) : (
            <img
              src={asset.public_url || ""}
              alt={asset.prompt.slice(0, 60)}
              className="max-w-full max-h-[75vh] sm:max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
          )}
        </div>

        {/* Next */}
        {index < assets.length - 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-background/60 hover:bg-background/90 backdrop-blur z-10"
            onClick={goNext}
            aria-label="Próxima"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}
      </div>

      {/* Bottom info bar */}
      <div className="shrink-0 border-t border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-3 space-y-2.5">
          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {formatOpt && (
              <span className="bg-muted px-2 py-0.5 rounded-full">{formatOpt.label}</span>
            )}
            {isVideo && (
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">vídeo loop</span>
            )}
            <span className="bg-muted px-2 py-0.5 rounded-full">
              {asset.width}×{asset.height}
            </span>
            {asset.style && (
              <span className="bg-muted px-2 py-0.5 rounded-full">{asset.style}</span>
            )}
            {projectName && (
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">{projectName}</span>
            )}
            <span className="ml-auto">{date}</span>
          </div>

          {/* Prompt */}
          <div className="bg-muted/40 rounded-lg p-2.5 relative group">
            <p
              className={cn(
                "text-xs leading-relaxed pr-7 cursor-pointer",
                !promptExpanded && "line-clamp-2"
              )}
              onClick={() => setPromptExpanded((v) => !v)}
              title={promptExpanded ? "Clique para recolher" : "Clique para expandir"}
            >
              {asset.prompt}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6"
              onClick={handleCopyPrompt}
              title="Copiar prompt"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button
              size="sm"
              onClick={() => onDownload(asset.public_url || "", `criativo_${asset.format}.${fileExt}`)}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar
            </Button>
            {!isVideo ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { onUseAsReference(asset.public_url || ""); onOpenChange(false); }}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" /> Usar como ref.
              </Button>
            ) : <div className="hidden sm:block" />}
            {!isVideo ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { onDerive(asset.public_url || ""); onOpenChange(false); }}
              >
                <Layers className="h-3.5 w-3.5 mr-1.5" /> Desdobrar
              </Button>
            ) : <div className="hidden sm:block" />}
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => { onDelete(asset.id, asset.storage_path); }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
