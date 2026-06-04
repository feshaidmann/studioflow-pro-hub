import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGE_LABEL, type AudioStage } from "@/lib/musicDnaStages";

// ── LOADING VIEW ─────────────────────────────────────────────────────────────

export const ANALYSIS_PHASES: Array<{ key: string; label: string; match: RegExp }> = [
  { key: "read",      label: "Lendo áudio",            match: /Lendo o áudio/i },
  { key: "webaudio",  label: "Analisando waveform",    match: /Web Audio API/i },
  { key: "external",  label: "Buscando referências",   match: /Deezer|Fonte complementar|Sem referência/i },
  { key: "spotify",   label: "Consolidando atributos", match: /atributos estilo Spotify/i },
  { key: "sections",  label: "Mapeando seções",        match: /seções e o perfil/i },
  { key: "proximity", label: "Calculando proximidade", match: /proximidade estética/i },
  { key: "ai",        label: "Diagnóstico IA",         match: /Gerando diagnóstico IA/i },
  { key: "neighbors", label: "Vizinhos do catálogo",   match: /referências artísticas|catálogo/i },
];

export function LoadingView({ trackName, logs, progress, stage }: {
  trackName: string; logs: string[]; progress: number; stage?: AudioStage;
}) {
  const currentLog = logs[logs.length - 1] ?? "Iniciando…";
  const stageLabel = stage ? STAGE_LABEL[stage] : null;

  // Determina o estado de cada fase a partir dos logs já recebidos
  const phaseStates = ANALYSIS_PHASES.map((phase) => {
    const lastIdx = [...logs].reverse().findIndex((l) => phase.match.test(l));
    const reached = lastIdx !== -1;
    const indexFromEnd = reached ? lastIdx : -1;
    return { ...phase, reached, isCurrent: reached && indexFromEnd === 0 };
  });
  // Tudo antes da fase atual conta como concluído
  const currentIdx = phaseStates.findIndex((p) => p.isCurrent);
  phaseStates.forEach((p, i) => {
    if (currentIdx >= 0 && i < currentIdx) p.reached = true;
  });

  const pct = Math.max(2, Math.min(99, Math.round(progress)));

  return (
    <div className="space-y-6 py-2 animate-fade-in">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-6 sm:p-8">
        <div className="absolute inset-0 -z-10 opacity-40 pointer-events-none">
          <div className="absolute -top-20 -right-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl animate-pulse" />
          <div className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-accent/20 blur-3xl animate-pulse [animation-delay:600ms]" />
        </div>

        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-primary/30 blur-md animate-pulse" />
            <div className="relative h-14 w-14 rounded-full bg-background border border-primary/40 flex items-center justify-center text-2xl shadow-sm">
              🧬
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                Analisando
              </Badge>
              {stageLabel && (
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                  Estágio · {stageLabel}
                </Badge>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-semibold truncate" title={trackName}>
              {trackName || "Sua faixa"}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {currentLog}
            </p>
          </div>

          <div className="hidden sm:block text-right shrink-0">
            <div className="text-2xl font-bold tabular-nums leading-none">{pct}%</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
              processando
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-1.5">
          <Progress value={pct} className="h-1.5" />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Pode levar de 20s a 60s</span>
            <span className="sm:hidden tabular-nums font-medium text-foreground">{pct}%</span>
          </div>
        </div>
      </div>

      {/* PHASES */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {phaseStates.map((phase) => {
              const state = phase.isCurrent ? "current" : phase.reached ? "done" : "pending";
              return (
                <li
                  key={phase.key}
                  className={cn(
                    "flex items-center gap-2.5 py-1.5 text-xs transition-colors",
                    state === "pending" && "text-muted-foreground/60",
                    state === "current" && "text-foreground font-medium",
                    state === "done"    && "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                      state === "done"    && "bg-primary/15 border-primary/40 text-primary",
                      state === "current" && "bg-primary border-primary text-primary-foreground",
                      state === "pending" && "bg-muted border-border",
                    )}
                  >
                    {state === "done" && <Check className="h-2.5 w-2.5" />}
                    {state === "current" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground animate-pulse" />
                    )}
                  </span>
                  <span className="truncate">{phase.label}</span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <p className="text-center text-[11px] text-muted-foreground">
        Não feche esta aba — o resultado aparece automaticamente quando terminar.
      </p>
    </div>
  );
}
