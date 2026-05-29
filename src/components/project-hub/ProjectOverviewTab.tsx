import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import ProjectCulturalProfile from "@/components/project-hub/ProjectCulturalProfile";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle, Calendar, CheckCircle2, Clock, DollarSign, ListChecks, Users, Rocket, ArrowRight, MessageCircle,
  FileText, CalendarPlus, ChevronRight, Dna,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjects } from "@/contexts/ProjectContext";
import { useTasks } from "@/hooks/useTasks";
import { useReleaseChecklist } from "@/hooks/useReleaseChecklist";
import { useProjectAnalyses } from "@/hooks/useProjectAnalyses";

const STAGE_STEPS = ["inicio", "gravacao", "mix", "master", "upload", "lancado"] as const;
const STAGE_LABEL: Record<string, string> = {
  inicio: "Projeto Iniciado", gravacao: "Gravação", mix: "Mix", master: "Master", upload: "Upload", lancado: "Lançado", rough: "Rascunho",
};
const TYPE_LABEL: Record<string, string> = {
  single: "Single", ep: "EP", album: "Álbum", beat: "Beat / Base", trilha_guia: "Trilha Guia", feat: "Feat",
};

interface ProjectOverviewTabProps {
  project: { id: string; name: string; artist: string; stage: string; completed: boolean; projectType: string };
  progress?: number;
  isOwner: boolean;
  onSwitchTab?: (tab: string) => void;
}

