import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Wallet, TrendingUp, Percent } from "lucide-react";

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

interface FinancialSummaryProps {
  financials: { totalIncome: number; totalExpense: number; profit: number };
  isSimpleMode?: boolean;
}

export default function FinancialSummary({ financials, isSimpleMode }: FinancialSummaryProps) {
  const margin = financials.totalIncome > 0 ? (financials.profit / financials.totalIncome) * 100 : null;

  const kpis = [
    { label: "Receita Total", value: fmt.format(financials.totalIncome), icon: DollarSign, colorClass: "text-success" },
    { label: "Investimento", value: fmt.format(financials.totalExpense), icon: Wallet, colorClass: "text-amber-400" },
    { label: "Resultado", value: fmt.format(financials.profit), icon: TrendingUp, colorClass: financials.profit >= 0 ? "text-success" : "text-destructive" },
    ...(!isSimpleMode ? [{ label: "Margem", value: margin !== null ? `${margin.toFixed(1)}%` : "—", icon: Percent, colorClass: "text-primary" }] : []),
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 animate-fade-in">
      {kpis.map(({ label, value, icon: Icon, colorClass }, i) => (
        <Card key={label} className="glass-card" style={{ animationDelay: `${i * 60}ms` }}>
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className={`p-1.5 sm:p-2 rounded-lg bg-card/60 shrink-0 ${colorClass}`}>
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{label}</p>
              <p className={`text-xs sm:text-sm font-semibold font-mono-nums truncate ${colorClass}`}>{value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
