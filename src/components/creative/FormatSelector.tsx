import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Instagram, Youtube, Music, Twitter, Maximize, Image, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface FormatOption {
  id: string;
  label: string;
  width: number;
  height: number;
  icon: React.ElementType;
  description: string;
  isVideo?: boolean;
}

export const FORMAT_OPTIONS: FormatOption[] = [
  { id: "instagram_post", label: "Post Instagram", width: 1080, height: 1080, icon: Instagram, description: "1080×1080" },
  { id: "story", label: "Story estático", width: 1080, height: 1920, icon: Instagram, description: "1080×1920" },
  { id: "youtube_cover", label: "Capa YouTube", width: 1920, height: 1080, icon: Youtube, description: "1920×1080" },
  { id: "spotify_cover", label: "Capa Spotify", width: 3000, height: 3000, icon: Music, description: "3000×3000" },
  { id: "spotify_canvas", label: "Canvas Spotify", width: 1080, height: 1920, icon: Music, description: "1080×1920 · loop animado", isVideo: true },
  { id: "spotify_banner", label: "Banner Spotify", width: 2560, height: 1440, icon: Music, description: "2560×1440" },
  { id: "deezer_cover", label: "Capa Deezer", width: 3000, height: 3000, icon: Image, description: "3000×3000" },
  { id: "tidal_cover", label: "Capa Tidal", width: 3000, height: 3000, icon: Image, description: "3000×3000" },
  { id: "twitter_post", label: "Post Twitter/X", width: 1600, height: 900, icon: Twitter, description: "1600×900" },
  { id: "custom", label: "Livre", width: 1024, height: 1024, icon: Maximize, description: "Custom" },
];

interface FormatGroup {
  label: string;
  ids: string[];
  defaultOpen: boolean;
}

const FORMAT_GROUPS: FormatGroup[] = [
  { label: "Redes Sociais", ids: ["instagram_post", "story", "reels_loop", "twitter_post"], defaultOpen: true },
  { label: "Streaming", ids: ["spotify_cover", "spotify_canvas", "spotify_banner", "deezer_cover", "tidal_cover", "youtube_cover"], defaultOpen: false },
  { label: "Personalizado", ids: ["custom"], defaultOpen: false },
];

interface Props {
  selected: string;
  onSelect: (format: FormatOption) => void;
}

export default function FormatSelector({ selected, onSelect }: Props) {
  const [customWidth, setCustomWidth] = useState(1024);
  const [customHeight, setCustomHeight] = useState(1024);

  const isCustom = selected === "custom";

  // Track which groups are open — auto-open the group containing the selected format
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    FORMAT_GROUPS.forEach((g) => {
      initial[g.label] = g.defaultOpen || g.ids.includes(selected);
    });
    return initial;
  });

  useEffect(() => {
    if (isCustom) {
      const w = Math.max(512, Math.min(1920, customWidth));
      const h = Math.max(512, Math.min(1920, customHeight));
      const customFormat = FORMAT_OPTIONS.find(f => f.id === "custom")!;
      onSelect({ ...customFormat, width: w, height: h, description: `${w}×${h}` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customWidth, customHeight]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const renderFormatButton = (f: FormatOption) => {
    const active = selected === f.id;
    return (
      <button
        key={f.id}
        onClick={() => {
          onSelect(f);
          // Auto-open the group if clicking on a format
        }}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left text-sm",
          active
            ? "border-primary/40 bg-primary/5 text-primary ring-1 ring-primary/20"
            : "border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        )}
      >
        <f.icon className="h-4 w-4 shrink-0" />
        <span className="font-medium text-xs">{f.label}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">{f.description}</span>
      </button>
    );
  };

  return (
    <div className="space-y-2">
      {FORMAT_GROUPS.map((group) => {
        const formats = group.ids.map((id) => FORMAT_OPTIONS.find((f) => f.id === id)!).filter(Boolean);
        const isOpen = openGroups[group.label] ?? group.defaultOpen;
        const hasSelected = group.ids.includes(selected);

        return (
          <Collapsible key={group.label} open={isOpen} onOpenChange={() => toggleGroup(group.label)}>
            <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-left py-1 group">
              <ChevronDown className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform",
                !isOpen && "-rotate-90"
              )} />
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                {group.label}
              </span>
              {hasSelected && !isOpen && (
                <span className="text-[10px] text-primary ml-1">
                  ({formats.find((f) => f.id === selected)?.label})
                </span>
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1.5 mt-1.5 ml-1">
              {formats.map(renderFormatButton)}
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {isCustom && (
        <div className="flex items-center gap-2 ml-1">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Largura (512–1920)</label>
            <Input
              type="number"
              min={512}
              max={1920}
              value={customWidth}
              onChange={(e) => setCustomWidth(Number(e.target.value))}
              className="h-8 text-xs"
            />
          </div>
          <span className="text-muted-foreground mt-4">×</span>
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Altura (512–1920)</label>
            <Input
              type="number"
              min={512}
              max={1920}
              value={customHeight}
              onChange={(e) => setCustomHeight(Number(e.target.value))}
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}
