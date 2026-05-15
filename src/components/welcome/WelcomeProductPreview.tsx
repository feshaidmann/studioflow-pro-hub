import { useMemo } from "react";
import { CheckCircle2, Music2 } from "lucide-react";
import { MOCK_PROJECT } from "./welcome.data";

export function WelcomeProductPreview() {
  const { spentPct, doneTasks, totalTasks } = useMemo(() => {
    const totalTasks = MOCK_PROJECT.tasks.length;
    const doneTasks = MOCK_PROJECT.tasks.filter((t) => t.done).length;
    const spentPct = Math.round((MOCK_PROJECT.budget.spent / MOCK_PROJECT.budget.total) * 100);
    return { spentPct, doneTasks, totalTasks };
  }, []);

  return (
    <section
      className="welcome-fade mt-12 w-full"
      style={{ "--delay": "180ms" } as React.CSSProperties}
    >
      <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
        Veja como fica na prática
      </p>

      <div className="rounded-[var(--radius)] glass-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Music2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{MOCK_PROJECT.name}</p>
              <p className="text-[11px] text-muted-foreground">{MOCK_PROJECT.artist}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning-foreground/80 dark:text-warning">
              {MOCK_PROJECT.stage}
            </span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Lança {MOCK_PROJECT.releaseDate}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/40">
          <div className="p-3 sm:p-4 space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Orçamento
            </p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xl font-semibold tabular-nums">
                  R$ {MOCK_PROJECT.budget.spent.toLocaleString("pt-BR")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  de R$ {MOCK_PROJECT.budget.total.toLocaleString("pt-BR")} orçados
                </p>
              </div>
              <span className="text-xs font-medium text-warning">{spentPct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-warning transition-all"
                style={{ width: `${spentPct}%` }}
              />
            </div>
          </div>

          <div className="p-3 sm:p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Checklist de lançamento
              </p>
              <span className="text-xs font-medium text-primary">
                {doneTasks}/{totalTasks}
              </span>
            </div>
            <ul className="space-y-1.5">
              {MOCK_PROJECT.tasks.map((task, i) => (
                <li key={i} className="flex items-center gap-2">
                  <div
                    className={`h-3.5 w-3.5 rounded-full flex items-center justify-center shrink-0 ${
                      task.done ? "bg-success/20" : task.urgent ? "bg-warning/20" : "bg-secondary"
                    }`}
                  >
                    {task.done && <CheckCircle2 className="h-3 w-3 text-success" />}
                    {!task.done && task.urgent && (
                      <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                    )}
                  </div>
                  <span
                    className={`text-[11px] leading-tight ${
                      task.done
                        ? "line-through text-muted-foreground/50"
                        : task.urgent
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {task.label}
                  </span>
                  {!task.done && task.urgent && (
                    <span className="ml-auto text-[9px] rounded-full bg-warning/25 text-foreground font-semibold px-1.5 py-0.5">
                      urgente
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
