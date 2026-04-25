import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle2,
  Search,
  BarChart2,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Download,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useProjects } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { type Transaction } from "@/data/mockData";
import TransactionForm from "@/components/finance/TransactionForm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import ProjectAISheet from "@/components/project-hub/ProjectAISheet";
import { MobileStickyHeader } from "@/components/ui/mobile-sticky-header";

// ─── Helpers ────────────────────────────────────────────────────────────────

function monthKey(date: string) {
  return date.slice(0, 7);
}

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pctChange(curr: number, prev: number) {
  if (!prev) return null;
  return ((curr - prev) / prev) * 100;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
];

// ─── KPI Card ───────────────────────────────────────────────────────────────

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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function FinancialTracker() {
  const { t } = useLanguage();
  const { transactions, projects, deleteTransaction, getProjectFinancials } = useProjects();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [formOpen, setFormOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [finAiOpen, setFinAiOpen] = useState(false);

  // Pending fees by collaborator
  interface PendingFee {
    name: string;
    role: string;
    projectName: string;
    fee: number;
    feePaid: boolean;
  }
  const [pendingFees, setPendingFees] = useState<PendingFee[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("project_members")
      .select("name, role, fee, project_id, projects(name)")
      .eq("user_id", user.id)
      .gt("fee", 0)
      .then(({ data }) => {
        if (data) {
          // Check which have unpaid transactions
          const fees: PendingFee[] = data.map((d: any) => ({
            name: d.name,
            role: d.role,
            projectName: d.projects?.name || "—",
            fee: d.fee,
            feePaid: false,
          }));
          // Match against paid transactions with matching description
          const paidDescs = new Set(
            transactions
              .filter((t) => t.type === "expense" && t.paid)
              .map((t) => t.description.toLowerCase())
          );
          setPendingFees(
            fees.map((f) => ({
              ...f,
              feePaid: paidDescs.has(`cachê ${f.name}`.toLowerCase()) ||
                       paidDescs.has(`cache ${f.name}`.toLowerCase()) ||
                       paidDescs.has(f.name.toLowerCase()),
            })).filter((f) => !f.feePaid)
          );
        }
      });
  }, [user, transactions]);

  // Filters
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("current");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Pagination
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  // ── Dates ──
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  // All months available
  const months = useMemo(() =>
    Array.from(new Set(transactions.map((t) => monthKey(t.date)))).sort().reverse(),
    [transactions]
  );

  // Reset to page 1 sempre que filtros/busca mudam (efeito colateral fora do useMemo)
  useEffect(() => {
    setPage(1);
  }, [filterProject, filterType, filterMonth, filterStatus, search]);

  // ── Filtered transactions (puro, sem efeitos colaterais) ──
  const filtered = useMemo(() => {
    let list = [...transactions];
    if (filterProject !== "all") list = list.filter((t) => t.projectId === filterProject);
    if (filterType !== "all") list = list.filter((t) => t.type === filterType);
    if (filterMonth === "current") list = list.filter((t) => t.date.startsWith(currentMonth));
    else if (filterMonth !== "all") list = list.filter((t) => t.date.startsWith(filterMonth));
    if (filterStatus === "paid") list = list.filter((t) => t.paid);
    else if (filterStatus === "pending") list = list.filter((t) => !t.paid);
    if (search.trim()) list = list.filter((t) =>
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
    );
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, filterProject, filterType, filterMonth, filterStatus, search, currentMonth]);

  // ── Pagination ──
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── KPI calculations ──
  const kpis = useMemo(() => {
    const currTxs = transactions.filter((t) => monthKey(t.date) === currentMonth);
    const prevTxs = transactions.filter((t) => monthKey(t.date) === prevMonth);

    const sumPaid = (list: Transaction[], type: string) =>
      list.filter((t) => t.type === type && t.paid).reduce((s, t) => s + t.amount, 0);
    const sumPending = (list: Transaction[], type: string) =>
      list.filter((t) => t.type === type && !t.paid).reduce((s, t) => s + t.amount, 0);

    const incomeMonth = sumPaid(currTxs, "income");
    const expenseMonth = sumPaid(currTxs, "expense");
    const incomePrev = sumPaid(prevTxs, "income");
    const expensePrev = sumPaid(prevTxs, "expense");

    const pendingIncome = sumPending(transactions, "income");
    const pendingExpense = sumPending(transactions, "expense");

    const balanceAll = transactions
      .filter((t) => t.paid)
      .reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);

    const resultMonth = incomeMonth - expenseMonth;

    return {
      balanceAll,
      incomeMonth,
      expenseMonth,
      resultMonth,
      incomeMonthTrend: pctChange(incomeMonth, incomePrev),
      expenseMonthTrend: pctChange(expenseMonth, expensePrev),
      pendingIncome,
      pendingExpense,
    };
  }, [transactions, currentMonth, prevMonth]);

  // ── 6-month evolution chart ──
  const evolutionData = useMemo(() => {
    const result: Array<{ mes: string; receitas: number; despesas: number; saldo: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const monthTxs = transactions.filter((t) => monthKey(t.date) === mk && t.paid);
      const receitas = monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const despesas = monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      result.push({ mes: label, receitas, despesas, saldo: receitas - despesas });
    }
    return result;
  }, [transactions]);

  // ── Category breakdown for reports ──
  const categoryData = useMemo(() => {
    const catMap: Record<string, { name: string; total: number; type: string }> = {};
    const reportTxs = filterMonth === "current"
      ? transactions.filter((t) => monthKey(t.date) === currentMonth)
      : filterMonth !== "all"
        ? transactions.filter((t) => monthKey(t.date) === filterMonth)
        : transactions;

    for (const t of reportTxs.filter((t) => t.paid)) {
      const cat = t.category === "Outros" && t.customCategory ? `Outros (${t.customCategory})` : t.category;
      if (!catMap[cat]) catMap[cat] = { name: cat, total: 0, type: t.type };
      catMap[cat].total += t.amount;
    }
    return Object.values(catMap).sort((a, b) => b.total - a.total);
  }, [transactions, filterMonth, currentMonth]);

  const categoryIncome = categoryData.filter((c) => c.type === "income");
  const categoryExpense = categoryData.filter((c) => c.type === "expense");

  // ── Cash-flow report ──
  const cashflowData = useMemo(() => {
    const reportMonths = months.slice(0, 6).reverse();
    return reportMonths.map((mk) => {
      const txs = transactions.filter((t) => monthKey(t.date) === mk && t.paid);
      const entradas = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const saidas = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      return { mes: mk, entradas, saidas, saldo: entradas - saidas };
    });
  }, [transactions, months]);

  // ── Helpers ──
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "—";

  const handleDelete = () => {
    if (!deleteId) return;
    deleteTransaction(deleteId);
    setDeleteId(null);
    toast.success("Transação removida do seu histórico.");
  };

  const selectedMonthLabel = filterMonth === "current"
    ? "Mês atual"
    : filterMonth === "all"
      ? "Todos os meses"
      : filterMonth;

  // ── CSV Export ──
  const handleExportCSV = () => {
    const rows = filtered.map((tx) => ({
      Data: new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR"),
      Tipo: tx.type === "income" ? "Receita" : "Despesa",
      Descrição: tx.description,
      Valor: tx.amount.toFixed(2),
      Status: tx.paid ? "Pago" : "Pendente",
      Categoria: tx.category === "Outros" && tx.customCategory
        ? `Outros (${tx.customCategory})`
        : tx.category,
      Projeto: tx.projectId ? (projects.find((p) => p.id === tx.projectId)?.name ?? "") : "",
      Observações: tx.notes ?? "",
    }));

    const csv = Papa.unparse(rows, { delimiter: ";", newline: "\r\n" });
    const bom = "\uFEFF"; // UTF-8 BOM for Excel compatibility
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const label = selectedMonthLabel.replace(/\s+/g, "_");
    a.download = `transacoes_${label}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} transações exportadas`);
  };

  // ── Summary totals for filtered list ──
  const totalIncomeFiltered = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenseFiltered = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const profitFiltered = totalIncomeFiltered - totalExpenseFiltered;

  return (
    <div className="p-4 md:p-6 space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Mobile sticky header com CTA primário */}
      <MobileStickyHeader
        title="Financeiro"
        cta={
          <Button
            size="sm"
            className="h-9 active:scale-95 transition-transform"
            onClick={() => { setEditTx(null); setFormOpen(true); }}
          >
            <Plus className="h-4 w-4 mr-1" /> Nova
          </Button>
        }
      />

      {/* Header desktop */}
      <div className="hidden md:flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Financeiro</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setFinAiOpen(true)}>
            <Sparkles className="h-3.5 w-3.5" /> IA
          </Button>
          <Button onClick={() => { setEditTx(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Nova Transação
          </Button>
        </div>
      </div>

      {/* Botão IA mobile (compacto) */}
      <div className="md:hidden -mt-2">
        <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={() => setFinAiOpen(true)}>
          <Sparkles className="h-3.5 w-3.5" /> Pergunte à IA financeira
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Saldo atual (pagas)"
          value={formatCurrency(kpis.balanceAll)}
          icon={DollarSign}
          colorClass={kpis.balanceAll >= 0 ? "text-success" : "text-destructive"}
        />
        <KpiCard
          label={`Receitas — ${new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString("pt-BR", { month: "long" })}`}
          value={formatCurrency(kpis.incomeMonth)}
          icon={TrendingUp}
          colorClass="text-success"
          trend={kpis.incomeMonthTrend}
        />
        <KpiCard
          label={`Despesas — ${new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString("pt-BR", { month: "long" })}`}
          value={formatCurrency(kpis.expenseMonth)}
          icon={TrendingDown}
          colorClass="text-destructive"
          trend={kpis.expenseMonthTrend}
        />
        <KpiCard
          label={`Resultado — ${new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString("pt-BR", { month: "long" })}`}
          value={formatCurrency(kpis.resultMonth)}
          icon={kpis.resultMonth >= 0 ? TrendingUp : TrendingDown}
          colorClass={kpis.resultMonth >= 0 ? "text-success" : "text-destructive"}
        />
      </div>

      {/* A receber / A pagar subcards */}
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

      {/* Active projects with balance */}
      {projects.length > 0 && (() => {
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
      })()}

      {/* Pending fees by collaborator */}
      {pendingFees.length > 0 && (
        <Card className="glass-card border-warning/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              Pagamentos pendentes por colaborador
              <Badge variant="secondary" className="text-[11px]">{pendingFees.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {pendingFees.map((pf, i) => (
              <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{pf.name}</span>
                  {pf.role && <span className="text-muted-foreground"> · {pf.role}</span>}
                  <span className="text-muted-foreground"> · {pf.projectName}</span>
                </div>
                <span className="font-mono-nums font-semibold text-warning shrink-0">
                  {formatCurrency(pf.fee)}
                </span>
              </div>
            ))}
            <div className="pt-1 border-t border-border/40 flex justify-between text-xs px-2">
              <span className="text-muted-foreground font-medium">Total pendente</span>
              <span className="font-mono-nums font-bold text-warning">
                {formatCurrency(pendingFees.reduce((s, f) => s + f.fee, 0))}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="transactions">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="evolution">Evolução</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>

        {/* ── Tab: Transactions ── */}
        <TabsContent value="transactions" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar por descrição ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Mês atual</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
                {months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos projetos</SelectItem>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 gap-1.5 shrink-0"
              disabled={filtered.length === 0}
              onClick={handleExportCSV}
              title={`Exportar ${filtered.length} transações como CSV`}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </Button>
          </div>

          {/* Table / Cards */}
          <Card className="glass-card overflow-hidden">
            {filtered.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-4 text-center px-4">
                <div className="rounded-full bg-primary/10 p-4">
                  <DollarSign className="h-10 w-10 text-primary/60" />
                </div>
                <div className="space-y-1">
                  <p className="text-foreground font-medium">
                    {transactions.length === 0 ? "Nenhuma transação registrada" : "Nenhuma transação encontrada"}
                  </p>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                    {transactions.length === 0
                      ? "Registre receitas e despesas para acompanhar suas finanças."
                      : "Tente ajustar os filtros para encontrar suas transações."}
                  </p>
                </div>
                {transactions.length === 0 && (
                  <Button className="mt-2" onClick={() => { setEditTx(null); setFormOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" /> Registrar primeira transação
                  </Button>
                )}
              </div>
            ) : isMobile ? (
              <div className="p-3 space-y-2">
                {paginated.map((tx) => (
                  <div key={tx.id} className="rounded-lg border border-border p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}
                          {tx.projectId ? ` · ${projectName(tx.projectId)}` : ""}
                        </p>
                      </div>
                      <span className={cn("text-sm font-bold whitespace-nowrap", tx.type === "income" ? "text-success" : "text-destructive")}>
                        {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{tx.category === "Outros" && tx.customCategory ? `Outros (${tx.customCategory})` : tx.category}</span>
                        {tx.paid ? (
                          <span className="flex items-center gap-0.5 text-success"><CheckCircle2 className="h-3 w-3" /> Pago</span>
                        ) : (
                          <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> Pendente</span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditTx(tx); setFormOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(tx.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                      <TableHead className="hidden md:table-cell">Projeto</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[72px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((tx, i) => (
                      <TableRow key={tx.id} className={`transition-colors ${i % 2 === 1 ? "bg-secondary/10" : ""} hover:bg-primary/5`}>
                        <TableCell className="text-xs text-muted-foreground font-mono-nums whitespace-nowrap">
                          {new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="font-medium max-w-[160px] truncate">{tx.description}</TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                          {tx.category === "Outros" && tx.customCategory
                            ? `Outros (${tx.customCategory})`
                            : tx.category}
                        </TableCell>
                        <TableCell className="hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                          {tx.projectId
                            ? (
                              <Link
                                to={`/projects/${tx.projectId}`}
                                className="inline-flex"
                                title="Abrir projeto"
                              >
                                <Badge variant="secondary" className="text-xs hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer">
                                  {projectName(tx.projectId)}
                                </Badge>
                              </Link>
                            )
                            : <span className="text-xs text-muted-foreground">—</span>
                          }
                        </TableCell>
                        <TableCell className="text-right font-mono-nums font-bold whitespace-nowrap">
                          <span className={tx.type === "income" ? "text-success" : "text-destructive"}>
                            {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {tx.paid ? (
                            <div className="flex items-center gap-1 text-success">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium hidden sm:inline">Pago</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium hidden sm:inline">Pendente</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditTx(tx); setFormOpen(true); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(tx.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {/* Footer: totals + pagination */}
            {filtered.length > 0 && (
              <div className="border-t border-border bg-muted/30">
                {/* Totals row */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">
                    {filtered.length} transaç{filtered.length === 1 ? "ão" : "ões"}
                    {totalPages > 1 && ` · pág. ${page}/${totalPages}`}
                    {" "}· {selectedMonthLabel}
                  </span>
                  <div className="flex gap-4 font-mono-nums font-semibold">
                    <span className="text-success">+{formatCurrency(totalIncomeFiltered)}</span>
                    <span className="text-destructive">-{formatCurrency(totalExpenseFiltered)}</span>
                    <span className={profitFiltered >= 0 ? "text-primary" : "text-destructive"}>
                      = {profitFiltered >= 0 ? "+" : ""}{formatCurrency(profitFiltered)}
                    </span>
                  </div>
                </div>
                {/* Pagination controls — only when needed */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1 px-4 pb-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={page === 1}
                      onClick={() => setPage(1)}
                    >
                      «
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      ‹ Anterior
                    </Button>
                    {/* Page number chips */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                      .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) =>
                        p === "…" ? (
                          <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground text-xs">…</span>
                        ) : (
                          <Button
                            key={p}
                            variant={p === page ? "default" : "outline"}
                            size="sm"
                            className="h-7 w-7 p-0 text-xs"
                            onClick={() => setPage(p as number)}
                          >
                            {p}
                          </Button>
                        )
                      )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Próxima ›
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={page === totalPages}
                      onClick={() => setPage(totalPages)}
                    >
                      »
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── Tab: Evolution Chart ── */}
        <TabsContent value="evolution" className="mt-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
                Evolução financeira — últimos 6 meses (pagas)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              {evolutionData.every((d) => d.receitas === 0 && d.despesas === 0) ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                  <BarChart2 className="h-10 w-10 opacity-20" />
                  <p className="text-sm">Sem dados para exibir. Adicione transações pagas.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={evolutionData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gReceitas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gDespesas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(348 83% 60%)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="hsl(348 83% 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 16%)" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(260 10% 55%)" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(260 10% 55%)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip
                      contentStyle={{ background: "hsl(260 15% 8%)", border: "1px solid hsl(260 15% 16%)", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(value: number) => [formatCurrency(value)]}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Area type="monotone" dataKey="receitas" name="Receitas" stroke="hsl(142 71% 45%)" strokeWidth={2} fill="url(#gReceitas)" dot={false} />
                    <Area type="monotone" dataKey="despesas" name="Despesas" stroke="hsl(348 83% 60%)" strokeWidth={2} fill="url(#gDespesas)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Reports ── */}
        <TabsContent value="reports" className="mt-4 space-y-6">
          {/* Period selector for reports */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground">Período:</span>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Mês atual</SelectItem>
                <SelectItem value="all">Todo o período</SelectItem>
                {months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Cash flow */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
                Fluxo de caixa — últimos 6 meses
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right text-success">Entradas</TableHead>
                    <TableHead className="text-right text-destructive">Saídas</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashflowData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sem dados no período</TableCell>
                    </TableRow>
                  ) : (
                    cashflowData.map((row) => (
                      <TableRow key={row.mes}>
                        <TableCell className="font-medium">{row.mes}</TableCell>
                        <TableCell className="text-right font-mono-nums text-success">{formatCurrency(row.entradas)}</TableCell>
                        <TableCell className="text-right font-mono-nums text-destructive">{formatCurrency(row.saidas)}</TableCell>
                        <TableCell className={`text-right font-mono-nums font-semibold ${row.saldo >= 0 ? "text-success" : "text-destructive"}`}>
                          {row.saldo >= 0 ? "+" : ""}{formatCurrency(row.saldo)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Category breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Income by category */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-success" />
                  Receitas por categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryIncome.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Sem receitas no período</p>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie data={categoryIncome} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                          {categoryIncome.map((_, index) => (
                            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: "hsl(260 15% 8%)", border: "1px solid hsl(260 15% 16%)", borderRadius: "8px", fontSize: "11px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5 w-full">
                      {categoryIncome.slice(0, 6).map((cat, i) => (
                        <div key={cat.name} className="flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="truncate text-muted-foreground">{cat.name}</span>
                          </div>
                          <span className="font-mono-nums font-semibold text-success shrink-0">{formatCurrency(cat.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expense by category */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-destructive" />
                  Despesas por categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryExpense.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Sem despesas no período</p>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie data={categoryExpense} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                          {categoryExpense.map((_, index) => (
                            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: "hsl(260 15% 8%)", border: "1px solid hsl(260 15% 16%)", borderRadius: "8px", fontSize: "11px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5 w-full">
                      {categoryExpense.slice(0, 6).map((cat, i) => (
                        <div key={cat.name} className="flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="truncate text-muted-foreground">{cat.name}</span>
                          </div>
                          <span className="font-mono-nums font-semibold text-destructive shrink-0">{formatCurrency(cat.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Pending items */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-warning" />
                  A receber (receitas pendentes)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {transactions.filter((t) => t.type === "income" && !t.paid).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma receita pendente</p>
                ) : (
                  <Table>
                    <TableBody>
                      {transactions.filter((t) => t.type === "income" && !t.paid)
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .slice(0, 5)
                        .map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="text-xs text-muted-foreground">{new Date(t.date + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell className="text-sm">{t.description}</TableCell>
                            <TableCell className="text-right font-mono-nums font-semibold text-success">{formatCurrency(t.amount)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-destructive" />
                  A pagar (despesas pendentes)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {transactions.filter((t) => t.type === "expense" && !t.paid).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma despesa pendente</p>
                ) : (
                  <Table>
                    <TableBody>
                      {transactions.filter((t) => t.type === "expense" && !t.paid)
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .slice(0, 5)
                        .map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="text-xs text-muted-foreground">{new Date(t.date + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                            <TableCell className="text-sm">{t.description}</TableCell>
                            <TableCell className="text-right font-mono-nums font-semibold text-destructive">{formatCurrency(t.amount)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Transaction Form */}
      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editTransaction={editTx}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Financial AI Sheet */}
      <ProjectAISheet
        open={finAiOpen}
        onOpenChange={setFinAiOpen}
        projectData={(() => {
          const lines: string[] = [];
          lines.push(`Saldo total (pagas): R$${kpis.balanceAll.toFixed(2)}`);
          lines.push(`Receitas do mês: R$${kpis.incomeMonth.toFixed(2)}`);
          lines.push(`Despesas do mês: R$${kpis.expenseMonth.toFixed(2)}`);
          lines.push(`Resultado do mês: R$${kpis.resultMonth.toFixed(2)}`);
          lines.push(`A receber: R$${kpis.pendingIncome.toFixed(2)}`);
          lines.push(`A pagar: R$${kpis.pendingExpense.toFixed(2)}`);
          if (pendingFees.length > 0) {
            lines.push(`\nPagamentos pendentes por colaborador (${pendingFees.length}):`);
            pendingFees.forEach(f => lines.push(`- ${f.name} (${f.role}) — R$${f.fee.toFixed(2)} — ${f.projectName}`));
          }
          lines.push(`\nCategorias de despesa:`);
          categoryExpense.slice(0, 8).forEach(c => lines.push(`- ${c.name}: R$${c.total.toFixed(2)}`));
          lines.push(`\nCategorias de receita:`);
          categoryIncome.slice(0, 8).forEach(c => lines.push(`- ${c.name}: R$${c.total.toFixed(2)}`));
          lines.push(`\nEvolução últimos 6 meses:`);
          evolutionData.forEach(d => lines.push(`- ${d.mes}: Receita R$${d.receitas.toFixed(0)} | Despesa R$${d.despesas.toFixed(0)} | Saldo R$${d.saldo.toFixed(0)}`));
          return lines.join("\n");
        })()}
        mode="finance"
        title="Assistente Financeiro IA"
        chips={[
          { label: "📊 Análise geral", msg: "Analise meus dados financeiros. Quais padrões você identifica? Onde posso economizar?" },
          { label: "🔥 Burn rate", msg: "Qual meu burn rate mensal? Em quanto tempo meu saldo vai acabar no ritmo atual?" },
          { label: "💡 Otimizações", msg: "Sugira otimizações concretas para melhorar minha saúde financeira como artista independente." },
        ]}
      />
    </div>
  );
}
