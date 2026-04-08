import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProjects } from "@/contexts/ProjectContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useTasks } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AITaskAssistant, type AITaskAssistantHandle } from "@/components/AITaskAssistant";
import { useProfessionals } from "@/hooks/useProfessionals";
import { useAIConversations } from "@/hooks/useAIConversations";
import { useProjectAlerts } from "@/hooks/useProjectAlerts";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import FinancialSummary from "@/components/dashboard/FinancialSummary";
import DailyChecklist from "@/components/dashboard/DailyChecklist";
import FirstRunEmptyState from "@/components/dashboard/FirstRunEmptyState";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import UpcomingReleases from "@/components/dashboard/UpcomingReleases";
import ProjectAlertsCard from "@/components/dashboard/ProjectAlertsCard";
import ProjectHealthList from "@/components/dashboard/ProjectHealthList";

export default function Dashboard() {
  const aiRef = useRef<AITaskAssistantHandle>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const navigate = useNavigate();
  const { projects, getMixPercent, getProjectFinancials, transactions } = useProjects();
  const { displayName, isSimpleMode } = useProfile();
  const { activeTasks, completedTasks, loading: tasksLoading, addTask, toggleTask, deleteTask, updateTask, refresh: refreshTasks } = useTasks();
  const { user } = useAuth();
  const autoGenRef = useRef(false);
  const { professionals } = useProfessionals();
  const {
    conversations, activeConversationId, setActiveConversationId,
    messages: savedMessages, loadingMessages,
    createConversation, saveMessage, renameConversation, deleteConversation, startNewConversation,
  } = useAIConversations();

  // Fetch pending invites for alert detection
  const [pendingInvites, setPendingInvites] = useState<{ projectId: string; professionalName: string; createdAt: string }[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase
      .from("project_invitations")
      .select("project_id, professional_name, created_at")
      .eq("invited_by", user.id)
      .eq("status", "pending")
      .then(({ data }) => {
        if (data) {
          setPendingInvites(
            data.map((d) => ({ projectId: d.project_id, professionalName: d.professional_name, createdAt: d.created_at }))
          );
        }
      });
  }, [user]);

  // Project alerts & health scores
  const { alerts, projectsWithHealth } = useProjectAlerts({
    projects,
    transactions,
    activeTasks: activeTasks.map((t) => ({ projectId: t.projectId, dueDate: t.dueDate, description: t.description })),
    getMixPercent,
    getProjectFinancials,
    pendingInvites,
  });

  // Auto-generate tasks once per session, with 1-hour throttle
  useEffect(() => {
    if (!user || projects.length === 0 || autoGenRef.current) return;
    autoGenRef.current = true;
    const THROTTLE_KEY = "sfp_tasks_last_gen";
    const THROTTLE_MS = 60 * 60 * 1000;
    const lastGen = Number(localStorage.getItem(THROTTLE_KEY) || "0");
    if (Date.now() - lastGen < THROTTLE_MS) { refreshTasks(); return; }
    const run = async () => {
      try { await supabase.functions.invoke("generate-daily-tasks", { body: {} }); localStorage.setItem(THROTTLE_KEY, String(Date.now())); } catch {}
      refreshTasks();
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, projects.length]);

  const handleRefreshTasks = async () => {
    setRefreshing(true);
    try {
      await supabase.functions.invoke("generate-daily-tasks", { body: {} });
      await refreshTasks();
      setLastRefreshed(new Date());
      localStorage.setItem("sfp_tasks_last_gen", String(Date.now()));
      toast.success("Checklist atualizado!");
    } catch { toast.error("Erro ao atualizar checklist"); }
    setRefreshing(false);
  };

  const filtered = selectedProjectId === "all" ? projects : projects.filter((p) => p.id === selectedProjectId);

  const financials = useMemo(() => {
    if (selectedProjectId !== "all") {
      return filtered.reduce(
        (acc, p) => { const f = getProjectFinancials(p.id); acc.totalIncome += f.totalIncome; acc.totalExpense += f.totalExpense; acc.profit += f.profit; return acc; },
        { totalIncome: 0, totalExpense: 0, profit: 0 }
      );
    }
    return transactions.filter((t) => t.paid).reduce(
      (acc, t) => { if (t.type === "income") acc.totalIncome += t.amount; else acc.totalExpense += t.amount; acc.profit = acc.totalIncome - acc.totalExpense; return acc; },
      { totalIncome: 0, totalExpense: 0, profit: 0 }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, filtered, transactions]);

  // ── Build context-aware chips for AI ──
  const buildAIChips = () => {
    const chips: Array<{ label: string; msg: string; highlight?: boolean }> = [];

    // Prioritize actionable chips
    if (alerts.length > 0) {
      const criticalAlerts = alerts.filter((a) => a.severity === "critical");
      if (criticalAlerts.length > 0) {
        chips.push({
          label: `🚨 ${criticalAlerts.length} crítico${criticalAlerts.length > 1 ? "s" : ""}`,
          msg: `Tenho ${criticalAlerts.length} alerta(s) crítico(s): ${criticalAlerts.slice(0, 3).map((a) => `${a.title} (${a.projectName})`).join(", ")}. O que devo resolver primeiro?`,
          highlight: true,
        });
      }
    }

    const urgentTasks = activeTasks.filter((t) => t.source === "deadline" || t.source === "payment");
    if (urgentTasks.length > 0) chips.push({ label: `⚠️ ${urgentTasks.length} urgente${urgentTasks.length > 1 ? "s" : ""}`, msg: "Quais são minhas pendências mais urgentes agora? Liste com prazo e contexto.", highlight: true });

    if (activeTasks.length > 0) {
      chips.push({ label: "📋 O que fazer hoje", msg: "Com base nas minhas tarefas e projetos, o que devo priorizar hoje? Me dá um plano de ação claro." });
    }

    const stalledProjects = projectsWithHealth.filter((p) => p.alerts.some((a) => a.category === "stalled"));
    if (stalledProjects.length > 0) {
      chips.push({
        label: `⏸️ ${stalledProjects.length} parado${stalledProjects.length > 1 ? "s" : ""}`,
        msg: `Tenho ${stalledProjects.length} projeto(s) parado(s): ${stalledProjects.map((p) => p.project.name).join(", ")}. Como posso destravar?`,
      });
    }

    if (projects.length === 0) {
      chips.length = 0;
      chips.push({ label: "🎵 Criar projeto", msg: "Como devo organizar meu primeiro projeto musical? Quais informações são essenciais?" });
      chips.push({ label: "🎙️ Dicas de gravação", msg: "Sou um artista independente. Me dá dicas fundamentais para começar a gravar com qualidade em casa." });
    }

    return chips;
  };

  const isFirstRun = projects.length === 0;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <DashboardHeader
        displayName={displayName}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
      />

      {/* 1. O que fazer hoje + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {isFirstRun && <FirstRunEmptyState onNavigate={navigate} />}

        <DailyChecklist
          activeTasks={activeTasks}
          completedTasks={completedTasks}
          loading={tasksLoading}
          onAddTask={async (desc) => { await addTask({ description: desc }); }}
          onToggleTask={toggleTask}
          onDeleteTask={deleteTask}
          onRefresh={handleRefreshTasks}
          refreshing={refreshing}
          lastRefreshed={lastRefreshed}
          hidden={isFirstRun}
          aiRef={aiRef}
        />

        <ProjectAlertsCard alerts={alerts} hidden={isFirstRun} />
      </div>

      {/* 2. Projetos com score de saúde */}
      <ProjectHealthList projects={projectsWithHealth} hidden={isFirstRun} />

      {/* 3. Próximos lançamentos */}
      <UpcomingReleases projects={projects} getMixPercent={getMixPercent} hidden={isFirstRun} />

      {/* 4. Financeiro */}
      <FinancialSummary financials={financials} isSimpleMode={isSimpleMode} />

      {!isSimpleMode && <RecentTransactions transactions={transactions} />}

      {/* 5. AI Assistant */}
      <Card className={cn("glass-card animate-fade-in border-primary/20", isFirstRun && "hidden")} style={{ animationDelay: "150ms" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="relative">
              <Bot className="h-4 w-4 text-primary" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
            </div>
            <span className="neon-text">Assistente IA</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <AITaskAssistant
            ref={aiRef}
            alwaysOpen
            contextChips={buildAIChips()}
            context={{
              projects: projects.map((p) => ({
                id: p.id, name: p.name, artist: p.artist, stage: p.stage,
                mixPercent: getMixPercent(p.id), projectType: p.projectType,
                totalContractValue: p.totalContractValue, amountPaid: p.amountPaid,
                estimatedMonths: p.estimatedMonths,
              })),
              activeTasks: activeTasks.map((t) => ({ description: t.description, source: t.source, dueDate: t.dueDate })),
              financials,
              professionals: professionals.map((p) => ({ name: p.name, specialty: p.specialty, bio: p.bio ?? "", active: true, phone: p.phone ?? "" })),
              alerts: alerts.slice(0, 10).map((a) => ({ title: a.title, severity: a.severity, project: a.projectName, category: a.category })),
            }}
            onAddTask={async (description, projectId) => {
              const validProjectId = projectId && projects.some((p) => p.id === projectId) ? projectId : null;
              const result = await addTask({ description, projectId: validProjectId, source: "manual" });
              if (!result) await addTask({ description, projectId: null, source: "manual" });
            }}
            conversations={conversations}
            activeConversationId={activeConversationId}
            savedMessages={savedMessages}
            loadingMessages={loadingMessages}
            onCreateConversation={createConversation}
            onSaveMessage={saveMessage}
            onSelectConversation={setActiveConversationId}
            onNewConversation={startNewConversation}
            onDeleteConversation={deleteConversation}
            onRenameConversation={renameConversation}
          />
        </CardContent>
      </Card>
    </div>
  );
}
