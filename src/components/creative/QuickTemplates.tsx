import { Disc3, Megaphone, Camera } from "lucide-react";
import { FORMAT_OPTIONS, type FormatOption } from "./FormatSelector";

export interface QuickTemplate {
  label: string;
  icon: React.ElementType;
  prompt: string;
  formatId: string;
  style: string;
}

export const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    label: "Capa de single",
    icon: Disc3,
    prompt: "Direção visual para capa de single: composição autoral, impacto em miniatura, atmosfera musical brasileira contemporânea e espaço limpo para título e artista",
    formatId: "spotify_cover",
    style: "minimalist",
  },
  {
    label: "Post de lançamento",
    icon: Megaphone,
    prompt: "Arte de campanha para divulgar uma música nova: visual direto, memorável, com energia de lançamento e leitura forte no feed",
    formatId: "instagram_post",
    style: "neon",
  },
  {
    label: "Story de bastidores",
    icon: Camera,
    prompt: "Story vertical para bastidores de lançamento musical: clima íntimo de estúdio, textura real, proximidade com fãs e identidade autoral",
    formatId: "story",
    style: "lo-fi",
  },
];

interface Props {
  onSelect: (template: QuickTemplate) => void;
}

export default function QuickTemplates({ onSelect }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Comece rápido com um template:</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {QUICK_TEMPLATES.map((t) => (
          <button
            key={t.label}
            onClick={() => onSelect(t)}
            className="flex items-center gap-2.5 p-3 rounded-xl border border-border/60 text-left hover:bg-muted/50 hover:border-primary/30 transition-all group"
          >
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <t.icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span className="text-sm font-medium block">{t.label}</span>
              <span className="text-[10px] text-muted-foreground line-clamp-1">{t.prompt.slice(0, 50)}…</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
