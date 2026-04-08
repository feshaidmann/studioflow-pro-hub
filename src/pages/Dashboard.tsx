import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Plus,
  Music2,
  Mic2,
  Headphones,
  Filter,
  DollarSign,
  TrendingUp,
  Percent,
  Wallet,
  ArrowRight,
  Clock,
  CalendarClock,
  ChevronDown,
  Trash2,
  X,
  Mail,
  Activity,
  BarChart2,
  Disc3,
  Megaphone,
  RefreshCw,
  Calendar,
  Rocket,
  Bot,
  Sparkles,
  CheckCircle2,
  Circle,
  UserPlus,
  FolderPlus,
  ListMusic,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
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

const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// ── First-run checklist steps ────────────────────────────────────────────────
const ONBOARDING_STEPS = [
  {
    id: "create_project",
    icon: FolderPlus,
    label: "Criar seu primeiro projeto",
    desc: "Registre nome, artista, BPM e etapa atual",
    action: "/projects?new=1",
  },
  {
    id: "add_track",
    icon: ListMusic,
    label: "Adicionar uma faixa ao projeto",
    desc: "Organize as faixas com parâmetros de mix",
    action: "/projects",
  },
  {
    id: "invite_partner",
    icon: UserPlus,
    label: "Convidar um parceiro",
    desc: "Adicione um músico, produtor ou engenheiro",
    action: "/professionals",
  },
];

