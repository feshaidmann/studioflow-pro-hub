import { Download, Upload, Layers, Trash2, Copy } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FORMAT_OPTIONS } from "@/components/creative/FormatSelector";
import type { CreativeAsset } from "@/hooks/useCreativeAssets";
import { toast } from "@/hooks/use-toast";

interface Props {
  asset: CreativeAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (url: string, filename: string) => void;
  onUseAsReference: (url: string) => void;
  onDerive: (url: string) => void;
  onDelete: (id: string, path: string) => void;
  projectName?: string;
}

export default function GalleryDetailSheet({
  asset, open, onOpenChange,
  onDownload, onUseAsReference, onDerive, onDelete, projectName,
}: Props) {
  if (!asset) return null;

  const formatOpt = FORMAT_OPTIONS.find((f) => f.id === asset.format);
  const isVideo = asset.media_type === "video";
  const date = new Date(asset.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(asset.prompt);
    toast({ title: "Prompt copiado!" });
  };

  const fileExt = isVideo ? "webm" : "png";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-sm">Detalhes da arte</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Media */}
          <div className="rounded-xl overflow-hidden border border-border/40 bg-muted/30">
            {isVideo ? (
              <video
                src={asset.public_url || ""}
                className="w-full h-auto max-h-[50vh] object-contain mx-auto"
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
                className="w-full h-auto max-h-[50vh] object-contain mx-auto"
              />
            )}
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
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
            <span>{date}</span>
          </div>

          {/* Full prompt */}
          <div className="bg-muted/40 rounded-lg p-3 relative group">
            <p className="text-sm leading-relaxed">{asset.prompt}</p>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleCopyPrompt}
              title="Copiar prompt"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" onClick={() => { onDownload(asset.public_url || "", `criativo_${asset.format}.${fileExt}`); }}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar
            </Button>
            {!isVideo && (
              <Button variant="outline" size="sm" onClick={() => { onUseAsReference(asset.public_url || ""); onOpenChange(false); }}>
                <Upload className="h-3.5 w-3.5 mr-1.5" /> Usar como ref.
              </Button>
            )}
            {!isVideo && (
              <Button variant="outline" size="sm" onClick={() => { onDerive(asset.public_url || ""); onOpenChange(false); }}>
                <Layers className="h-3.5 w-3.5 mr-1.5" /> Desdobrar
              </Button>
            )}
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => { onDelete(asset.id, asset.storage_path); onOpenChange(false); }}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
