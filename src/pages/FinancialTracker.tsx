import { useState, useMemo, useEffect } from "react";
import Papa from "papaparse";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useProjects } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { type Transaction } from "@/data/mockData";
import TransactionForm from "@/components/finance/TransactionForm";
import ProjectAISheet from "@/components/project-hub/ProjectAISheet";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileStickyHeader } from "@/components/ui/mobile-sticky-header";
import { monthKey, formatCurrency, parseLocalDate, formatCategoryLabel } from "@/lib/financeUtils";
import {
  usePendingFees, useFinancialKpis, useEvolutionData,
  useCategoryData, useCashFlowData,
} from "@/hooks/useFinancialData";
import { FinancialKpiCards } from "@/components/finance/FinancialKpiCards";
import { ActiveProjectsCarousel } from "@/components/finance/ActiveProjectsCarousel";
import { PendingFeesCard } from "@/components/finance/PendingFeesCard";
import { TransactionFilters } from "@/components/finance/TransactionFilters";
import { TransactionTable } from "@/components/finance/TransactionTable";
import { EvolutionChart } from "@/components/finance/EvolutionChart";
import { CashFlowTable } from "@/components/finance/CashFlowTable";
import { CategoryBreakdownCharts } from "@/components/finance/CategoryBreakdownCharts";
import { PendingTransactionsSummary } from "@/components/finance/PendingTransactionsSummary";

const PAGE_SIZE = 20;

