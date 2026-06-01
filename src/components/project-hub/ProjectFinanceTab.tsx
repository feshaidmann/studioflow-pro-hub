import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, Wallet, AlertTriangle, BarChart3, Music } from "lucide-react";
import { useProjects } from "@/contexts/ProjectContext";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/data/mockData";

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtCents = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

interface ProjectFinanceTabProps {
  projectId: string;
}

/* ── Cost stage mapping ── */
export const STAGE_CATEGORIES: Record<string, string[]> = {
  "Gravação":    ["Estúdio/Gravação", "Músicos/Session Players"],
  "Mixagem":     ["Mixagem/Masterização"],
  "Arte/Design": ["Arte/Design"],
  "Audiovisual": ["Audiovisual/Clipe"],
  "Marketing":   ["Marketing/Impulsionamento"],
  "Outros":      [
    "Distribuição/Agregador", "Registro/Jurídico", "Equipamento/Hardware",
    "Software/Plugins", "Transporte/Logística", "Alimentação",
    "Manutenção/Instrumentos", "Serviços/Assinaturas", "Taxas/Impostos",
    "Cursos/Formação", "Outros",
  ],
};

// "Mixagem" and "Master" both mapped to the same category — keep one entry.
// (Previously "Master" was a duplicate key of "Mixagem/Masterização".)

/* ── Pure calculation helpers (exported for testing) ── */

export interface BudgetStats {
  budgetUsed: number;   // 0–100+ (percentage)
  budgetAtRisk: boolean;
  budgetRemaining: number;
}

export function computeBudgetStats(budget: number, totalExpense: number): BudgetStats | null {
  if (budget <= 0) return null;
  const budgetUsed = Math.round((totalExpense / budget) * 100);
  return {
    budgetUsed,
    budgetAtRisk: budgetUsed > 90,
    budgetRemaining: budget - totalExpense,
  };
}

export function groupExpensesByStage(
  transactions: Transaction[],
  stageCategories: Record<string, string[]>,
): Array<{ stage: string; total: number }> {
  const paidExpenses = transactions.filter((t) => t.type === "expense" && t.paid);
  return Object.entries(stageCategories)
    .map(([stage, cats]) => ({
      stage,
      total: paidExpenses
        .filter((t) => cats.includes(t.category))
        .reduce((sum, t) => sum + t.amount, 0),
    }))
    .filter((s) => s.total > 0);
}