function formatDueDate(d: string | null) {
  if (!d) return null;
  const date = new Date(d + "T12:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.floor((date.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d atraso`, color: "text-destructive", urgent: true };
  if (diff === 0) return { label: "Hoje", color: "text-warning", urgent: true };
  if (diff === 1) return { label: "Amanhã", color: "text-warning", urgent: true };
  if (diff <= 7) return { label: `em ${diff}d`, color: "text-warning/80", urgent: false };
  return { label: `em ${diff}d`, color: "text-muted-foreground", urgent: false };
}

export default function ProjectOverviewTab({ project, progress, isOwner, onSwitchTab }: ProjectOverviewTabProps) {
  const currentStageIdx = STAGE_STEPS.indexOf(project.stage as any);
  const { getProjectFinancials, professionals, transactions } = useProjects();
  const { activeTasks } = useTasks();
  const { progress: releaseProgress, checkedItems, totalItems } = useReleaseChecklist(project.id);

  const { data: dnaAnalyses = [] } = useProjectAnalyses(isOwner ? project.id : null);

  const fin = isOwner ? getProjectFinancials(project.id) : null;
  const team = isOwner ? (professionals[project.id] || []) : [];
  const projectTasks = activeTasks.filter((t) => t.projectId === project.id);
  const overdueTasks = projectTasks.filter((t) => t.dueDate && formatDueDate(t.dueDate)?.urgent);
  const projectTxs = transactions.filter((t) => t.projectId === project.id);
  const unpaidFees = isOwner ? team.filter((p) => p.fee > 0).reduce((acc, p) => acc + p.fee, 0) : 0;
  const pendingTxs = projectTxs.filter((t) => !t.paid);

  type NextActionSeverity = "critical" | "warning" | "info";
  const nextAction: { label: string; severity: NextActionSeverity; tab: string | null } = (() => {
    if (overdueTasks.length > 0) return { label: `Resolver ${overdueTasks.length} tarefa${overdueTasks.length > 1 ? "s" : ""} vencida${overdueTasks.length > 1 ? "s" : ""}`, severity: "critical", tab: "tasks" };
    if (pendingTxs.length > 0) return { label: `${pendingTxs.length} pagamento${pendingTxs.length > 1 ? "s" : ""} pendente${pendingTxs.length > 1 ? "s" : ""}`, severity: "warning", tab: "finance" };
    if (projectTasks.length > 0) return { label: projectTasks[0].description, severity: "info", tab: "tasks" };
    if (project.stage === "upload" || project.stage === "master") return { label: "Preparar lançamento", severity: "info", tab: "release" };
    return { label: "Avançar para próxima etapa", severity: "info", tab: null };
  })();

  const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      {/* Stage timeline */}
      <Card className="border-border bg-card/50">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">{STAGE_LABEL[project.stage] ?? project.stage}</p>
            {progress !== undefined && (
              <span className="text-xs font-mono-nums text-primary font-bold tabular-nums">{progress}%</span>
            )}
          </div>
          {progress !== undefined && <Progress value={progress} className="h-1.5 mb-4" />}
          <div className="relative flex items-start justify-between">
            <div className="absolute top-[5px] left-[8%] right-[8%] h-px bg-muted-foreground/15 z-0" />
            {STAGE_STEPS.map((stage, i) => {
              const done = i < currentStageIdx || project.completed;
              const current = i === currentStageIdx && !project.completed;
              return (
                <div key={stage} className="flex flex-col items-center gap-1.5 flex-1 relative z-10">
                  <div className={cn(
                    "h-3 w-3 rounded-full border-2 transition-all",
                    done ? "bg-success border-success" :
                    current ? "bg-primary border-primary ring-4 ring-primary/20 ring-offset-1 ring-offset-card" :
                    "bg-card border-muted-foreground/30",
                  )} />
                  <span className={cn(
                    "text-[9px] text-center leading-tight",
                    current ? "text-primary font-semibold" : done ? "text-success/80" : "text-muted-foreground/50",
                  )}>
                    {STAGE_LABEL[stage]}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Next action */}
      {isOwner && (
        <div
          role={nextAction.tab ? "button" : undefined}
          tabIndex={nextAction.tab ? 0 : undefined}
          className={cn(
            "rounded-lg border p-3 flex items-center gap-3 transition-colors",
            nextAction.tab ? "cursor-pointer" : "",
            nextAction.severity === "critical" ? "border-destructive/40 bg-destructive/5 hover:bg-destructive/10" :
            nextAction.severity === "warning" ? "border-warning/40 bg-warning/5 hover:bg-warning/10" :
            "border-primary/30 bg-primary/5 hover:bg-primary/10",
          )}
          onClick={() => nextAction.tab && onSwitchTab?.(nextAction.tab)}
          onKeyDown={(e) => { if (e.key === "Enter" && nextAction.tab) onSwitchTab?.(nextAction.tab); }}
        >
          <ArrowRight className={cn("h-4 w-4 shrink-0",
            nextAction.severity === "critical" ? "text-destructive" :
            nextAction.severity === "warning" ? "text-warning" : "text-primary"
          )} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Próxima ação</p>
            <p className="text-sm font-medium truncate">{nextAction.label}</p>
          </div>
          {nextAction.tab && (
            <ChevronRight className={cn("h-4 w-4 shrink-0",
              nextAction.severity === "critical" ? "text-destructive/60" :
              nextAction.severity === "warning" ? "text-warning/60" : "text-primary/60"
            )} />
          )}
        </div>
      )}

      {/* Summary cards grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Type */}
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Tipo</p>
          <p className="text-sm font-medium mt-0.5">{TYPE_LABEL[project.projectType] ?? project.projectType}</p>
        </div>
        {/* Status */}
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="mt-0.5">
            {project.completed ? (
              <Badge className="bg-success/20 text-success border-success/30 text-xs">Concluído</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">{STAGE_LABEL[project.stage] ?? project.stage}</Badge>
            )}
          </div>
        </div>

        {/* Tasks summary */}
        {isOwner && (
          <div
            className="rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => onSwitchTab?.("tasks")}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <ListChecks className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs text-muted-foreground">Tarefas</p>
            </div>
            <p className="text-sm font-semibold">{projectTasks.length} pendente{projectTasks.length !== 1 ? "s" : ""}</p>
            {overdueTasks.length > 0 && (
              <p className="text-[10px] text-destructive mt-0.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {overdueTasks.length} vencida{overdueTasks.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}

        {/* Team summary */}
        {isOwner && (
          <div
            className="rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => onSwitchTab?.("team")}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs text-muted-foreground">Equipe</p>
            </div>
            <p className="text-sm font-semibold">{team.length} membro{team.length !== 1 ? "s" : ""}</p>
          </div>
        )}

        {/* Finance summary */}
        {isOwner && fin && (
          <div
            className="rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => onSwitchTab?.("finance")}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-success" />
              <p className="text-xs text-muted-foreground">Financeiro</p>
            </div>
            <p className={cn("text-sm font-semibold font-mono-nums", fin.profit >= 0 ? "text-success" : "text-destructive")}>
              {fmt.format(fin.profit)}
            </p>
            {pendingTxs.length > 0 && (
              <p className="text-[10px] text-warning mt-0.5">{pendingTxs.length} pendente{pendingTxs.length > 1 ? "s" : ""}</p>
            )}
          </div>
        )}

        {/* Release summary */}
        {isOwner && (
          <div
            className="rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => onSwitchTab?.("release")}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Rocket className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs text-muted-foreground">Lançamento</p>
            </div>
            <p className="text-sm font-semibold">{releaseProgress}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{checkedItems}/{totalItems} itens</p>
          </div>
        )}
      </div>

      {/* WhatsApp share */}
      {isOwner && (
        <button
          onClick={() => {
            const text = encodeURIComponent(
              `🎵 Atualização do projeto "${project.name}"${project.artist ? ` — ${project.artist}` : ""}\n` +
              `📍 Estágio: ${STAGE_LABEL[project.stage] ?? project.stage}\n` +
              `📊 Progresso do lançamento: ${releaseProgress}% (${checkedItems}/${totalItems} itens)\n\n` +
              `Enviado via MusicOS.ai`
            );
            window.open(`https://wa.me/?text=${text}`, "_blank");
          }}
          className="w-full rounded-lg border border-border p-3 flex items-center gap-2.5 hover:bg-muted/30 transition-colors text-left"
        >
          <MessageCircle className="h-4 w-4 text-success shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Compartilhar via WhatsApp</p>
            <p className="text-[10px] text-muted-foreground">Enviar resumo do projeto para contatos</p>
          </div>
        </button>
      )}

      {/* Music DNA panel */}
      {isOwner && (
        <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
            <div className="flex items-center gap-1.5">
              <Dna className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold">Music DNA</span>
              {dnaAnalyses.length > 0 && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{dnaAnalyses.length}</Badge>
              )}
            </div>
            <Link
              to={`/music-dna?project=${project.id}`}
              className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
            >
              Analisar faixa <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {dnaAnalyses.length === 0 ? (
            <Link
              to={`/music-dna?project=${project.id}`}
              className="flex items-center gap-2.5 px-3 py-3 hover:bg-muted/30 transition-colors group"
            >
              <Dna className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              <p className="text-xs text-muted-foreground flex-1">Nenhuma análise vinculada — clique para analisar uma faixa</p>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
            </Link>
          ) : (
            <div className="divide-y divide-border/30">
              {dnaAnalyses.map((a) => {
                const lufs = a.lufs_integrated;
                const lufsColor = lufs === null ? "text-muted-foreground" : lufs >= -14 ? "text-success" : lufs >= -16 ? "text-warning" : "text-destructive";
                return (
                  <Link
                    key={a.id}
                    to={`/music-dna?analysis=${a.id}`}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{a.track_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {a.stage && <Badge variant="outline" className="text-[9px] h-4 px-1">{a.stage}</Badge>}
                        {a.version_label && <span className="text-[10px] text-muted-foreground">{a.version_label}</span>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right space-y-0.5">
                      {a.genre && <p className="text-[10px] text-muted-foreground/80 truncate max-w-[100px]">{a.genre}</p>}
                      {lufs !== null && (
                        <p className={cn("text-[11px] font-mono-nums font-medium", lufsColor)}>
                          {lufs.toFixed(1)} LUFS
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary/60 shrink-0 transition-colors" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Quick links to related modules */}
      {isOwner && (
        <div className="grid grid-cols-2 gap-2">
          <Link
            to={`/carreira?project=${project.id}`}
            className="rounded-lg border border-border p-2.5 flex items-center gap-2 hover:bg-muted/30 hover:border-primary/40 transition-colors group"
          >
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">Buscar editais</p>
              <p className="text-[10px] text-muted-foreground">Compatíveis com este projeto</p>
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </Link>
          <Link
            to={`/agenda?new=1&project=${project.id}`}
            className="rounded-lg border border-border p-2.5 flex items-center gap-2 hover:bg-muted/30 hover:border-primary/40 transition-colors group"
          >
            <CalendarPlus className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">Adicionar à agenda</p>
              <p className="text-[10px] text-muted-foreground">Show, ensaio ou prazo</p>
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </Link>
        </div>
      )}

      {/* Cultural Profile */}
      {isOwner && <ProjectCulturalProfile projectId={project.id} />}
    </div>
  );
}
