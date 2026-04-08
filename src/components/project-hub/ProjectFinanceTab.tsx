import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, Wallet, AlertTriangle } from "lucide-react";
import { useProjects } from "@/contexts/ProjectContext";
import { cn } from "@/lib/utils";

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

interface ProjectFinanceTabProps {
  projectId: string;
}

export default function ProjectFinanceTab({ projectId }: ProjectFinanceTabProps) {
  const { getProjectFinancials, transactions, professionals } = useProjects();
  const financials = getProjectFinancials(projectId);
  const projectTransactions = transactions.filter((t) => t.projectId === projectId);
  const team = professionals[projectId] || [];

  // Budget from project
  const { projects } = useProjects();
  const project = projects.find((p) => p.id === projectId);
  const budget = project?.totalContractValue ?? 0;
  const budgetUsed = budget > 0 ? Math.round((financials.totalExpense / budget) * 100) : 0;
  const budgetAtRisk = budgetUsed > 90;

  // Pending fees
  const pendingFees = team.filter((p) => p.fee > 0);
  const totalPendingFees = pendingFees.reduce((acc, p) => acc + p.fee, 0);

  // Pending transactions
  const pendingTxs = projectTransactions.filter((t) => !t.paid);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border p-3 text-center">
          <DollarSign className="h-4 w-4 text-success mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Receita</p>
          <p className="text-sm font-semibold text-success font-mono-nums">{fmt.format(financials.totalIncome)}</p>
        </div>
        <div className="rounded-lg border border-border p-3 text-center">
          <Wallet className="h-4 w-4 text-amber-400 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Despesas</p>
          <p className="text-sm font-semibold text-amber-400 font-mono-nums">{fmt.format(financials.totalExpense)}</p>
        </div>
        <div className="rounded-lg border border-border p-3 text-center">
          <TrendingUp className="h-4 w-4 text-primary mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Resultado</p>
          <p className={cn("text-sm font-semibold font-mono-nums", financials.profit >= 0 ? "text-success" : "text-destructive")}>{fmt.format(financials.profit)}</p>
        </div>
      </div>

      {/* Budget bar */}
      {budget > 0 && (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Orçamento previsto</span>
            <div className="flex items-center gap-1.5">
              {budgetAtRisk && <AlertTriangle className="h-3 w-3 text-destructive" />}
              <span className={cn("text-xs font-mono-nums font-semibold", budgetAtRisk ? "text-destructive" : "text-muted-foreground")}>{budgetUsed}%</span>
            </div>
          </div>
          <Progress value={Math.min(budgetUsed, 100)} className="h-2" />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Gasto: {fmt.format(financials.totalExpense)}</span>
            <span>Previsto: {fmt.format(budget)}</span>
          </div>
        </div>
      )}

      {/* Pending fees */}
      {pendingFees.length > 0 && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-amber-400" /> Cachês pendentes
            </span>
            <Badge variant="secondary" className="text-[10px]">{fmt.format(totalPendingFees)}</Badge>
          </div>
          {pendingFees.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{p.name} ({p.role})</span>
              <span className="font-mono-nums">{fmt.format(p.fee)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pending transactions */}
      {pendingTxs.length > 0 && (
        <div className="rounded-lg border border-border p-3 space-y-1.5">
          <span className="text-xs font-semibold flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Pagamentos pendentes ({pendingTxs.length})
          </span>
          {pendingTxs.slice(0, 5).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate flex-1 mr-2">{tx.description}</span>
              <span className={cn("font-mono-nums shrink-0", tx.type === "income" ? "text-success" : "text-destructive")}>
                {tx.type === "income" ? "+" : "-"}{fmt.format(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Transaction list */}
      {projectTransactions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma transação neste projeto.</p>
      ) : (
        <div className="space-y-1 divide-y divide-border/40">
          {projectTransactions
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 10)
            .map((tx) => {
              const dateStr = new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
              const isIncome = tx.type === "income";
              return (
                <div key={tx.id} className="flex items-center gap-3 py-2">
                  <span className="text-xs text-muted-foreground font-mono-nums w-11 shrink-0">{dateStr}</span>
                  <span className="flex-1 text-sm truncate">{tx.description}</span>
                  <span className={cn("text-sm font-bold font-mono-nums shrink-0", isIncome ? "text-success" : "text-destructive")}>
                    {isIncome ? "+" : "-"}R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0",
                    tx.paid ? "text-success border-success/30 bg-success/10" : "text-muted-foreground border-border/50 bg-secondary/30"
                  )}>
                    {tx.paid ? "Pago" : "Pendente"}
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
