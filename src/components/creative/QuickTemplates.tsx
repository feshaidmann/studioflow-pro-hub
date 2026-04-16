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
    prompt: "Capa minimalista e artística para single de música brasileira contemporânea, com tipografia elegante e paleta de cores orgânicas",
    formatId: "spotify_cover",
    style: "Minimalista",
  },
  {
    label: "Post de lançamento",
    icon: Megaphone,
    prompt: "Post de divulgação para lançamento musical, com data de estreia em destaque, visual moderno e envolvente para redes sociais",
    formatId: "instagram_post",
    style: "Moderno",
  },
  {
    label: "Story de bastidores",
    icon: Camera,
    prompt: "Story vertical mostrando bastidores de estúdio com atmosfera intimista, texturas orgânicas e identidade visual autoral",
    formatId: "story",
    style: "Lo-fi / Analógico",
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
