import { cn } from "@/lib/utils";
import {
  STAGE_DESCRIPTION,
  STAGE_LABEL,
  type AudioStage,
} from "@/lib/musicDnaStages";

interface Props {
  value: AudioStage;
  onChange: (stage: AudioStage) => void;
  /** Se true, mostra um chip extra "vindo do projeto" no estágio derivado. */
  derivedFromProject?: AudioStage | null;
  className?: string;
}

const STAGES: AudioStage[] = ["demo", "mix", "master"];

export function StageSelector({ value, onChange, derivedFromProject, className }: Props) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] uppercase tracking-widest font-mono text-muted-foreground">
          Estágio da produção *
        </span>
        {derivedFromProject && (
          <span className="text-[10px] text-muted-foreground">
            sugerido pelo projeto: <span className="font-medium text-foreground/80">{STAGE_LABEL[derivedFromProject]}</span>
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {STAGES.map((s) => {
          const active = value === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-all",
                active
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/40",
              )}
              aria-pressed={active}
            >
              <div className={cn(
                "text-sm font-semibold leading-tight",
                active ? "text-primary" : "text-foreground",
              )}>
                {STAGE_LABEL[s]}
              </div>
              <div className="text-[10px] leading-snug text-muted-foreground mt-1">
                {STAGE_DESCRIPTION[s]}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Define como cobrar a faixa: <strong>Demo</strong> ignora loudness e foca no arranjo;{" "}
        <strong>Mix</strong> cobra balanço/dinâmica; <strong>Master</strong> exige LUFS, True Peak e DR de streaming.
      </p>
    </div>
  );
}

export default StageSelector;
