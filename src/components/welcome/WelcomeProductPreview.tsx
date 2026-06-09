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

  const upcoming = MOCK_PROJECT.tasks.slice(0, 4);

  return (
    <section
      className="welcome-fade"
      style={{ "--delay": "150ms" } as React.CSSProperties}
      aria-label="Veja como fica na prática"
    >
      {/* Border gradiente envolvendo o card */}
      <div className="rounded-[2.5rem] bg-gradient-to-r from-orange-500 to-purple-500 p-px">
        <div className="h-full rounded-[calc(2.5rem-1px)] bg-welcome-surface p-6 md:p-8">
          {/* Header */}
          <div className="mb-10 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20 text-orange-400">
                  <Music2 className="h-5 w-5" />
                </div>
                <h3 className="text-2xl font-bold text-white">{MOCK_PROJECT.name}</h3>
              </div>
              <p className="text-sm text-white/40">
                {MOCK_PROJECT.artist} · lançamento {MOCK_PROJECT.releaseDate}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white/80">
              {MOCK_PROJECT.stage}
            </span>
          </div>

          {/* KPIs */}
          <div className="mb-10 grid grid-cols-3 gap-6">
            <Kpi label="Saúde" value={`${MOCK_PROJECT.health}%`} tone="green" />
            <Kpi label="Tarefas" value={`${doneTasks}/${totalTasks}`} tone="orange" />
            <Kpi label="Saldo" value={`R$ ${remaining.toLocaleString("pt-BR")}`} tone="white" />
          </div>

          {/* Orçamento */}
          <div className="mb-8 space-y-2">
            <div className="flex justify-between text-xs font-bold uppercase">
              <span className="text-white/60">
                Orçamento · R$ {MOCK_PROJECT.budget.spent.toLocaleString("pt-BR")} de R${" "}
                {MOCK_PROJECT.budget.total.toLocaleString("pt-BR")}
              </span>
              <span className="text-orange-400">{spentPct}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all"
                style={{ width: `${spentPct}%` }}
              />
            </div>
          </div>

          {/* Alertas + Próximas tarefas */}
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">Alertas</p>
              <div className="space-y-3">
                {MOCK_PROJECT.alerts.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-white/90">
                    {a.tone === "warning" ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                    ) : (
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                    )}
                    <p className="leading-snug">{a.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">
                Próximas tarefas
              </p>
              <div className="space-y-2">
                {upcoming.map((task, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-xs ${
                      task.done ? "text-white/40 line-through" : "text-white/90"
                    }`}
                  >
                    {task.done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-white/30" />
                    ) : (
                      <div
                        className={`h-4 w-4 shrink-0 rounded border ${
                          task.urgent ? "border-orange-500/60" : "border-white/20"
                        }`}
                      />
                    )}
                    <span className="truncate">{task.label}</span>
                    {!task.done && task.urgent && (
                      <span className="ml-auto rounded bg-orange-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        urgente
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
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
  tone: "green" | "orange" | "white";
}) {
  const color =
    tone === "green" ? "text-green-400" : tone === "orange" ? "text-orange-400" : "text-white";
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-widest text-white/40">{label}</p>
      <p className={`font-display text-3xl ${color}`}>{value}</p>
    </div>
  );
}
