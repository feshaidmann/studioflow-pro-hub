import { Film, Sparkles, Zap, Tv, Minus, PartyPopper, Moon, Lightbulb, Camera, Cog, Cloud, MapPin, Sparkle, Sun, Wind, Flame, CircleDot, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoPreset } from "./VideoLoopGenerator";
import { PRESET_LABELS } from "./VideoLoopGenerator";
import type { Intensity, SpotEffect, SpotType } from "./videoLayers";

interface VideoEffectPickerProps {
  preset: VideoPreset;
  onPresetChange: (p: VideoPreset) => void;
  intensity: Intensity;
  onIntensityChange: (i: Intensity) => void;
  spots: SpotEffect[];
  onSpotsChange: (s: SpotEffect[]) => void;
}

const PRESET_ICONS: Record<VideoPreset, React.ComponentType<{ className?: string }>> = {
  cinematic: Film,
  dream: Sparkles,
  live: Zap,
  vhs: Tv,
  minimal: Minus,
  energy: PartyPopper,
  noir: Moon,
  neon: Lightbulb,
  vintage: Camera,
  glitch: Cog,
  etereo: Cloud,
  rua: MapPin,
};

const PRESET_ORDER: VideoPreset[] = [
  "cinematic", "dream", "minimal", "live", "vhs", "energy",
  "noir", "neon", "vintage", "glitch", "etereo", "rua",
];

const INTENSITY_OPTIONS: Array<{ value: Intensity; label: string }> = [
  { value: "subtle", label: "Sutil" },
  { value: "medium", label: "Médio" },
  { value: "strong", label: "Forte" },
];

const SPOT_OPTIONS: Array<{
  value: SpotType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "sparkle", label: "Brilhos", icon: Sparkle },
  { value: "lensflare", label: "Flare", icon: Sun },
  { value: "smokePuff", label: "Fumaça", icon: Wind },
  { value: "emberRise", label: "Brasas", icon: Flame },
  { value: "glowPulse", label: "Halo", icon: CircleDot },
  { value: "textShimmer", label: "Shimmer", icon: Type },
];

// 3x3 grid positions: each cell has (x, y) in 0..1
const POSITIONS: Array<{ x: number; y: number; label: string }> = [
  { x: 0.2, y: 0.2, label: "Sup. Esq." },
  { x: 0.5, y: 0.2, label: "Topo" },
  { x: 0.8, y: 0.2, label: "Sup. Dir." },
  { x: 0.2, y: 0.5, label: "Esq." },
  { x: 0.5, y: 0.5, label: "Centro" },
  { x: 0.8, y: 0.5, label: "Dir." },
  { x: 0.2, y: 0.8, label: "Inf. Esq." },
  { x: 0.5, y: 0.8, label: "Base" },
  { x: 0.8, y: 0.8, label: "Inf. Dir." },
];

const MAX_SPOTS = 2;

function defaultSpotFor(type: SpotType, x: number, y: number): SpotEffect {
  // textShimmer wants a wide horizontal band — center horizontally
  if (type === "textShimmer") {
    return { type, x: 0.5, y, radius: 0.18, intensity: 1 };
  }
  return { type, x, y, radius: type === "lensflare" ? 0.12 : 0.18, intensity: 1 };
}

export function VideoEffectPicker({
  preset, onPresetChange,
  intensity, onIntensityChange,
  spots, onSpotsChange,
}: VideoEffectPickerProps) {
  const toggleSpot = (type: SpotType) => {
    const existing = spots.find((s) => s.type === type);
    if (existing) {
      onSpotsChange(spots.filter((s) => s.type !== type));
      return;
    }
    if (spots.length >= MAX_SPOTS) {
      // Replace the oldest
      const next = [...spots.slice(1), defaultSpotFor(type, 0.5, 0.5)];
      onSpotsChange(next);
      return;
    }
    onSpotsChange([...spots, defaultSpotFor(type, 0.5, 0.5)]);
  };

  const setSpotPosition = (type: SpotType, x: number, y: number) => {
    onSpotsChange(
      spots.map((s) => (s.type === type ? { ...s, x: type === "textShimmer" ? 0.5 : x, y } : s)),
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] text-muted-foreground mb-1.5 block">Estilo do loop</label>
        <div className="grid grid-cols-4 gap-1.5">
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

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] text-muted-foreground">Acentos pontuais</label>
          <span className="text-[10px] text-muted-foreground">{spots.length}/{MAX_SPOTS}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {SPOT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = spots.some((s) => s.type === opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleSpot(opt.value)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-md border p-2 text-center transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] font-medium leading-tight">{opt.label}</span>
              </button>
            );
          })}
        </div>

        {spots.length > 0 && (
          <div className="mt-2 space-y-2">
            {spots.map((spot) => {
              const meta = SPOT_OPTIONS.find((o) => o.value === spot.type);
              if (!meta) return null;
              return (
                <div key={spot.type} className="rounded-md border border-border bg-background/50 p-2">
                  <div className="text-[10px] text-muted-foreground mb-1">
                    Posição de <span className="text-foreground font-medium">{meta.label}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {POSITIONS.map((pos) => {
                      const active = Math.abs(spot.y - pos.y) < 0.05 &&
                        (spot.type === "textShimmer" ? true : Math.abs(spot.x - pos.x) < 0.05);
                      const isActiveCell = active &&
                        (spot.type === "textShimmer"
                          ? Math.abs(spot.y - pos.y) < 0.05 && pos.x === 0.5
                          : Math.abs(spot.x - pos.x) < 0.05 && Math.abs(spot.y - pos.y) < 0.05);
                      return (
                        <button
                          key={`${pos.x}-${pos.y}`}
                          type="button"
                          onClick={() => setSpotPosition(spot.type, pos.x, pos.y)}
                          className={cn(
                            "h-6 rounded border text-[9px] transition-colors",
                            isActiveCell
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border bg-background text-muted-foreground hover:bg-accent",
                          )}
                          title={pos.label}
                        >
                          •
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
