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

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import FinancialSummary from "@/components/dashboard/FinancialSummary";
import ActiveProjectsList from "@/components/dashboard/ActiveProjectsList";
import DailyChecklist from "@/components/dashboard/DailyChecklist";
import FirstRunEmptyState from "@/components/dashboard/FirstRunEmptyState";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import UpcomingReleases from "@/components/dashboard/UpcomingReleases";

export default function Dashboard() {
  const aiRef = useRef<AITaskAssistantHandle>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const navigate = useNavigate();
  const { projects, getMixPercent, getProjectFinancials, transactions } = useProjects();
  const { displayName, isSimpleMode } = useProfile();
  const { activeTasks, completedTasks, loading: tasksLoading, addTask, toggleTask, deleteTask, refresh: refreshTasks } = useTasks();
  const { user } = useAuth();
  const autoGenRef = useRef(false);
  const { professionals } = useProfessionals();
  const {
    conversations, activeConversationId, setActiveConversationId,
    messages: savedMessages, loadingMessages,
    createConversation, saveMessage, renameConversation, deleteConversation, startNewConversation,
  } = useAIConversations();

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
    const urgentTasks = activeTasks.filter((t) => t.source === "deadline" || t.source === "payment");
    if (urgentTasks.length > 0) chips.push({ label: `⚠️ ${urgentTasks.length} urgente${urgentTasks.length > 1 ? "s" : ""}`, msg: "Quais são minhas pendências mais urgentes agora? Liste com prazo e contexto.", highlight: true });
    const byStage: Record<string, typeof projects> = {};
    projects.forEach((p) => { if (!p.completed) (byStage[p.stage] = byStage[p.stage] ?? []).push(p); });
    const stageLabels: Record<string, string> = { inicio: "🎵 Iniciado", gravacao: "🎙️ Gravação", mix: "🎛️ Mix", master: "🔊 Master", upload: "🚀 Upload", lancado: "🏆 Lançado" };
    Object.entries(byStage).forEach(([stage, list]) => { const lbl = stageLabels[stage]; if (!lbl) return; chips.push({ label: `${lbl} (${list.length})`, msg: `Fale sobre os projetos em fase de ${stage}: ${list.map((p) => p.name).join(", ")}. O que preciso fazer para avançar?` }); });
    const mixProjects = projects.filter((p) => !p.completed && p.stage === "mix");
    const masterProjects = projects.filter((p) => !p.completed && p.stage === "master");
    if (mixProjects.length > 0) chips.push({ label: "🎛️ Dica de mix", msg: `Tenho ${mixProjects.length} projeto(s) em fase de mix: ${mixProjects.map((p) => p.name).join(", ")}. Me dá dicas de EQ, compressão ou balanceamento para avançar.` });
    if (masterProjects.length > 0) chips.push({ label: "🔊 Checar master", msg: `Tenho ${masterProjects.length} projeto(s) em fase de master: ${masterProjects.map((p) => p.name).join(", ")}. Quais critérios devo checar antes de finalizar a master?` });
    if (mixProjects.length === 0 && masterProjects.length === 0 && projects.length > 0) chips.push({ label: "🎙️ Dica técnica", msg: "Me dá uma dica prática de produção musical que posso aplicar hoje nos meus projetos." });
    if (projects.length === 0) { chips.length = 0; chips.push({ label: "🎵 Criar projeto", msg: "Como devo organizar meu primeiro projeto musical? Quais informações são essenciais?" }); chips.push({ label: "🎙️ Dicas de gravação", msg: "Sou um artista independente. Me dá dicas fundamentais para começar a gravar com qualidade em casa." }); chips.push({ label: "🔊 LUFS streaming", msg: "Quais são os alvos de LUFS para Spotify, YouTube e Apple Music?" }); }
    return chips;
  };

  const isFirstRun = projects.length === 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <DashboardHeader
        displayName={displayName}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
      />

      <FinancialSummary financials={financials} isSimpleMode={isSimpleMode} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {isFirstRun && <FirstRunEmptyState onNavigate={navigate} />}

        <ActiveProjectsList projects={filtered} hidden={isFirstRun} />

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

        {/* AI Assistant Card */}
        <Card className={cn("glass-card animate-fade-in border-primary/20 lg:col-span-1", isFirstRun && "hidden")} style={{ animationDelay: "150ms" }}>
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

      {!isSimpleMode && <RecentTransactions transactions={transactions} />}

      <UpcomingReleases projects={projects} getMixPercent={getMixPercent} hidden={isFirstRun} />
    </div>
  );
}
