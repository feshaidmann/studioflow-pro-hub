import { Film, Sparkles, Zap, Tv, Minus, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoPreset } from "./VideoLoopGenerator";
import { PRESET_LABELS } from "./VideoLoopGenerator";
import type { Intensity } from "./videoLayers";

interface VideoEffectPickerProps {
  preset: VideoPreset;
  onPresetChange: (p: VideoPreset) => void;
  intensity: Intensity;
  onIntensityChange: (i: Intensity) => void;
}

const PRESET_ICONS: Record<VideoPreset, React.ComponentType<{ className?: string }>> = {
  cinematic: Film,
  dream: Sparkles,
  live: Zap,
  vhs: Tv,
  minimal: Minus,
  energy: PartyPopper,
};

const PRESET_ORDER: VideoPreset[] = ["cinematic", "dream", "minimal", "live", "vhs", "energy"];

const INTENSITY_OPTIONS: Array<{ value: Intensity; label: string }> = [
  { value: "subtle", label: "Sutil" },
  { value: "medium", label: "Médio" },
  { value: "strong", label: "Forte" },
];

export function VideoEffectPicker({ preset, onPresetChange, intensity, onIntensityChange }: VideoEffectPickerProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] text-muted-foreground mb-1.5 block">Estilo do loop</label>
        <div className="grid grid-cols-3 gap-1.5">
          {PRESET_ORDER.map((p) => {
            const Icon = PRESET_ICONS[p];
            const meta = PRESET_LABELS[p];
            const active = preset === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPresetChange(p)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-md border p-2 text-center transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground",
                )}
                title={meta.desc}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px] font-medium leading-tight">{meta.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">{PRESET_LABELS[preset].desc}</p>
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground mb-1.5 block">Intensidade</label>
        <div className="grid grid-cols-3 gap-1.5">
          {INTENSITY_OPTIONS.map((opt) => {
            const active = intensity === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onIntensityChange(opt.value)}
                className={cn(
                  "h-8 rounded-md border text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-accent",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
