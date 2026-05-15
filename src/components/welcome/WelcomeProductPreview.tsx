import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Music2, Sparkles } from "lucide-react";
import { MOCK_PROJECT } from "./welcome.data";

export function WelcomeProductPreview() {
  const { spentPct, doneTasks, totalTasks, remaining } = useMemo(() => {
    const totalTasks = MOCK_PROJECT.tasks.length;
    const doneTasks = MOCK_PROJECT.tasks.filter((t) => t.done).length;
    const spentPct = Math.round((MOCK_PROJECT.budget.spent / MOCK_PROJECT.budget.total) * 100);
    const remaining = MOCK_PROJECT.budget.total - MOCK_PROJECT.budget.spent;
    return { spentPct, doneTasks, totalTasks, remaining };
  }, []);

  return (
    <section
      className="welcome-fade mt-10 w-full"
      style={{ "--delay": "180ms" } as React.CSSProperties}
    >
      <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
        Veja como fica na prática
      </p>

      <div className="rounded-[var(--radius)] glass-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Music2 className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">{MOCK_PROJECT.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {MOCK_PROJECT.artist} · lança {MOCK_PROJECT.releaseDate}
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {MOCK_PROJECT.stage}
          </span>
        </div>

        {/* KPIs row */}
        <div className="grid grid-cols-3 divide-x divide-border/40 border-b border-border/40">
          <Kpi label="Saúde" value={`${MOCK_PROJECT.health}%`} tone="primary" />
          <Kpi label="Tarefas" value={`${doneTasks}/${totalTasks}`} tone="default" />
          <Kpi label="Saldo" value={`R$ ${remaining.toLocaleString("pt-BR")}`} tone="default" />
        </div>

        {/* Orçamento bar */}
        <div className="px-4 pt-3 pb-2 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              Orçamento · R$ {MOCK_PROJECT.budget.spent.toLocaleString("pt-BR")} de R${" "}
              {MOCK_PROJECT.budget.total.toLocaleString("pt-BR")}
            </span>
            <span className="font-medium text-warning">{spentPct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-warning transition-all"
              style={{ width: `${spentPct}%` }}
            />
          </div>
        </div>

        {/* Alertas (estilo Dashboard) */}
        <div className="px-4 py-2 space-y-1.5 border-t border-border/40">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Alertas do projeto
          </p>
          {MOCK_PROJECT.alerts.map((a, i) => (
            <div key={i} className="flex items-start gap-2">
              {a.tone === "warning" ? (
                <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              )}
              <p className="text-[11px] text-foreground leading-snug">{a.label}</p>
            </div>
          ))}
        </div>

        {/* Próximas tarefas */}
        <div className="px-4 py-3 border-t border-border/40">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-2">
            Próximas tarefas
          </p>
          <ul className="space-y-1.5">
            {MOCK_PROJECT.tasks.slice(0, 4).map((task, i) => (
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
    </section>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "default";
}) {
  return (
    <div className="px-3 py-2.5 text-center">
      <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60">
        {label}
      </p>
      <p
        className={`text-sm font-semibold tabular-nums mt-0.5 ${
          tone === "primary" ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
