import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useNavigate } from "react-router-dom";
import { useProjects } from "@/contexts/ProjectContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useTasks } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
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
import PendingTeamCard from "@/components/dashboard/PendingTeamCard";
import GuestProjectsList from "@/components/dashboard/GuestProjectsList";
import EditalProgressCard from "@/components/dashboard/EditalProgressCard";

export default function Dashboard() {
  const aiRef = useRef<AITaskAssistantHandle>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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

  // Fetch guest (partner) projects
  const [guestProjects, setGuestProjects] = useState<{ id: string; name: string; artist: string; stage: string; completed: boolean; project_type: string; role: string }[]>([]);
  const [guestTasks, setGuestTasks] = useState<{ description: string; source: string; dueDate: string | null; assignedTo: string; blocked: boolean; blockedReason: string; severity: string; projectName: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_member_projects").then(({ data }) => {
      if (data) setGuestProjects(data.map((d: any) => ({ id: d.id, name: d.name, artist: d.artist, stage: d.stage, completed: d.completed, project_type: d.project_type, role: d.role })));
    });
  }, [user]);

  // Fetch tasks for guest projects
  useEffect(() => {
    if (!user || guestProjects.length === 0) return;
    const ids = guestProjects.filter(g => !g.completed).map(g => g.id);
    if (ids.length === 0) return;
    supabase
      .from("tasks")
      .select("description, source, due_date, assigned_to, blocked, blocked_reason, severity, project_id")
      .in("project_id", ids)
      .eq("completed", false)
      .eq("dismissed", false)
      .then(({ data }) => {
        if (data) {
          const nameMap = Object.fromEntries(guestProjects.map(g => [g.id, g.name]));
          setGuestTasks(data.map((t: any) => ({
            description: t.description, source: t.source, dueDate: t.due_date, assignedTo: t.assigned_to,
            blocked: t.blocked, blockedReason: t.blocked_reason, severity: t.severity,
            projectName: nameMap[t.project_id] || "",
          })));
        }
      });
  }, [user, guestProjects]);

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
    } else {
      // Proactive chips
      chips.push({ label: "🔍 Revisão geral", msg: "Faça uma revisão geral de todos os meus projetos. O que está indo bem e o que precisa de atenção? Me dê um resumo executivo com ações." });
      chips.push({ label: "🎛️ Dúvida técnica", msg: "Sou artista independente e tenho uma dúvida técnica sobre produção musical. Me ajude como se fosse um engenheiro de áudio experiente. Posso descrever minha dúvida a seguir." });
      const nearRelease = projects.find((p) => p.stage === "upload" || p.stage === "master");
      if (nearRelease) {
        chips.push({ label: `🚀 ${nearRelease.name} quase lá`, msg: `Meu projeto "${nearRelease.name}" está no estágio ${nearRelease.stage}. O que falta para lançar? Revise o checklist de lançamento.` });
      }
    }

    return chips;
  };

  const isFirstRun = projects.length === 0;

  // Build "next recommended action" block
  const nextAction = useMemo(() => {
    if (isFirstRun) return null;
    const critical = alerts.find((a) => a.severity === "critical");
    if (critical) return { label: critical.title, detail: critical.projectName, severity: "critical" as const };
    const urgentTask = activeTasks.find((t) => t.source === "deadline" || t.source === "payment");
    if (urgentTask) return { label: urgentTask.description, detail: "Tarefa urgente", severity: "warning" as const };
    const warning = alerts.find((a) => a.severity === "warning");
    if (warning) return { label: warning.title, detail: warning.projectName, severity: "warning" as const };
    if (activeTasks.length > 0) return { label: activeTasks[0].description, detail: "Próxima tarefa", severity: "info" as const };
    return null;
  }, [alerts, activeTasks, isFirstRun]);

  const aiAssistantCard = (
    <Collapsible
      defaultOpen={!isMobile && localStorage.getItem("sfp_ai_collapsed") !== "true"}
      onOpenChange={(open) => localStorage.setItem("sfp_ai_collapsed", open ? "false" : "true")}
      className={cn(isFirstRun && "hidden")}
    >
      <Card data-ai-assistant className="glass-card animate-fade-in" style={{ animationDelay: "50ms" }}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer select-none hover:bg-muted/40 rounded-t-lg transition-colors">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <span>Assistente IA</span>
              <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
            </CardTitle>
            {!isMobile && (
              <p className="text-xs text-muted-foreground">Pergunte qualquer coisa sobre seus projetos</p>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <AITaskAssistant
              ref={aiRef}
              alwaysOpen
              contextChips={buildAIChips()}
              context={{
                projects: [
                  ...projects.map((p) => ({
                    id: p.id, name: p.name, artist: p.artist, stage: p.stage,
                    mixPercent: getMixPercent(p.id), projectType: p.projectType,
                    totalContractValue: p.totalContractValue, amountPaid: p.amountPaid,
                    estimatedMonths: p.estimatedMonths,
                  })),
                  ...guestProjects.filter(g => !g.completed).map((g) => ({
                    id: g.id, name: `[Parceiro] ${g.name}`, artist: g.artist, stage: g.stage,
                    mixPercent: 0, projectType: g.project_type,
                  })),
                ],
                activeTasks: [
                  ...activeTasks.map((t) => ({ description: t.description, source: t.source, dueDate: t.dueDate, assignedTo: t.assignedTo, blocked: t.blocked, blockedReason: t.blockedReason, severity: t.severity })),
                  ...guestTasks.map((t) => ({ description: `[${t.projectName}] ${t.description}`, source: t.source, dueDate: t.dueDate, assignedTo: t.assignedTo, blocked: t.blocked, blockedReason: t.blockedReason, severity: t.severity })),
                ],
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
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
      <DashboardHeader
        displayName={displayName}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
      />

      {/* Next recommended action — click sends to AI */}
      {nextAction && (
        <Card
          onClick={() => {
            aiRef.current?.sendMessage(`Preciso de ajuda com: ${nextAction.label}. ${nextAction.detail ? `Contexto: ${nextAction.detail}` : ""} O que devo fazer?`);
            localStorage.setItem("sfp_ai_collapsed", "false");
            const aiEl = document.querySelector("[data-ai-assistant]");
            aiEl?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
          className={cn(
            "glass-card animate-fade-in cursor-pointer transition-colors hover:bg-muted/30 border-l-4",
            nextAction.severity === "critical" ? "border-l-destructive" :
            nextAction.severity === "warning" ? "border-l-warning" :
            "border-l-primary"
          )}
        >
          <CardContent className="p-3 md:p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Bot className={cn(
                "h-4 w-4",
                nextAction.severity === "critical" ? "text-destructive" :
                nextAction.severity === "warning" ? "text-warning" : "text-primary"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Próxima ação · clique para resolver com IA</p>
              <p className="text-sm font-medium truncate">{nextAction.label}</p>
              {!isMobile && nextAction.detail && <p className="text-xs text-muted-foreground">{nextAction.detail}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Assistant — desktop: prominent; mobile: after checklist */}
      {!isMobile && aiAssistantCard}

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
          onUpdateTask={(id, patch) => updateTask(id, patch)}
          onRefresh={handleRefreshTasks}
          refreshing={refreshing}
          lastRefreshed={lastRefreshed}
          hidden={isFirstRun}
          aiRef={aiRef}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        />

        <ProjectAlertsCard alerts={alerts} hidden={isFirstRun} />
      </div>

      {/* AI Assistant on mobile — after checklist */}
      {isMobile && aiAssistantCard}

      {/* 2. Equipe pendente */}
      <PendingTeamCard hidden={isFirstRun} />

      {/* 3. Projetos com score de saúde */}
      <ProjectHealthList projects={projectsWithHealth} hidden={isFirstRun} />

      {/* 3b. Projetos como parceiro */}
      <GuestProjectsList projects={guestProjects} />

      {/* 3c. Editais em andamento */}
      <EditalProgressCard hidden={isFirstRun} />

      {/* 4. Próximos lançamentos */}
      <UpcomingReleases projects={projects} getMixPercent={getMixPercent} hidden={isFirstRun} />

      {/* 5. Financeiro */}
      <FinancialSummary financials={financials} isSimpleMode={isSimpleMode} />

      {!isSimpleMode && <RecentTransactions transactions={transactions} />}
    </div>
  );
}
