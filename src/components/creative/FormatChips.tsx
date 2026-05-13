import { cn } from "@/lib/utils";
import { FORMAT_OPTIONS, type FormatOption } from "./FormatSelector";
import { MoreHorizontal, Video } from "lucide-react";

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

  const renderChip = (f: FormatOption, active: boolean) => (
    <button
      key={f.id}
      onClick={() => onSelect(f)}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-all shrink-0 min-h-8",
        active
          ? "bg-primary/10 border-primary/30 text-primary"
          : "bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <f.icon className="h-3 w-3" />
      {f.label}
      {f.isVideo && (
        <span className={cn(
          "flex items-center gap-0.5 ml-0.5 px-1 py-0.5 rounded text-[9px] font-semibold",
          active ? "bg-primary/20 text-primary" : "bg-foreground/10 text-foreground/70"
        )}>
          <Video className="h-2.5 w-2.5" />
        </span>
      )}
    </button>
  );

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
      {featured.map((f) => renderChip(f, selected === f.id))}
      {otherFormat && renderChip(otherFormat, true)}
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
