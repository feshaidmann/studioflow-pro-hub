import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Instagram, Youtube, Music, Twitter, Monitor, Maximize, Image } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface FormatOption {
  id: string;
  label: string;
  width: number;
  height: number;
  icon: React.ElementType;
  description: string;
}

export const FORMAT_OPTIONS: FormatOption[] = [
  { id: "instagram_post", label: "Post Instagram", width: 1080, height: 1080, icon: Instagram, description: "1080×1080" },
  { id: "story", label: "Story / Reels", width: 1080, height: 1920, icon: Instagram, description: "1080×1920" },
  { id: "youtube_cover", label: "Capa YouTube", width: 1280, height: 720, icon: Youtube, description: "1280×720" },
  { id: "spotify_cover", label: "Capa Spotify", width: 1920, height: 1920, icon: Music, description: "3000×3000" },
  { id: "spotify_canvas", label: "Canvas Spotify", width: 1080, height: 1920, icon: Music, description: "1080×1920 (vídeo/loop)" },
  { id: "spotify_banner", label: "Banner Spotify", width: 1280, height: 720, icon: Music, description: "1280×720" },
  { id: "deezer_cover", label: "Capa Deezer", width: 1920, height: 1920, icon: Image, description: "3000×3000" },
  { id: "tidal_cover", label: "Capa Tidal", width: 1920, height: 1920, icon: Image, description: "3000×3000" },
  { id: "twitter_post", label: "Post Twitter/X", width: 1600, height: 900, icon: Twitter, description: "1600×900" },
  { id: "custom", label: "Livre", width: 1024, height: 1024, icon: Maximize, description: "Custom" },
];

interface Props {
  selected: string;
  onSelect: (format: FormatOption) => void;
}

export default function FormatSelector({ selected, onSelect }: Props) {
  const [customWidth, setCustomWidth] = useState(1024);
  const [customHeight, setCustomHeight] = useState(1024);

  const isCustom = selected === "custom";

  useEffect(() => {
    if (isCustom) {
      const w = Math.max(512, Math.min(1920, customWidth));
      const h = Math.max(512, Math.min(1920, customHeight));
      const customFormat = FORMAT_OPTIONS.find(f => f.id === "custom")!;
      onSelect({ ...customFormat, width: w, height: h, description: `${w}×${h}` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customWidth, customHeight]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {FORMAT_OPTIONS.map((f) => {
          const active = selected === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onSelect(f)}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center min-h-[80px] justify-center",
                active
                  ? "border-primary/40 bg-primary/5 text-primary ring-1 ring-primary/20"
                  : "border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <f.icon className="h-5 w-5" />
              <span className="text-xs font-medium leading-tight">{f.label}</span>
              <span className="text-[10px] text-muted-foreground">{f.description}</span>
            </button>
          );
        })}
      </div>

      {isCustom && (
        <div className="flex items-center gap-2">
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
