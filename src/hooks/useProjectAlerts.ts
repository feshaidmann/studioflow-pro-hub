import { useMemo } from "react";
import type { Project, Transaction } from "@/data/mockData";

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertCategory = "stalled" | "budget" | "invite" | "team" | "release" | "deadline";

export interface ProjectAlert {
  id: string;
  projectId: string;
  projectName: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  description: string;
}

export type ProjectHealth = "organizado" | "atencao" | "critico";

export interface ProjectWithHealth {
  project: Project;
  health: ProjectHealth;
  alerts: ProjectAlert[];
  mixPercent: number;
}

interface UseProjectAlertsInput {
  projects: Project[];
  transactions: Transaction[];
  activeTasks: { projectId: string | null; dueDate: string | null; description: string }[];
  getMixPercent: (id: string) => number;
  getProjectFinancials: (id: string) => { totalIncome: number; totalExpense: number; profit: number };
  pendingInvites?: { projectId: string; professionalName: string; createdAt: string }[];
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - today.getTime()) / 86400000);
}

export function useProjectAlerts({
  projects,
  transactions,
  activeTasks,
  getMixPercent,
  getProjectFinancials,
  pendingInvites = [],
}: UseProjectAlertsInput) {
  return useMemo(() => {
    const allAlerts: ProjectAlert[] = [];
    const projectHealthMap: ProjectWithHealth[] = [];

    for (const project of projects) {
      if (project.completed) continue;

      const alerts: ProjectAlert[] = [];
      const mixPct = getMixPercent(project.id);
      const fin = getProjectFinancials(project.id);

      // 1. Stalled project (no update in 14+ days based on updatedAt or createdAt)
      // We approximate using transactions and tasks as activity signals
      const projectTxs = transactions.filter((t) => t.projectId === project.id);
      const latestTxDate = projectTxs.length > 0
        ? projectTxs.reduce((max, t) => (t.date > max ? t.date : max), "")
        : "";
      const projectTasks = activeTasks.filter((t) => t.projectId === project.id);
      
      // Use upload_date or latest transaction to approximate last activity
      const lastActivityStr = latestTxDate || project.uploadDate || "";
      if (lastActivityStr && daysSince(lastActivityStr) > 14) {
        const days = daysSince(lastActivityStr);
        alerts.push({
          id: `stalled-${project.id}`,
          projectId: project.id,
          projectName: project.name,
          severity: days > 30 ? "critical" : "warning",
          category: "stalled",
          title: `Parado há ${days} dias`,
          description: `"${project.name}" não tem atividade registrada há ${days} dias.`,
        });
      }

      // 2. Budget risk
      if (project.totalContractValue && project.totalContractValue > 0) {
        const spent = fin.totalExpense;
        const ratio = spent / project.totalContractValue;
        if (ratio > 0.9) {
          alerts.push({
            id: `budget-${project.id}`,
            projectId: project.id,
            projectName: project.name,
            severity: ratio > 1 ? "critical" : "warning",
            category: "budget",
            title: ratio > 1 ? "Orçamento estourado" : "Orçamento em risco",
            description: `Gasto ${Math.round(ratio * 100)}% do orçamento previsto.`,
          });
        }
      }

      // 3. Negative profit warning
      if (fin.totalExpense > 0 && fin.profit < 0 && !project.totalContractValue) {
        alerts.push({
          id: `profit-${project.id}`,
          projectId: project.id,
          projectName: project.name,
          severity: "warning",
          category: "budget",
          title: "Resultado negativo",
          description: `Despesas superam receitas em R$ ${Math.abs(fin.profit).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}.`,
        });
      }

      // 4. Pending invites (no response)
      const projectInvites = pendingInvites.filter((i) => i.projectId === project.id);
      for (const inv of projectInvites) {
        const days = daysSince(inv.createdAt);
        if (days >= 3) {
          alerts.push({
            id: `invite-${project.id}-${inv.professionalName}`,
            projectId: project.id,
            projectName: project.name,
            severity: days >= 7 ? "warning" : "info",
            category: "invite",
            title: "Convite sem resposta",
            description: `${inv.professionalName} não respondeu há ${days} dias.`,
          });
        }
      }

      // 5. Release with deadline approaching
      if (project.uploadDate && (project.stage === "upload" || project.stage === "master")) {
        const days = daysUntil(project.uploadDate);
        if (days <= 7 && days >= 0) {
          alerts.push({
            id: `deadline-${project.id}`,
            projectId: project.id,
            projectName: project.name,
            severity: days <= 2 ? "critical" : "warning",
            category: "deadline",
            title: days === 0 ? "Lançamento hoje!" : `Lançamento em ${days} dia${days > 1 ? "s" : ""}`,
            description: `"${project.name}" precisa estar pronto.`,
          });
        } else if (days < 0) {
          alerts.push({
            id: `deadline-overdue-${project.id}`,
            projectId: project.id,
            projectName: project.name,
            severity: "critical",
            category: "deadline",
            title: `Lançamento atrasado (${Math.abs(days)}d)`,
            description: `A data prevista para "${project.name}" já passou.`,
          });
        }
      }

      // 6. Overdue tasks
      const overdueTasks = projectTasks.filter((t) => t.dueDate && daysUntil(t.dueDate) < 0);
      if (overdueTasks.length > 0) {
        alerts.push({
          id: `overdue-tasks-${project.id}`,
          projectId: project.id,
          projectName: project.name,
          severity: overdueTasks.length >= 3 ? "critical" : "warning",
          category: "deadline",
          title: `${overdueTasks.length} tarefa${overdueTasks.length > 1 ? "s" : ""} vencida${overdueTasks.length > 1 ? "s" : ""}`,
          description: overdueTasks.slice(0, 2).map((t) => t.description).join("; "),
        });
      }

      // Compute health score
      const criticalCount = alerts.filter((a) => a.severity === "critical").length;
      const warningCount = alerts.filter((a) => a.severity === "warning").length;
      let health: ProjectHealth = "organizado";
      if (criticalCount > 0) health = "critico";
      else if (warningCount > 0) health = "atencao";

      allAlerts.push(...alerts);
      projectHealthMap.push({ project, health, alerts, mixPercent: mixPct });
    }

    // Sort: critico first, then atencao, then organizado
    const healthOrder: Record<ProjectHealth, number> = { critico: 0, atencao: 1, organizado: 2 };
    projectHealthMap.sort((a, b) => healthOrder[a.health] - healthOrder[b.health]);

    // Sort alerts: critical first
    const sevOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
    allAlerts.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

    return { alerts: allAlerts, projectsWithHealth: projectHealthMap };
  }, [projects, transactions, activeTasks, getMixPercent, getProjectFinancials, pendingInvites]);
}
