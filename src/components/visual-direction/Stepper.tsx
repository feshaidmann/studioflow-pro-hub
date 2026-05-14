import { Check } from "lucide-react";

export type StepKey = "profile" | "generation" | "review" | "briefing";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "profile", label: "Perfil" },
  { key: "generation", label: "Geração" },
  { key: "review", label: "Revisão" },
  { key: "briefing", label: "Briefing" },
];

export default function Stepper({ current }: { current: StepKey }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="flex items-center gap-1.5 md:gap-3 text-xs" aria-label="Progresso">
      {STEPS.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <li key={s.key} className="flex items-center gap-1.5 md:gap-2">
            <span
              className={`flex items-center justify-center w-6 h-6 rounded-full border text-[11px] font-medium ${
                done
                  ? "bg-primary text-primary-foreground border-primary"
                  : active
                  ? "border-primary text-primary"
                  : "border-border text-muted-foreground"
              }`}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span className={`hidden sm:inline ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="w-4 md:w-6 h-px bg-border" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
