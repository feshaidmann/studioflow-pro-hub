import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/financeUtils";
import type { Project } from "@/data/mockData";

interface Props {
  projects: Project[];
  getProjectFinancials: (id: string) => { totalIncome: number; totalExpense: number; profit: number };
}

export function ActiveProjectsCarousel({ projects, getProjectFinancials }: Props) {
  const projectsWithBalance = projects
    .filter((p) => !p.completed)
    .map((p) => ({ ...p, fin: getProjectFinancials(p.id) }))
    .filter((p) => p.fin.totalIncome > 0 || p.fin.totalExpense > 0);

  if (projectsWithBalance.length === 0) return null;

  return (
    <div>
      <p className="text-sm font-semibold mb-3 text-foreground">Projetos ativos</p>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {projectsWithBalance.map((p) => (
          <Card key={p.id} className="glass-card shrink-0 snap-start w-52">
            <CardContent className="p-4 space-y-2">
              <p className="text-sm font-semibold truncate" title={p.name}>{p.name}</p>
              <p className="text-xs text-muted-foreground truncate">{p.artist || "—"}</p>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-muted-foreground">Saldo</span>
                <span className={`font-bold font-mono-nums ${p.fin.profit >= 0 ? "text-success" : "text-destructive"}`}>
                  {p.fin.profit >= 0 ? "+" : ""}{formatCurrency(p.fin.profit)}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span className="text-success">+{formatCurrency(p.fin.totalIncome)}</span>
                <span className="text-destructive">-{formatCurrency(p.fin.totalExpense)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
