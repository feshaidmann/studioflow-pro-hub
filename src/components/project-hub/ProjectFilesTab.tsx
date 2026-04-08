import { FolderOpen, Upload, Music, Image, FileText, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const FILE_CATEGORIES = [
  { key: "audio", label: "Áudio", icon: Music, description: "Stems, mixes, masters, referências" },
  { key: "artwork", label: "Artwork", icon: Image, description: "Capas, thumbnails, promo" },
  { key: "video", label: "Vídeo", icon: Film, description: "Teasers, clipes, reels" },
  { key: "docs", label: "Documentos", icon: FileText, description: "Contratos, splits, letras" },
];

interface ProjectFilesTabProps {
  projectId: string;
}

export default function ProjectFilesTab({ projectId }: ProjectFilesTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Arquivos do Projeto</span>
        <Badge variant="secondary" className="text-[10px]">Em breve</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FILE_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.key} className="rounded-lg border border-dashed border-border p-4 flex items-start gap-3 opacity-70">
              <div className="p-2 rounded-lg bg-muted/50">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{cat.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">0 arquivos</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <Upload className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          A central de arquivos estará disponível em breve.
        </p>
        <p className="text-xs text-muted-foreground/60">
          Você poderá organizar stems, capas, contratos e vídeos diretamente no projeto.
        </p>
      </div>
    </div>
  );
}
