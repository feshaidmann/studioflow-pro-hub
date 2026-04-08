import { DollarSign, TrendingUp, Wallet } from "lucide-react";
import { useProjects } from "@/contexts/ProjectContext";

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

interface ProjectFinanceTabProps {
  projectId: string;
}

export default function ProjectFinanceTab({ projectId }: ProjectFinanceTabProps) {
  const { getProjectFinancials, transactions } = useProjects();
  const financials = getProjectFinancials(projectId);
  const projectTransactions = transactions.filter((t) => t.projectId === projectId);

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
          <p className={`text-sm font-semibold font-mono-nums ${financials.profit >= 0 ? "text-success" : "text-destructive"}`}>{fmt.format(financials.profit)}</p>
        </div>
      </div>

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
                  <span className={`text-sm font-bold font-mono-nums shrink-0 ${isIncome ? "text-success" : "text-destructive"}`}>
                    {isIncome ? "+" : "-"}R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0 ${
                    tx.paid ? "text-success border-success/30 bg-success/10" : "text-muted-foreground border-border/50 bg-secondary/30"
                  }`}>
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
