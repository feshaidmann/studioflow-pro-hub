import { Download, RefreshCw, Pencil, Layers, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  imageUrl: string | null;
  isLoading: boolean;
  onRegenerate: () => void;
  onEdit: () => void;
  onDownload: () => void;
  onDerive?: () => void;
}

export default function ImagePreview({
  imageUrl, isLoading,
  onRegenerate, onEdit, onDownload, onDerive,
}: Props) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="w-full max-w-md aspect-square rounded-xl" />
        <p className="text-sm text-muted-foreground animate-pulse">Gerando imagem com IA…</p>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="flex items-center justify-center border border-dashed border-border/60 rounded-xl p-12 text-center">
        <p className="text-sm text-muted-foreground">
          Escolha um formato, descreva sua ideia e clique em <strong>Gerar</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative rounded-xl overflow-hidden border border-border/40 shadow-sm max-w-md w-full">
        <img src={imageUrl} alt="Imagem gerada" className="w-full h-auto" />
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
        Salvo automaticamente
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        <Button variant="outline" size="sm" onClick={onRegenerate}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Variação
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
        </Button>
        {onDerive && (
          <Button variant="outline" size="sm" onClick={onDerive}>
            <Layers className="h-3.5 w-3.5 mr-1.5" /> Desdobrar
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onDownload}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar
        </Button>
      </div>
    </div>
  );
}
