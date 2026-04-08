import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Headphones, DollarSign, CalendarClock, Clock, ChevronDown,
  Trash2, X, Mail, Activity, BarChart2, Disc3, Megaphone, RefreshCw, Bot,
  AlertTriangle, Ban, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AITaskAssistantHandle } from "@/components/AITaskAssistant";
import type { Task, TaskSection } from "@/hooks/useTasks";
import { groupTasks } from "@/hooks/useTasks";

type SourceMeta = { icon: React.ElementType; color: string; label: string };

function getSourceMeta(source: string): SourceMeta {
  switch (source) {
    case "payment":        return { icon: DollarSign,    color: "text-amber-400",        label: "pagamento" };
    case "deadline":       return { icon: CalendarClock, color: "text-rose-400",          label: "prazo" };
    case "inactivity":     return { icon: Clock,         color: "text-muted-foreground",  label: "inatividade" };
    case "budget":         return { icon: BarChart2,     color: "text-orange-400",        label: "orçamento" };
    case "invite_pending": return { icon: Mail,          color: "text-sky-400",           label: "convite" };
    case "master_check":   return { icon: Disc3,         color: "text-violet-400",        label: "master" };
    case "release":        return { icon: Megaphone,     color: "text-green-400",         label: "lançamento" };
    default:               return { icon: Activity,      color: "text-primary",           label: source || "tarefa" };
  }
}

