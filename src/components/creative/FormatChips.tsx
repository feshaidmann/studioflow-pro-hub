import { cn } from "@/lib/utils";
import { FORMAT_OPTIONS, type FormatOption } from "./FormatSelector";
import { MoreHorizontal } from "lucide-react";

const FEATURED_IDS = ["spotify_cover", "instagram_post", "story", "youtube_cover"];

interface Props {
  selected: string;
  onSelect: (format: FormatOption) => void;
  onShowAll: () => void;
}

export default function FormatChips({ selected, onSelect, onShowAll }: Props) {
  const featured = FEATURED_IDS.map((id) => FORMAT_OPTIONS.find((f) => f.id === id)!).filter(Boolean);
  const isOther = !FEATURED_IDS.includes(selected);
  const otherFormat = isOther ? FORMAT_OPTIONS.find((f) => f.id === selected) : null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
      {featured.map((f) => {
        const active = selected === f.id;
        return (
          <button
            key={f.id}
            onClick={() => onSelect(f)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-all shrink-0",
              active
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <f.icon className="h-3 w-3" />
            {f.label}
          </button>
        );
      })}
      {otherFormat && (
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap shrink-0 bg-primary/10 border-primary/30 text-primary"
          onClick={onShowAll}
        >
          <otherFormat.icon className="h-3 w-3" />
          {otherFormat.label}
        </button>
      )}
      <button
        onClick={onShowAll}
        className={cn(
          "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap shrink-0 transition-all",
          "bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <MoreHorizontal className="h-3 w-3" />
        Mais
      </button>
    </div>
  );
}