export default function FinancialTracker() {
  const { t } = useLanguage();
  const { transactions, projects, deleteTransaction, getProjectFinancials } = useProjects();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // UI state
  const [formOpen, setFormOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [finAiOpen, setFinAiOpen] = useState(false);

  // Filters — `filterMonth` é exclusivo da aba Transações; Relatórios usa `reportMonth`
  // para evitar contaminação cruzada entre abas.
  const [filterProject, setFilterProject] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterMonth, setFilterMonth] = useState("current");
  const [reportMonth, setReportMonth] = useState("current");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [filterProject, filterType, filterMonth, filterStatus, search]);

  // Computed
  const months = useMemo(
    () => Array.from(new Set(transactions.map((t) => monthKey(t.date)))).sort().reverse(),
    [transactions],
  );

  const filtered = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let list = [...transactions];
    if (filterProject !== "all") list = list.filter((t) => t.projectId === filterProject);
    if (filterType !== "all") list = list.filter((t) => t.type === filterType);
    if (filterMonth === "current") list = list.filter((t) => t.date.startsWith(currentMonth));
    else if (filterMonth !== "all") list = list.filter((t) => t.date.startsWith(filterMonth));
    if (filterStatus === "paid") list = list.filter((t) => t.paid);
    else if (filterStatus === "pending") list = list.filter((t) => !t.paid);
    if (search.trim())
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(search.toLowerCase()) ||
          t.category.toLowerCase().includes(search.toLowerCase()),
      );
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, filterProject, filterType, filterMonth, filterStatus, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalIncome = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  // Data hooks
  const pendingFees = usePendingFees(user?.id, transactions);
  const kpis = useFinancialKpis(transactions);
  const evolutionData = useEvolutionData(transactions);
  const { categoryIncome, categoryExpense } = useCategoryData(transactions, filterMonth, kpis.currentMonth);
  const cashflowData = useCashFlowData(transactions, months);

  // Helpers
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "—";

  const selectedMonthLabel =
    filterMonth === "current" ? "Mês atual" :
    filterMonth === "all" ? "Todos os meses" : filterMonth;

  const handleDelete = () => {
    if (!deleteId) return;
    deleteTransaction(deleteId);
    setDeleteId(null);
    toast.success("Transação removida do seu histórico.");
  };

  const handleExportCSV = () => {
    const rows = filtered.map((tx) => ({
      Data: new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR"),
      Tipo: tx.type === "income" ? "Receita" : "Despesa",
      Descrição: tx.description,
      Valor: tx.amount.toFixed(2),
      Status: tx.paid ? "Pago" : "Pendente",
      Categoria:
        tx.category === "Outros" && tx.customCategory
          ? `Outros (${tx.customCategory})`
          : tx.category,
      Projeto: tx.projectId ? (projects.find((p) => p.id === tx.projectId)?.name ?? "") : "",
      Observações: tx.notes ?? "",
    }));
    const csv = Papa.unparse(rows, { delimiter: ";", newline: "\r\n" });
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transacoes_${selectedMonthLabel.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
    toast.success(`${filtered.length} transações exportadas`);
  };

  const openNew = () => { setEditTx(null); setFormOpen(true); };
  const openEdit = (tx: Transaction) => { setEditTx(tx); setFormOpen(true); };

  const aiContext = [
    `Saldo total (pagas): R$${kpis.balanceAll.toFixed(2)}`,
    `Receitas do mês: R$${kpis.incomeMonth.toFixed(2)}`,
    `Despesas do mês: R$${kpis.expenseMonth.toFixed(2)}`,
    `Resultado do mês: R$${kpis.resultMonth.toFixed(2)}`,
    `A receber: R$${kpis.pendingIncome.toFixed(2)}`,
    `A pagar: R$${kpis.pendingExpense.toFixed(2)}`,
    pendingFees.length > 0
      ? `\nPagamentos pendentes por colaborador (${pendingFees.length}):\n` +
        pendingFees.map((f) => `- ${f.name} (${f.role}) — R$${f.fee.toFixed(2)} — ${f.projectName}`).join("\n")
      : "",
    `\nCategorias de despesa:\n` + categoryExpense.slice(0, 8).map((c) => `- ${c.name}: R$${c.total.toFixed(2)}`).join("\n"),
    `\nCategorias de receita:\n` + categoryIncome.slice(0, 8).map((c) => `- ${c.name}: R$${c.total.toFixed(2)}`).join("\n"),
    `\nEvolução últimos 6 meses:\n` + evolutionData.map((d) => `- ${d.mes}: Receita R$${d.receitas.toFixed(0)} | Despesa R$${d.despesas.toFixed(0)} | Saldo R$${d.saldo.toFixed(0)}`).join("\n"),
  ].filter(Boolean).join("\n");

  void t; // used via context for i18n; suppress unused-var lint

  return (
    <div className="p-4 md:p-6 space-y-6 pb-12 max-w-6xl mx-auto">
      <MobileStickyHeader
        title="Financeiro"
        cta={
          <Button size="sm" className="h-9 active:scale-95 transition-transform" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Nova
          </Button>
        }
      />

      <div className="hidden md:flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Financeiro</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setFinAiOpen(true)}>
            <Sparkles className="h-3.5 w-3.5" /> IA
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Nova Transação
          </Button>
        </div>
      </div>

      <div className="md:hidden -mt-2">
        <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={() => setFinAiOpen(true)}>
          <Sparkles className="h-3.5 w-3.5" /> Pergunte à IA financeira
        </Button>
      </div>

      <FinancialKpiCards kpis={kpis} />
      <ActiveProjectsCarousel projects={projects} getProjectFinancials={getProjectFinancials} />
      <PendingFeesCard fees={pendingFees} />

      <Tabs defaultValue="transactions">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="evolution">Evolução</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4 mt-4">
          {transactions.length > 0 && (
            <TransactionFilters
              search={search} onSearchChange={setSearch}
              filterMonth={filterMonth} onFilterMonthChange={setFilterMonth}
              filterType={filterType} onFilterTypeChange={setFilterType}
              filterStatus={filterStatus} onFilterStatusChange={setFilterStatus}
              filterProject={filterProject} onFilterProjectChange={setFilterProject}
              projects={projects} months={months}
              filteredCount={filtered.length} onExport={handleExportCSV}
            />
          )}
          <TransactionTable
            filtered={filtered} paginated={paginated}
            page={page} totalPages={totalPages} onPageChange={setPage}
            isMobile={isMobile} hasTransactions={transactions.length > 0}
            totalIncome={totalIncome} totalExpense={totalExpense}
            profit={totalIncome - totalExpense}
            monthLabel={selectedMonthLabel}
            projectName={projectName}
            onEdit={openEdit} onDelete={setDeleteId} onNew={openNew}
          />
        </TabsContent>

        <TabsContent value="evolution" className="mt-4">
          <EvolutionChart data={evolutionData} />
        </TabsContent>

        <TabsContent value="reports" className="mt-4 space-y-6">
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
          <CashFlowTable data={cashflowData} />
          <CategoryBreakdownCharts categoryIncome={categoryIncome} categoryExpense={categoryExpense} />
          <PendingTransactionsSummary transactions={transactions} />
        </TabsContent>
      </Tabs>

      <TransactionForm open={formOpen} onOpenChange={setFormOpen} editTransaction={editTx} />

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

      <ProjectAISheet
        open={finAiOpen}
        onOpenChange={setFinAiOpen}
        projectData={aiContext}
        mode="finance"
        title="Assistente Financeiro IA"
        chips={[
          { label: "Análise geral", msg: "Analise meus dados financeiros. Quais padrões você identifica? Onde posso economizar?" },
          { label: "Burn rate", msg: "Qual meu burn rate mensal? Em quanto tempo meu saldo vai acabar no ritmo atual?" },
          { label: "Otimizações", msg: "Sugira otimizações concretas para melhorar minha saúde financeira como artista independente." },
        ]}
      />
    </div>
  );
}
