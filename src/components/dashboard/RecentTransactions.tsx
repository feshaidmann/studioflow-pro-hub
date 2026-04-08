import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Transaction } from "@/data/mockData";

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const navigate = useNavigate();

  if (transactions.length === 0) return null;

  return (
    <Card className="glass-card animate-fade-in" style={{ animationDelay: "220ms" }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Últimas Transações
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-xs text-muted-foreground hover:text-primary h-7 px-2"
            onClick={() => navigate("/finance")}
          >
            Ver todas <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/40">
          {[...transactions]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 5)
            .map((tx) => {
              const dateStr = new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
              const isIncome = tx.type === "income";
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/20 transition-colors">
                  <span className="text-xs text-muted-foreground font-mono-nums w-11 shrink-0">{dateStr}</span>
                  <span className="flex-1 text-sm truncate">{tx.description}</span>
                  <span className={`text-sm font-bold font-mono-nums shrink-0 ${isIncome ? "text-success" : "text-destructive"}`}>
                    {isIncome ? "+" : "-"}R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0 ${
                    tx.paid
                      ? "text-success border-success/30 bg-success/10"
                      : "text-muted-foreground border-border/50 bg-secondary/30"
                  }`}>
                    {tx.paid ? "Pago" : "Pendente"}
                  </span>
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}
