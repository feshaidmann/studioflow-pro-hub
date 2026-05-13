import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProjects } from "@/contexts/ProjectContext";
import type { Transaction } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const navigate = useNavigate();
  const { projects } = useProjects();
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  if (transactions.length === 0) return null;

  return (
    <Card role="region" aria-labelledby="region-transactions-title" className="glass-card animate-fade-in" style={{ animationDelay: "220ms" }}>
      <CardHeader className="pb-3">
        <CardTitle id="region-transactions-title" className="text-base flex items-center gap-2">
          <DollarSign aria-hidden="true" className="h-4 w-4 text-primary" />
          Últimas Transações
          <StatusBadge variant="neutral" aria-label={`${Math.min(transactions.length, 5)} transações exibidas`}>{Math.min(transactions.length, 5)}</StatusBadge>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-xs text-muted-foreground hover:text-primary h-7 px-2"
            onClick={() => navigate("/finance")}
            aria-label="Ver todas as transações"
          >
            Ver todas <ArrowRight aria-hidden="true" className="h-3 w-3 ml-1" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul role="list" className="divide-y divide-border/40 m-0 p-0 list-none">
          {[...transactions]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 5)
            .map((tx) => {
              const dateStr = new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
              const isIncome = tx.type === "income";
              const projectName = tx.projectId ? projectMap[tx.projectId] : null;
              const handleClick = () => {
                if (tx.projectId) navigate(`/projects/${tx.projectId}`);
              };
              const amountStr = `R$ ${tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
              const ariaLabel = `${dateStr}, ${tx.description}, ${isIncome ? "receita" : "despesa"} de ${amountStr}, ${tx.paid ? "pago" : "pendente"}${projectName ? `, projeto ${projectName}` : ""}`;
              const Inner = (
                <>
                  <span className="text-xs text-muted-foreground font-mono-nums w-11 shrink-0" aria-hidden="true">{dateStr}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{tx.description}</div>
                    {projectName && (
                      <div className="text-[10px] text-muted-foreground truncate">{projectName}</div>
                    )}
                  </div>
                  <span aria-hidden="true" className={`text-sm font-bold font-mono-nums shrink-0 ${isIncome ? "text-success" : "text-destructive"}`}>
                    {isIncome ? "+" : "-"}{amountStr}
                  </span>
                  <span aria-hidden="true" className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0 ${
                    tx.paid
                      ? "text-success border-success/30 bg-success/10"
                      : "text-muted-foreground border-border/50 bg-secondary/30"
                  }`}>
                    {tx.paid ? "Pago" : "Pendente"}
                  </span>
                </>
              );
              return (
                <li key={tx.id}>
                  {tx.projectId ? (
                    <button
                      type="button"
                      onClick={handleClick}
                      aria-label={`${ariaLabel}. Abrir projeto.`}
                      className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      {Inner}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-2.5" aria-label={ariaLabel}>
                      {Inner}
                    </div>
                  )}
                </li>
              );
            })}
        </ul>
      </CardContent>
    </Card>
  );
}