function FirstRunEmptyState({ onNavigate }: { onNavigate: (path: string) => void }) {
  const STORAGE_KEY = "sfp_onboarding_done";
  const [done, setDone] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
  });

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const completedCount = done.length;
  const totalCount = ONBOARDING_STEPS.length;
  const allDone = completedCount === totalCount;

  return (
    <div className="col-span-full animate-fade-in">
      <Card className={cn(
        "glass-card border-primary/30 relative overflow-hidden",
        allDone && "border-success/40"
      )}>
        {/* Glow background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />

        <CardContent className="p-6 md:p-8 relative z-10">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Left: hero copy + main CTA */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-primary/15 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">Primeiros passos</span>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold neon-text mb-2">
                Vamos criar seu primeiro projeto
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-md">
                Do rascunho ao lançamento — organize sua música, acompanhe o progresso e colabore com sua equipe em um só lugar.
              </p>

              <Button
                className="neon-glow active:scale-95 transition-transform gap-2"
                size="lg"
                onClick={() => onNavigate("/projects?new=1")}
              >
                <Plus className="h-4 w-4" />
                Criar seu primeiro projeto
              </Button>
            </div>

            {/* Right: checklist */}
            <div className="w-full md:w-72 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-foreground">Checklist de início</p>
                <span className="text-xs text-muted-foreground font-mono-nums">
                  {completedCount}/{totalCount}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-4">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    allDone ? "bg-success" : "neon-progress-bar"
                  )}
                  style={{ width: `${(completedCount / totalCount) * 100}%` }}
                />
              </div>

              <div className="space-y-2">
                {ONBOARDING_STEPS.map((step) => {
                  const isDone = done.includes(step.id);
                  const StepIcon = step.icon;
                  return (
                    <div
                      key={step.id}
                      className={cn(
                        "flex items-start gap-3 rounded-lg p-3 transition-all duration-200 cursor-pointer group",
                        isDone
                          ? "bg-success/10 border border-success/20"
                          : "bg-card/60 border border-border/40 hover:border-primary/30 hover:bg-card/80"
                      )}
                      onClick={() => onNavigate(step.action)}
                    >
                      <button
                        className="shrink-0 mt-0.5"
                        onClick={(e) => { e.stopPropagation(); toggle(step.id); }}
                        aria-label={isDone ? "Marcar como pendente" : "Marcar como feito"}
                      >
                        {isDone
                          ? <CheckCircle2 className="h-4 w-4 text-success" />
                          : <Circle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <StepIcon className={cn("h-3.5 w-3.5 shrink-0", isDone ? "text-success" : "text-primary")} />
                          <span className={cn(
                            "text-sm font-medium leading-snug",
                            isDone && "line-through text-muted-foreground"
                          )}>
                            {step.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{step.desc}</p>
                      </div>
                      <ArrowRight className={cn(
                        "h-3.5 w-3.5 shrink-0 mt-0.5 transition-all",
                        isDone ? "text-success/50" : "text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5"
                      )} />
                    </div>
                  );
                })}
              </div>

              {allDone && (
                <p className="text-xs text-success font-medium text-center mt-3 animate-fade-in">
                  🎉 Tudo pronto! Agora é só criar música.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatDueDate(d: string | null) {
  if (!d) return null;
  const date = new Date(d + "T12:00:00");
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.floor((date.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d atraso`, color: "text-destructive" };
  if (diff === 0) return { label: "Hoje", color: "text-amber-400" };
  if (diff === 1) return { label: "Amanhã", color: "text-amber-400" };
  if (diff <= 3) return { label: `em ${diff}d`, color: "text-amber-400/80" };
  return { label: `em ${diff}d`, color: "text-muted-foreground" };
}

type SourceMeta = { icon: React.ElementType; color: string; label: string };

function getSourceMeta(source: string): SourceMeta {
  switch (source) {
    case "payment":      return { icon: DollarSign,   color: "text-amber-400",     label: "pagamento" };
    case "deadline":     return { icon: CalendarClock, color: "text-rose-400",      label: "prazo" };
    case "inactivity":   return { icon: Clock,         color: "text-muted-foreground", label: "inatividade" };
    case "budget":       return { icon: BarChart2,     color: "text-orange-400",    label: "orçamento" };
    case "invite_pending": return { icon: Mail,        color: "text-sky-400",       label: "convite" };
    case "master_check": return { icon: Disc3,         color: "text-violet-400",    label: "master" };
    case "release":      return { icon: Megaphone,     color: "text-green-400",     label: "lançamento" };
    default:             return { icon: Activity,      color: "text-primary",       label: source || "tarefa" };
  }
}

export default function Dashboard() {
  const aiRef = useRef<AITaskAssistantHandle>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [completedOpen, setCompletedOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { projects, getMixPercent, getProjectFinancials, transactions } = useProjects();
  const { displayName } = useProfile();
  const { activeTasks, completedTasks, loading: tasksLoading, addTask, toggleTask, deleteTask, refresh: refreshTasks } = useTasks();
  const { user } = useAuth();
  const autoGenRef = useRef(false);
  const { professionals } = useProfessionals();
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    messages: savedMessages,
    loadingMessages,
    createConversation,
    saveMessage,
    renameConversation,
    deleteConversation,
    startNewConversation,
  } = useAIConversations();

  // Auto-generate tasks once per session, with 1-hour throttle
  useEffect(() => {
    if (!user || projects.length === 0 || autoGenRef.current) return;
    autoGenRef.current = true;

    const THROTTLE_KEY = "sfp_tasks_last_gen";
    const THROTTLE_MS = 60 * 60 * 1000; // 1 hour
    const lastGen = Number(localStorage.getItem(THROTTLE_KEY) || "0");
    const now = Date.now();
    if (now - lastGen < THROTTLE_MS) {
      // Already generated recently — just ensure local state is fresh
      refreshTasks();
      return;
    }

    const run = async () => {
      // Call server-side rule engine (processes only this user)
      try {
        await supabase.functions.invoke("generate-daily-tasks", { body: {} });
        localStorage.setItem(THROTTLE_KEY, String(Date.now()));
      } catch {}
      refreshTasks();
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, projects.length]);

  const handleAddTask = async () => {
    if (!newTaskDesc.trim()) return;
    await addTask({ description: newTaskDesc.trim() });
    setNewTaskDesc("");
  };

  const handleRefreshTasks = async () => {
    setRefreshing(true);
    try {
      await supabase.functions.invoke("generate-daily-tasks", { body: {} });
      await refreshTasks();
      setLastRefreshed(new Date());
      localStorage.setItem("sfp_tasks_last_gen", String(Date.now()));
      toast.success("Checklist atualizado!");
    } catch {
      toast.error("Erro ao atualizar checklist");
    }
    setRefreshing(false);
  };

  const filtered = selectedProjectId === "all" ? projects : projects.filter((p) => p.id === selectedProjectId);
  const activeProjects = filtered.filter((p) => !p.masterDone && !p.completed);

  // When "all", sum ALL paid transactions (including those without a projectId).
  // When filtered by project, use getProjectFinancials for that project.
  const financials = useMemo(() => {
    if (selectedProjectId !== "all") {
      return filtered.reduce(
        (acc, p) => {
          const f = getProjectFinancials(p.id);
          acc.totalIncome += f.totalIncome;
          acc.totalExpense += f.totalExpense;
          acc.profit += f.profit;
          return acc;
        },
        { totalIncome: 0, totalExpense: 0, profit: 0 }
      );
    }
    // "all" — aggregate every paid transaction regardless of projectId
    return transactions
      .filter((t) => t.paid)
      .reduce(
        (acc, t) => {
          if (t.type === "income") acc.totalIncome += t.amount;
          else acc.totalExpense += t.amount;
          acc.profit = acc.totalIncome - acc.totalExpense;
          return acc;
        },
        { totalIncome: 0, totalExpense: 0, profit: 0 }
      );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, filtered, transactions]);
  const margin = financials.totalIncome > 0 ? (financials.profit / financials.totalIncome) * 100 : null;

  const kpis = [
    { label: "Receita Total", value: fmt.format(financials.totalIncome), icon: DollarSign, colorClass: "text-success" },
    { label: "Investimento", value: fmt.format(financials.totalExpense), icon: Wallet, colorClass: "text-amber-400" },
    { label: "Resultado", value: fmt.format(financials.profit), icon: TrendingUp, colorClass: financials.profit >= 0 ? "text-success" : "text-destructive" },
    { label: "Margem", value: margin !== null ? `${margin.toFixed(1)}%` : "—", icon: Percent, colorClass: "text-primary" },
  ];

  const upcomingReleases = projects
    .filter((p) => !p.completed && (p.stage === "upload" || p.stage === "master" || p.stage === "lancado"))
    .sort((a, b) => {
      if (!a.uploadDate && !b.uploadDate) return 0;
      if (!a.uploadDate) return 1;
      if (!b.uploadDate) return -1;
      return a.uploadDate.localeCompare(b.uploadDate);
    });

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-card/40 backdrop-blur-md p-4 -mx-4 md:-mx-6 md:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold neon-text">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Olá, {displayName} 👋
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-full sm:w-[180px] bg-card/60">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Filtrar projeto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => navigate("/projects")} className="neon-glow active:scale-95 transition-transform w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-1" /> <span>Novo Projeto</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in">
        {kpis.map(({ label, value, icon: Icon, colorClass }, i) => (
          <Card key={label} className="glass-card" style={{ animationDelay: `${i * 60}ms` }}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-card/60 ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-sm font-semibold font-mono-nums ${colorClass}`}>{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {projects.length === 0 && <FirstRunEmptyState onNavigate={navigate} />}
        {/* Active Projects — hidden on first run */}
        <Card className={cn("glass-card animate-fade-in", projects.length === 0 && "hidden")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mic2 className="h-4 w-4 text-primary" />
              Meus Projetos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeProjects.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum projeto ativo.</p>
            )}
            {activeProjects.map((p, i) => (
              <div
                key={p.id}
                className="gradient-border flex items-center gap-3 rounded-lg p-3 cursor-pointer hover:-translate-y-0.5 transition-all duration-200 bg-card/60"
                style={{ animationDelay: `${i * 80}ms` }}
                onClick={() => navigate(`/projects?id=${p.id}`)}
              >
                <Music2 className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">{p.name}</span>
                  <p className="text-xs text-muted-foreground">{p.artist}</p>
                </div>
                <Badge variant={p.stage === "master" ? "default" : "secondary"} className="text-[10px] shrink-0">
                  {p.stage}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Checklist do Dia — hidden on first run */}
        <Card className={cn("glass-card animate-fade-in", projects.length === 0 && "hidden")} style={{ animationDelay: "100ms" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Headphones className="h-4 w-4 text-primary" /> Checklist do Dia
              {activeTasks.length > 0 && (
                <Badge variant="secondary" className="text-xs">{activeTasks.length}</Badge>
              )}
              <div className="ml-auto flex items-center gap-1.5">
                {lastRefreshed && !refreshing && (
                  <span className="text-[10px] text-muted-foreground font-mono-nums">
                    {lastRefreshed.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={handleRefreshTasks}
                  disabled={refreshing}
                  title={lastRefreshed ? `Última atualização: ${lastRefreshed.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Atualizar checklist"}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Add task input */}
            <div className="flex gap-2">
              <Input
                placeholder="Nova tarefa…"
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddTask(); }}
                className="h-8 text-sm"
              />
              <Button size="sm" className="h-8 px-2 shrink-0" onClick={handleAddTask} disabled={!newTaskDesc.trim()}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Filter chips */}
            {activeTasks.length > 0 && (() => {
              const presentSources = Array.from(new Set(activeTasks.map((t) => t.source)));
              const chips = [
                { key: "all", label: "Todas" },
                ...["payment", "deadline", "master_check", "budget", "invite_pending", "inactivity", "release"]
                  .filter((s) => presentSources.includes(s))
                  .map((s) => ({ key: s, label: getSourceMeta(s).label })),
                ...(presentSources.includes("manual") ? [{ key: "manual", label: "manual" }] : []),
              ];
              if (chips.length <= 2) return null;
              return (
                <div className="flex flex-wrap gap-1.5">
                  {chips.map(({ key, label }) => {
                    const active = taskFilter === key;
                    const meta = key !== "all" ? getSourceMeta(key) : null;
                    return (
                      <button
                        key={key}
                        onClick={() => setTaskFilter(active ? "all" : key)}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all",
                          active
                            ? "bg-primary/20 border-primary/50 text-primary"
                            : "bg-secondary/50 border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
                        )}
                      >
                        {meta && <meta.icon className={cn("h-2.5 w-2.5", active ? "text-primary" : meta.color)} />}
                        {label}
                        {key !== "all" && (
                          <span className="opacity-60">
                            {activeTasks.filter((t) => t.source === key).length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* Active tasks */}
            {tasksLoading ? (
              <p className="text-xs text-muted-foreground text-center py-3 animate-pulse">{t("misc.loading")}</p>
            ) : activeTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">Nenhuma tarefa pendente. 🎉</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {activeTasks
                  .filter((t) => taskFilter === "all" || t.source === taskFilter)
                  .map((task) => {
                  const dueBadge = formatDueDate(task.dueDate);
                  const meta = getSourceMeta(task.source);
                  const SourceIcon = meta.icon;
                  return (
                    <div key={task.id} className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary/30 transition-colors group">
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => toggleTask(task.id)}
                        className="shrink-0 mt-0.5"
                      />
                      {task.autoGenerated && (
                        <SourceIcon className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", meta.color)} />
                      )}
                      <span className="flex-1 text-xs leading-snug">
                        {task.description}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {dueBadge && (
                          <span className={cn("text-[10px] font-mono-nums flex items-center gap-0.5", dueBadge.color)}>
                            <CalendarClock className="h-3 w-3" />
                            {dueBadge.label}
                          </span>
                        )}
                        {task.autoGenerated && (
                          <Badge
                            variant="outline"
                            className={cn("text-[9px] h-4 px-1 border-border/40", meta.color)}
                          >
                            {meta.label}
                          </Badge>
                        )}
                        {(task.source === "music-dna" || task.description.startsWith("[DNA]")) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-primary hover:text-primary/80"
                            title="Enviar para o assistente IA"
                             onClick={() => {
                               const desc = task.description.replace(/^\[DNA\]\s*/, "");
                               aiRef.current?.sendMessage(
                                 `[Instrução: responda APENAS com os passos técnicos para aplicar esta técnica. Não mencione outras tarefas, prazos, vencimentos ou finanças.]\n\n${desc}`
                               );
                             }}
                          >
                            <Bot className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={() => deleteTask(task.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completed tasks collapsible */}
            {completedTasks.length > 0 && (
              <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1 w-full">
                    <ChevronDown className={cn("h-3 w-3 transition-transform", completedOpen && "rotate-180")} />
                    Concluídas ({completedTasks.length})
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-1 mt-1 max-h-32 overflow-y-auto">
                    {completedTasks.slice(0, 10).map((task) => (
                      <div key={task.id} className="flex items-center gap-2 rounded-lg px-2 py-1 group opacity-60 hover:opacity-80">
                        <Checkbox checked={true} onCheckedChange={() => toggleTask(task.id)} className="shrink-0" />
                        <span className="flex-1 text-xs line-through text-muted-foreground">{task.description}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={() => deleteTask(task.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>

        {/* AI Assistant Card — hidden on first run */}
        <Card className={cn("glass-card animate-fade-in border-primary/20 lg:col-span-1", projects.length === 0 && "hidden")} style={{ animationDelay: "150ms" }}>
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
            {(() => {
              // ── Build context-aware chips ──────────────────────────
              const chips: Array<{ label: string; msg: string; highlight?: boolean }> = [];

              // Urgent tasks
              const urgentTasks = activeTasks.filter((t) => t.source === "deadline" || t.source === "payment");
              if (urgentTasks.length > 0) {
                chips.push({
                  label: `⚠️ ${urgentTasks.length} urgente${urgentTasks.length > 1 ? "s" : ""}`,
                  msg: "Quais são minhas pendências mais urgentes agora? Liste com prazo e contexto.",
                  highlight: true,
                });
              }

              // Projects by stage
              const byStage: Record<string, typeof projects> = {};
              projects.forEach((p) => {
                if (!p.completed) (byStage[p.stage] = byStage[p.stage] ?? []).push(p);
              });
      const stageLabels: Record<string, string> = {
                inicio: "🎵 Iniciado",
                gravacao: "🎙️ Gravação",
                mix: "🎛️ Mix",
                master: "🔊 Master",
                upload: "🚀 Upload",
                lancado: "🏆 Lançado",
              };
              Object.entries(byStage).forEach(([stage, list]) => {
                const lbl = stageLabels[stage];
                if (!lbl) return;
                chips.push({
                  label: `${lbl} (${list.length})`,
                  msg: `Fale sobre os projetos em fase de ${stage}: ${list.map((p) => p.name).join(", ")}. O que preciso fazer para avançar?`,
                });
              });

              // Mix/Master tech chip based on active projects
              const mixProjects = projects.filter((p) => !p.completed && p.stage === "mix");
              const masterProjects = projects.filter((p) => !p.completed && p.stage === "master");
              if (mixProjects.length > 0) {
                chips.push({
                  label: "🎛️ Dica de mix",
                  msg: `Tenho ${mixProjects.length} projeto(s) em fase de mix: ${mixProjects.map((p) => p.name).join(", ")}. Me dá dicas de EQ, compressão ou balanceamento para avançar.`,
                });
              }
              if (masterProjects.length > 0) {
                chips.push({
                  label: "🔊 Checar master",
                  msg: `Tenho ${masterProjects.length} projeto(s) em fase de master: ${masterProjects.map((p) => p.name).join(", ")}. Quais critérios devo checar antes de finalizar a master?`,
                });
              }

              // Generic tech tip if no stage-specific chip
              if (mixProjects.length === 0 && masterProjects.length === 0 && projects.length > 0) {
                chips.push({
                  label: "🎙️ Dica técnica",
                  msg: "Me dá uma dica prática de produção musical que posso aplicar hoje nos meus projetos.",
                });
              }

              // No projects fallback
              if (projects.length === 0) {
                chips.length = 0;
                chips.push({ label: "🎵 Criar projeto", msg: "Como devo organizar meu primeiro projeto musical? Quais informações são essenciais?" });
                chips.push({ label: "🎙️ Dicas de gravação", msg: "Sou um artista independente. Me dá dicas fundamentais para começar a gravar com qualidade em casa." });
                chips.push({ label: "🔊 LUFS streaming", msg: "Quais são os alvos de LUFS para Spotify, YouTube e Apple Music?" });
              }

              return (
                <AITaskAssistant
                  ref={aiRef}
                  alwaysOpen
                  contextChips={chips}
                  context={{
                    projects: projects.map((p) => ({
                      id: p.id,
                      name: p.name,
                      artist: p.artist,
                      stage: p.stage,
                      mixPercent: getMixPercent(p.id),
                      projectType: p.projectType,
                      totalContractValue: p.totalContractValue,
                      amountPaid: p.amountPaid,
                      estimatedMonths: p.estimatedMonths,
                    })),
                    activeTasks: activeTasks.map((t) => ({
                      description: t.description,
                      source: t.source,
                      dueDate: t.dueDate,
                    })),
                    financials,
                    professionals: professionals.map((p) => ({
                      name: p.name,
                      specialty: p.specialty,
                      bio: p.bio ?? "",
                      active: true,
                      phone: p.phone ?? "",
                    })),
                  }}
                  onAddTask={async (description, projectId) => {
                    const validProjectId = projectId && projects.some((p) => p.id === projectId) ? projectId : null;
                    const result = await addTask({ description, projectId: validProjectId, source: "manual" });
                    if (!result) {
                      await addTask({ description, projectId: null, source: "manual" });
                    }
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
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Últimas Transações — visible when there are transactions */}
      {transactions.length > 0 && (
        <Card className="glass-card animate-fade-in" style={{ animationDelay: "220ms" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Últimas Transações
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-xs text-muted-foreground hover:text-primary h-7 px-2"
                onClick={() => navigate("/finance")}
              >
                Ver todas <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {[...transactions]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 5)
                .map((tx) => {
                  const dateStr = new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
                  const isIncome = tx.type === "income";
                  return (
                    <div key={tx.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/20 transition-colors">
                      <span className="text-xs text-muted-foreground font-mono-nums w-11 shrink-0">{dateStr}</span>
                      <span className="flex-1 text-sm truncate">{tx.description}</span>
                      <span className={`text-sm font-bold font-mono-nums shrink-0 ${isIncome ? "text-success" : "text-destructive"}`}>
                        {isIncome ? "+" : "-"}R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border shrink-0 ${
                        tx.paid
                          ? "text-success border-success/30 bg-success/10"
                          : "text-muted-foreground border-border/50 bg-secondary/30"
                      }`}>
                        {tx.paid ? "Pago" : "Pendente"}
                      </span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Releases Card — hidden on first run */}
      <Card className={cn("glass-card animate-fade-in", projects.length === 0 && "hidden")} style={{ animationDelay: "200ms" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            Próximos Lançamentos
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-xs text-muted-foreground hover:text-primary h-7 px-2"
              onClick={() => navigate("/projects")}
            >
              Ver projetos <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingReleases.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum projeto chegou ao estágio de master ou lançamento ainda.
              </p>
              <Button size="sm" variant="outline" onClick={() => navigate("/projects")}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Criar projeto
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingReleases.map((p) => {
                const mixPct = getMixPercent(p.id);
                const stageLabel = p.stage === "lancado" ? "Lançado" : p.stage === "upload" ? "Pronto p/ Lançar" : "Em Master";
                const stageBadgeVariant = (p.stage === "upload" || p.stage === "lancado") ? "default" : "secondary";
                const typeLabel = p.projectType === "single" ? "Single" : p.projectType === "ep" ? "EP" : p.projectType === "album" ? "Álbum" : (p.projectType ? String(p.projectType).toUpperCase() : "—");
                const relDate = p.uploadDate ? formatDueDate(p.uploadDate) : null;
                return (
                  <div
                    key={p.id}
                    className="gradient-border flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-lg p-3 cursor-pointer hover:-translate-y-0.5 transition-all duration-200 bg-card/60"
                    onClick={() => navigate(`/projects?id=${p.id}`)}
                  >
                    {/* Name + Artist + Badge (mobile row) */}
                    <div className="flex items-center justify-between sm:contents">
                      <div className="min-w-0 sm:w-40 sm:shrink-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.artist || "—"}</p>
                      </div>
                      <Badge variant={stageBadgeVariant} className="text-[10px] shrink-0 whitespace-nowrap sm:hidden">
                        {stageLabel}
                      </Badge>
                    </div>

                    {/* Type + Progress */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{typeLabel}</span>
                        <span className="text-[10px] font-mono-nums text-muted-foreground">{mixPct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full neon-progress-bar transition-all duration-700"
                          style={{ width: `${mixPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Release date — hidden on xs */}
                    <div className="hidden sm:flex items-center gap-1.5 shrink-0 w-28 justify-end">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {relDate ? (
                        <span className={cn("text-xs font-mono-nums", relDate.color)}>{relDate.label}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem data</span>
                      )}
                    </div>

                    {/* Stage badge — hidden on xs (shown inline above) */}
                    <Badge variant={stageBadgeVariant} className="text-[10px] shrink-0 whitespace-nowrap hidden sm:inline-flex">
                      {stageLabel}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
