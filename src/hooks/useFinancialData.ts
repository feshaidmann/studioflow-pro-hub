import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Transaction } from "@/data/mockData";
import { monthKey, pctChange, formatCategoryLabel } from "@/lib/financeUtils";

export interface PendingFee {
  name: string;
  role: string;
  projectName: string;
  fee: number;
}

export function usePendingFees(userId: string | undefined, transactions: Transaction[]): PendingFee[] {
  const [pendingFees, setPendingFees] = useState<PendingFee[]>([]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    supabase
      .from("project_members")
      .select("name, role, fee, project_id, projects(name)")
      .eq("user_id", userId)
      .gt("fee", 0)
      .then(({ data }) => {
        if (!active || !data) return;
        const paidDescs = new Set(
          transactions
            .filter((t) => t.type === "expense" && t.paid)
            .map((t) => t.description.toLowerCase()),
        );
        setPendingFees(
          data
            .map((d) => ({
              name: d.name as string,
              role: d.role as string,
              projectName: (d.projects as { name: string } | null)?.name ?? "—",
              fee: d.fee as number,
            }))
            .filter(
              (f) =>
                !paidDescs.has(`cachê ${f.name}`.toLowerCase()) &&
                !paidDescs.has(`cache ${f.name}`.toLowerCase()) &&
                !paidDescs.has(f.name.toLowerCase()),
            ),
        );
      });
    return () => { active = false; };
  }, [userId, transactions]);

  return pendingFees;
}

export function useFinancialKpis(transactions: Transaction[]) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  return useMemo(() => {
    const currTxs = transactions.filter((t) => monthKey(t.date) === currentMonth);
    const prevTxs = transactions.filter((t) => monthKey(t.date) === prevMonth);

    const sumPaid = (list: Transaction[], type: string) =>
      list.filter((t) => t.type === type && t.paid).reduce((s, t) => s + t.amount, 0);
    const sumPending = (list: Transaction[], type: string) =>
      list.filter((t) => t.type === type && !t.paid).reduce((s, t) => s + t.amount, 0);

    const incomeMonth = sumPaid(currTxs, "income");
    const expenseMonth = sumPaid(currTxs, "expense");

    return {
      balanceAll: transactions
        .filter((t) => t.paid)
        .reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0),
      incomeMonth,
      expenseMonth,
      resultMonth: incomeMonth - expenseMonth,
      incomeMonthTrend: pctChange(incomeMonth, sumPaid(prevTxs, "income")),
      expenseMonthTrend: pctChange(expenseMonth, sumPaid(prevTxs, "expense")),
      pendingIncome: sumPending(transactions, "income"),
      pendingExpense: sumPending(transactions, "expense"),
      currentMonth,
    };
  }, [transactions, currentMonth, prevMonth]);
}

export function useEvolutionData(transactions: Transaction[]) {
  return useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const monthTxs = transactions.filter((t) => monthKey(t.date) === mk && t.paid);
      const receitas = monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const despesas = monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      return { mes: label, receitas, despesas, saldo: receitas - despesas };
    });
  }, [transactions]);
}

export function useCategoryData(
  transactions: Transaction[],
  filterMonth: string,
  currentMonth: string,
) {
  return useMemo(() => {
    const reportTxs =
      filterMonth === "current"
        ? transactions.filter((t) => monthKey(t.date) === currentMonth)
        : filterMonth !== "all"
          ? transactions.filter((t) => monthKey(t.date) === filterMonth)
          : transactions;

    const catMap: Record<string, { name: string; total: number; type: string }> = {};
    for (const t of reportTxs.filter((t) => t.paid)) {
      const cat = formatCategoryLabel(t.category, t.customCategory);
      if (!catMap[cat]) catMap[cat] = { name: cat, total: 0, type: t.type };
      catMap[cat].total += t.amount;
    }
    const all = Object.values(catMap).sort((a, b) => b.total - a.total);
    return {
      categoryIncome: all.filter((c) => c.type === "income"),
      categoryExpense: all.filter((c) => c.type === "expense"),
    };
  }, [transactions, filterMonth, currentMonth]);
}

export function useCashFlowData(transactions: Transaction[], months: string[]) {
  return useMemo(
    () =>
      months.slice(0, 6).reverse().map((mk) => {
        const txs = transactions.filter((t) => monthKey(t.date) === mk && t.paid);
        const entradas = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
        const saidas = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
        return { mes: mk, entradas, saidas, saldo: entradas - saidas };
      }),
    [transactions, months],
  );
}