function formatDueDate(d: string | null) {
  if (!d) return null;
  const date = new Date(d + "T12:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.floor((date.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d atraso`, color: "text-destructive" };
  if (diff === 0) return { label: "Hoje", color: "text-amber-400" };
  if (diff === 1) return { label: "Amanhã", color: "text-amber-400" };
  if (diff <= 3) return { label: `em ${diff}d`, color: "text-amber-400/80" };
  return { label: `em ${diff}d`, color: "text-muted-foreground" };
}

const SECTION_META: Record<TaskSection, { label: string; icon: React.ElementType; color: string }> = {
  overdue: { label: "Vencidas", icon: AlertTriangle, color: "text-destructive" },
  today:   { label: "Hoje",    icon: CalendarClock,  color: "text-amber-400" },
  week:    { label: "Esta semana", icon: CalendarClock, color: "text-primary" },
  blocked: { label: "Bloqueadas", icon: Ban, color: "text-orange-400" },
  later:   { label: "Futuras / Sem prazo", icon: Clock, color: "text-muted-foreground" },
};
const SECTION_ORDER: TaskSection[] = ["overdue", "today", "week", "blocked", "later"];

const SEVERITY_BADGE: Record<string, { label: string; cls: string }> = {
  critical: { label: "Crítica", cls: "text-destructive border-destructive/30 bg-destructive/10" },
  high:     { label: "Alta",    cls: "text-rose-400 border-rose-400/30 bg-rose-400/10" },
  medium:   { label: "Média",   cls: "text-amber-400 border-amber-400/30 bg-amber-400/10" },
  low:      { label: "Baixa",   cls: "text-muted-foreground border-border/30 bg-secondary/30" },
};

interface DailyChecklistProps {
  activeTasks: Task[];
  completedTasks: Task[];
  loading: boolean;
  onAddTask: (desc: string) => Promise<void>;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask?: (id: string, patch: any) => void;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
  lastRefreshed: Date | null;
  hidden?: boolean;
  aiRef?: React.RefObject<AITaskAssistantHandle | null>;
  projects?: Array<{ id: string; name: string }>;
}

export default function DailyChecklist({
  activeTasks, completedTasks, loading, onAddTask, onToggleTask, onDeleteTask, onUpdateTask,
  onRefresh, refreshing, lastRefreshed, hidden, aiRef, projects = [],
}: DailyChecklistProps) {
  const { t } = useLanguage();
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [completedOpen, setCompletedOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  const handleAddTask = async () => {
    if (!newTaskDesc.trim()) return;
    await onAddTask(newTaskDesc.trim());
    setNewTaskDesc("");
  };

  // Apply filters
  let filtered = activeTasks;
  if (sourceFilter !== "all") filtered = filtered.filter((t) => t.source === sourceFilter);
  if (projectFilter !== "all") filtered = filtered.filter((t) => t.projectId === projectFilter);
  if (assigneeFilter !== "all") filtered = filtered.filter((t) => t.assignedTo === assigneeFilter);

  const grouped = groupTasks(filtered);

  // Projects that have tasks
  const projectsWithTasks = projects.filter((p) => activeTasks.some((t) => t.projectId === p.id));

  return (
    <Card className={cn("glass-card animate-fade-in", hidden && "hidden")} style={{ animationDelay: "100ms" }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Headphones className="h-4 w-4 text-primary" /> Checklist do Dia
          {activeTasks.length > 0 && <Badge variant="secondary" className="text-xs">{activeTasks.length}</Badge>}
          <div className="ml-auto flex items-center gap-1.5">
            {lastRefreshed && !refreshing && (
              <span className="text-[10px] text-muted-foreground font-mono-nums">
                {lastRefreshed.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={onRefresh} disabled={refreshing}>
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Add task */}
        <div className="flex gap-2">
          <Input placeholder="Nova tarefa…" value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddTask(); }} className="h-8 text-sm" />
          <Button size="sm" className="h-8 px-2 shrink-0" onClick={handleAddTask} disabled={!newTaskDesc.trim()}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Filters row */}
        {activeTasks.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Source filter chips */}
            {(() => {
              const presentSources = Array.from(new Set(activeTasks.map((t) => t.source)));
              const chips = [
                { key: "all", label: "Todas" },
                ...["payment", "deadline", "master_check", "budget", "invite_pending", "inactivity", "release"]
                  .filter((s) => presentSources.includes(s))
                  .map((s) => ({ key: s, label: getSourceMeta(s).label })),
                ...(presentSources.includes("manual") ? [{ key: "manual", label: "manual" }] : []),
              ];
              if (chips.length <= 2) return null;
              return chips.map(({ key, label }) => {
                const active = sourceFilter === key;
                const meta = key !== "all" ? getSourceMeta(key) : null;
                return (
                  <button
                    key={key}
                    onClick={() => setSourceFilter(active ? "all" : key)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all",
                      active ? "bg-primary/20 border-primary/50 text-primary" : "bg-secondary/50 border-border/40 text-muted-foreground hover:border-border hover:text-foreground",
                    )}
                  >
                    {meta && <meta.icon className={cn("h-2.5 w-2.5", active ? "text-primary" : meta.color)} />}
                    {label}
                    {key !== "all" && <span className="opacity-60">{activeTasks.filter((t) => t.source === key).length}</span>}
                  </button>
                );
              });
            })()}

            {/* Project filter */}
            {projectsWithTasks.length > 1 && (
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="h-6 w-[110px] text-[10px] border-border/40">
                  <SelectValue placeholder="Projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos projetos</SelectItem>
                  {projectsWithTasks.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Assignee filter */}
            {(() => {
              const assignees = Array.from(new Set(activeTasks.map((t) => t.assignedTo).filter(Boolean)));
              if (assignees.length < 2) return null;
              return (
                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger className="h-6 w-[110px] text-[10px] border-border/40">
                    <SelectValue placeholder="Responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">Todos</SelectItem>
                    {assignees.map((a) => (
                      <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            })()}
          </div>
        )}

        {/* Task sections */}
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-3 animate-pulse">{t("misc.loading")}</p>
        ) : activeTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">Nenhuma tarefa pendente. 🎉</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {SECTION_ORDER.map((section) => {
              const sectionTasks = grouped[section];
              if (sectionTasks.length === 0) return null;
              const meta = SECTION_META[section];
              const SectionIcon = meta.icon;
              return (
                <div key={section}>
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <SectionIcon className={cn("h-3 w-3", meta.color)} />
                    <span className={cn("text-[10px] font-semibold uppercase tracking-wider", meta.color)}>{meta.label}</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1">{sectionTasks.length}</Badge>
                  </div>
                  <div className="space-y-0.5">
                    {sectionTasks.map((task) => {
                      const dueBadge = formatDueDate(task.dueDate);
                      const sourceMeta = getSourceMeta(task.source);
                      const SourceIcon = sourceMeta.icon;
                      const sevBadge = task.severity !== "medium" ? SEVERITY_BADGE[task.severity] : null;
                      return (
                        <div key={task.id} className={cn(
                          "flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary/30 transition-colors group",
                          task.blocked && "opacity-70 bg-orange-400/5",
                        )}>
                          <Checkbox checked={task.completed} onCheckedChange={() => onToggleTask(task.id)} className="shrink-0 mt-0.5" />
                          {task.autoGenerated && <SourceIcon className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", sourceMeta.color)} />}
                          {task.blocked && <Ban className="h-3 w-3 shrink-0 mt-0.5 text-orange-400" />}
                          <div className="flex-1 min-w-0">
                            <span className="text-xs leading-snug block">{task.description}</span>
                            {(task.assignedTo || task.blockedReason) && (
                              <div className="flex items-center gap-2 mt-0.5">
                                {task.assignedTo && <span className="text-[9px] text-muted-foreground">→ {task.assignedTo}</span>}
                                {task.blockedReason && <span className="text-[9px] text-orange-400">⚠ {task.blockedReason}</span>}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {sevBadge && (
                              <Badge variant="outline" className={cn("text-[8px] h-3.5 px-1", sevBadge.cls)}>{sevBadge.label}</Badge>
                            )}
                            {dueBadge && (
                              <span className={cn("text-[10px] font-mono-nums flex items-center gap-0.5", dueBadge.color)}>
                                <CalendarClock className="h-3 w-3" /> {dueBadge.label}
                              </span>
                            )}
                            {task.autoGenerated && (
                              <Badge variant="outline" className={cn("text-[9px] h-4 px-1 border-border/40", sourceMeta.color)}>{sourceMeta.label}</Badge>
                            )}
                            {/* Block toggle */}
                            {onUpdateTask && !task.blocked && (
                              <Button
                                variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-orange-400"
                                title="Marcar como bloqueada"
                                onClick={() => onUpdateTask(task.id, { blocked: true, blockedReason: "Aguardando terceiros" })}
                              >
                                <Ban className="h-3 w-3" />
                              </Button>
                            )}
                            {onUpdateTask && task.blocked && (
                              <Button
                                variant="ghost" size="icon" className="h-5 w-5 text-orange-400 hover:text-foreground"
                                title="Desbloquear tarefa"
                                onClick={() => onUpdateTask(task.id, { blocked: false, blockedReason: "" })}
                              >
                                <Shield className="h-3 w-3" />
                              </Button>
                            )}
                            {(task.source === "music-dna" || task.description.startsWith("[DNA]")) && aiRef?.current && (
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-primary hover:text-primary/80" onClick={() => {
                                const desc = task.description.replace(/^\[DNA\]\s*/, "");
                                aiRef.current?.sendMessage(`[Instrução: responda APENAS com os passos técnicos para aplicar esta técnica.]\n\n${desc}`);
                              }}>
                                <Bot className="h-3 w-3" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={() => onDeleteTask(task.id)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Completed */}
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
                    <Checkbox checked onCheckedChange={() => onToggleTask(task.id)} className="shrink-0" />
                    <span className="flex-1 text-xs line-through text-muted-foreground">{task.description}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={() => onDeleteTask(task.id)}>
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
  );
}
