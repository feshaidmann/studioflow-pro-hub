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

interface Props {
  imageUrl: string | null;
  isLoading: boolean;
  onRegenerate: () => void;
  onEdit: () => void;
  onDownload: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  onDerive?: () => void;
  formatLabel?: string;
  aspectRatio?: number;
}

export default function ImagePreview({
  imageUrl, isLoading,
  onRegenerate, onEdit, onDownload, onSave, isSaved,
  onDerive, formatLabel, aspectRatio = 1,
}: Props) {
  const [loadingPhase, setLoadingPhase] = useState(0);

  useEffect(() => {
    if (!isLoading) { setLoadingPhase(0); return; }
    const interval = setInterval(() => {
      setLoadingPhase((p) => (p + 1) % LOADING_PHASES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isLoading]);

  const aspectClass = aspectRatio >= 1.5
    ? "aspect-video"
    : aspectRatio <= 0.65
      ? "aspect-[9/16]"
      : "aspect-square";

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Skeleton className={cn("w-full max-w-md rounded-xl", aspectClass)} />
        <p className="text-sm text-muted-foreground animate-pulse">
          {LOADING_PHASES[loadingPhase]}
        </p>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="flex items-center justify-center border border-dashed border-border/60 rounded-xl p-12 text-center">
        <p className="text-sm text-muted-foreground">
          Descreva sua ideia acima e clique em <strong>Gerar</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative rounded-xl overflow-hidden border border-border/40 shadow-sm max-w-md w-full">
        <img src={imageUrl} alt="Imagem gerada" className={cn("w-full h-auto")} />
      </div>

      {formatLabel && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="bg-muted px-2 py-0.5 rounded-full">{formatLabel}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-center">
        {onSave && (
          <Button size="sm" onClick={onSave} disabled={isSaved} variant={isSaved ? "outline" : "default"}>
            <Save className="h-3.5 w-3.5 mr-1.5" /> {isSaved ? "Salvo" : "Salvar"}
          </Button>
        )}
        <Button size="sm" variant={onSave ? "outline" : "default"} onClick={onDownload}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar
        </Button>
        <Button variant="outline" size="sm" onClick={onRegenerate}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Variação
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
        </Button>
        {onDerive && (
          <Button variant="ghost" size="sm" onClick={onDerive}>
            <Layers className="h-3.5 w-3.5 mr-1.5" /> Desdobrar
          </Button>
        )}
      </div>
    </div>
  );
}
