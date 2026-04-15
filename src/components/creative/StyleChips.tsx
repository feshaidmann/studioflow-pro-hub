import { cn } from "@/lib/utils";

const STYLES = [
  { id: "minimalist", label: "Minimalista" },
  { id: "retro", label: "Retro" },
  { id: "neon", label: "Neon" },
  { id: "watercolor", label: "Aquarela" },
  { id: "collage", label: "Colagem" },
  { id: "photorealistic", label: "Fotorrealista" },
  { id: "abstract", label: "Abstrato" },
  { id: "lo-fi", label: "Lo-Fi" },
];

interface Props {
  selected: string | null;
  onSelect: (style: string | null) => void;
}

export default function StyleChips({ selected, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STYLES.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(selected === s.id ? null : s.id)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium border transition-all",
            selected === s.id
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
