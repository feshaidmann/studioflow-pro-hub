import { DollarSign, TrendingUp, TrendingDown, Clock, ArrowUpRight, ArrowDownRight, Minus, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/financeUtils";
import type { useFinancialKpis } from "@/hooks/useFinancialData";

type Kpis = ReturnType<typeof useFinancialKpis>;

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  colorClass,
  trend,
  tooltip,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  colorClass: string;
  trend?: number | null;
  tooltip?: string;
}) {
  return (
    <Card className="glass-card gradient-border animate-fade-in">
      <CardContent className="flex items-start gap-3 p-4">
        <div className={`rounded-lg p-2 shrink-0 ${colorClass}/20`}>
          <Icon className={`h-5 w-5 ${colorClass}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="text-xs text-muted-foreground leading-snug">{label}</p>
            {tooltip && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Ver explicação"
                      className="text-muted-foreground/70 hover:text-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <HelpCircle className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-[11px] leading-snug">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className={`text-lg font-bold font-mono-nums ${colorClass} leading-tight`}>{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
          {trend !== undefined && trend !== null && (
            <div className={`flex items-center gap-0.5 text-[11px] font-medium mt-0.5 ${trend >= 0 ? "text-success" : "text-destructive"}`}>
              {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(trend).toFixed(1)}% vs mês anterior
            </div>
          )}
          {trend === null && (
            <div className="flex items-center gap-0.5 text-[11px] text-muted-foreground mt-0.5">
              <Minus className="h-3 w-3" /> Sem dados anteriores
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function FinancialKpiCards({ kpis }: { kpis: Kpis }) {
  const now = new Date();
  const monthLabel = now.toLocaleDateString("pt-BR", { month: "long" });

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Saldo atual (pagas)"
          value={formatCurrency(kpis.balanceAll)}
          icon={DollarSign}
          colorClass={kpis.balanceAll >= 0 ? "text-success" : "text-destructive"}
          tooltip="Soma de todas as transações marcadas como pagas, em todos os meses. Não considera receitas/despesas pendentes nem o filtro de mês selecionado abaixo."
        />
        <KpiCard
          label={`Receitas — ${monthLabel}`}
          value={formatCurrency(kpis.incomeMonth)}
          icon={TrendingUp}
          colorClass="text-success"
          trend={kpis.incomeMonthTrend}
          tooltip="Receitas pagas neste mês corrente. A variação compara com o mês anterior, ignorando o filtro abaixo."
        />
        <KpiCard
          label={`Despesas — ${monthLabel}`}
          value={formatCurrency(kpis.expenseMonth)}
          icon={TrendingDown}
          colorClass="text-destructive"
          trend={kpis.expenseMonthTrend}
          tooltip="Despesas pagas neste mês corrente. A variação compara com o mês anterior, ignorando o filtro abaixo."
        />
        <KpiCard
          label={`Resultado — ${monthLabel}`}
          value={formatCurrency(kpis.resultMonth)}
          icon={kpis.resultMonth >= 0 ? TrendingUp : TrendingDown}
          colorClass={kpis.resultMonth >= 0 ? "text-success" : "text-destructive"}
          tooltip="Receitas menos despesas pagas neste mês corrente."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="glass-card border-success/20">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg p-2 shrink-0 bg-success/10">
              <Clock className="h-4 w-4 text-success" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">⏳ A receber</p>
              <p className="text-base font-bold font-mono-nums text-success leading-tight">
                {formatCurrency(kpis.pendingIncome)}
              </p>
              <p className="text-[11px] text-muted-foreground">receitas pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-destructive/20">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg p-2 shrink-0 bg-destructive/10">
              <Clock className="h-4 w-4 text-destructive" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">⏳ A pagar</p>
              <p className="text-base font-bold font-mono-nums text-destructive leading-tight">
                {formatCurrency(kpis.pendingExpense)}
              </p>
              <p className="text-[11px] text-muted-foreground">despesas pendentes</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