const CACHE_RE = /Cachê\s*—\s*([^(]+)/;

export function parseTrackExpenses(transactions: Transaction[]): Record<string, number> {
  const result: Record<string, number> = {};
  transactions
    .filter((t) => t.type === "expense" && t.category === "Músicos/Session Players")
    .forEach((t) => {
      const match = CACHE_RE.exec(t.description);
      const key = match ? match[1].trim() : t.description;
      result[key] = (result[key] ?? 0) + t.amount;
    });
  return result;
}

/* ── Component ── */

const PENDING_TX_LIMIT = 5;
const TX_LIST_LIMIT = 10;

export default function ProjectFinanceTab({ projectId }: ProjectFinanceTabProps) {
  const { getProjectFinancials, transactions, professionals, projects } = useProjects();

  const project = projects.find((p) => p.id === projectId);
  const financials = getProjectFinancials(projectId);
  const projectTransactions = transactions.filter((t) => t.projectId === projectId);
  const team = professionals[projectId] ?? [];

  const budgetStats = computeBudgetStats(project?.totalContractValue ?? 0, financials.totalExpense);

  const pendingFees = team.filter((p) => p.fee > 0);
  const totalPendingFees = pendingFees.reduce((acc, p) => acc + p.fee, 0);

  const pendingTxs = projectTransactions.filter((t) => !t.paid);
  const pendingTxsHidden = Math.max(0, pendingTxs.length - PENDING_TX_LIMIT);

  const costByStage = groupExpensesByStage(projectTransactions, STAGE_CATEGORIES);
  const maxStageCost = costByStage.reduce((max, s) => Math.max(max, s.total), 1);

  const trackExpenses = parseTrackExpenses(projectTransactions);
  const hasTrackCosts = Object.keys(trackExpenses).length > 0;

  const sortedTxs = [...projectTransactions].sort((a, b) => b.date.localeCompare(a.date));
  const txsHidden = Math.max(0, sortedTxs.length - TX_LIST_LIMIT);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border p-3 text-center">
          <DollarSign className="h-4 w-4 text-[hsl(var(--success))] mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Receita</p>
          <p className="text-sm font-semibold text-[hsl(var(--success))] font-mono-nums">{fmt.format(financials.totalIncome)}</p>
        </div>
        <div className="rounded-lg border border-border p-3 text-center">
          <Wallet className="h-4 w-4 text-warning mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Despesas pagas</p>
          <p className="text-sm font-semibold text-warning font-mono-nums">{fmt.format(financials.totalExpense)}</p>
        </div>
        <div className="rounded-lg border border-border p-3 text-center">
          <TrendingUp className="h-4 w-4 text-primary mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Resultado</p>
          <p className={cn("text-sm font-semibold font-mono-nums", financials.profit >= 0 ? "text-[hsl(var(--success))]" : "text-destructive")}>
            {fmt.format(financials.profit)}
          </p>
        </div>
      </div>

      {/* Budget: previsto vs realizado */}
      {budgetStats && (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Orçamento: Previsto vs Realizado</span>
            <div className="flex items-center gap-1.5">
              {budgetStats.budgetAtRisk && <AlertTriangle className="h-3 w-3 text-destructive" />}
              <span className={cn("text-xs font-mono-nums font-semibold", budgetStats.budgetAtRisk ? "text-destructive" : "text-muted-foreground")}>
                {budgetStats.budgetUsed}%
              </span>
            </div>
          </div>
          <Progress value={Math.min(budgetStats.budgetUsed, 100)} className="h-2" />
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="text-center">
              <p className="text-muted-foreground">Previsto</p>
              <p className="font-semibold font-mono-nums">{fmt.format(project?.totalContractValue ?? 0)}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Gasto</p>
              <p className="font-semibold font-mono-nums text-warning">{fmt.format(financials.totalExpense)}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Restante</p>
              <p className={cn("font-semibold font-mono-nums", budgetStats.budgetRemaining >= 0 ? "text-[hsl(var(--success))]" : "text-destructive")}>
                {fmt.format(budgetStats.budgetRemaining)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cost by stage (paid only) */}
      {costByStage.length > 0 && (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <span className="text-xs font-semibold flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-primary" /> Custo por etapa
            <span className="text-muted-foreground font-normal">(pagas)</span>
          </span>
          <div className="space-y-1.5">
            {costByStage.map((s) => (
              <div key={s.stage} className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{s.stage}</span>
                  <span className="font-mono-nums font-medium">{fmt.format(s.total)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/60 transition-all"
                    style={{ width: `${(s.total / maxStageCost) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost per musician */}
      {hasTrackCosts && (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <span className="text-xs font-semibold flex items-center gap-1.5">
            <Music className="h-3.5 w-3.5 text-primary" /> Custo por músico
          </span>
          <div className="space-y-1.5">
            {Object.entries(trackExpenses).map(([name, total]) => (
              <div key={name} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate flex-1 mr-2">{name}</span>
                <span className="font-mono-nums font-medium">{fmt.format(total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending fees */}
      {pendingFees.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-warning" /> Cachês pendentes
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
            <AlertTriangle className="h-3.5 w-3.5 text-warning" /> Pagamentos pendentes ({pendingTxs.length})
          </span>
          {pendingTxs.slice(0, PENDING_TX_LIMIT).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate flex-1 mr-2">{tx.description}</span>
              <span className={cn("font-mono-nums shrink-0", tx.type === "income" ? "text-[hsl(var(--success))]" : "text-destructive")}>
                {tx.type === "income" ? "+" : "−"}{fmt.format(tx.amount)}
              </span>
            </div>
          ))}
          {pendingTxsHidden > 0 && (
            <p className="text-[10px] text-muted-foreground text-center pt-0.5">
              + {pendingTxsHidden} pagamento{pendingTxsHidden > 1 ? "s" : ""} não exibido{pendingTxsHidden > 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      {/* Transaction list */}
      {projectTransactions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma transação neste projeto.</p>
      ) : (
        <div className="space-y-1 divide-y divide-border/40">
          {sortedTxs.slice(0, TX_LIST_LIMIT).map((tx) => {
            const dateStr = new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
            const isIncome = tx.type === "income";
            return (
              <div key={tx.id} className="flex items-center gap-3 py-2">
                <span className="text-xs text-muted-foreground font-mono-nums w-11 shrink-0">{dateStr}</span>
                <span className="flex-1 text-sm truncate">{tx.description}</span>
                <span className={cn("text-sm font-bold font-mono-nums shrink-0", isIncome ? "text-[hsl(var(--success))]" : "text-destructive")}>
                  {isIncome ? "+" : "−"}{fmtCents.format(tx.amount)}
                </span>
                <span className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0",
                  tx.paid
                    ? "text-[hsl(var(--success))] border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.1)]"
                    : "text-muted-foreground border-border/50 bg-secondary/30",
                )}>
                  {tx.paid ? "Pago" : "Pendente"}
                </span>
              </div>
            );
          })}
          {txsHidden > 0 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              + {txsHidden} transaç{txsHidden > 1 ? "ões" : "ão"} mais antigas não exibida{txsHidden > 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
