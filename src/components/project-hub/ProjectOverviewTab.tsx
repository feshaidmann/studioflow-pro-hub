import { Card, CardContent } from "@/components/ui/card";
import ProjectCulturalProfile from "@/components/project-hub/ProjectCulturalProfile";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle, Calendar, CheckCircle2, Clock, DollarSign, ListChecks, Users, Rocket, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjects } from "@/contexts/ProjectContext";
import { useTasks } from "@/hooks/useTasks";
import { useReleaseChecklist } from "@/hooks/useReleaseChecklist";

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
  if (diff === 0) return { label: "Hoje", color: "text-amber-400", urgent: true };
  if (diff === 1) return { label: "Amanhã", color: "text-amber-400", urgent: true };
  if (diff <= 7) return { label: `em ${diff}d`, color: "text-amber-400/80", urgent: false };
  return { label: `em ${diff}d`, color: "text-muted-foreground", urgent: false };
}

export default function ProjectOverviewTab({ project, progress, isOwner, onSwitchTab }: ProjectOverviewTabProps) {
  const currentStageIdx = STAGE_STEPS.indexOf(project.stage as any);
  const { getProjectFinancials, professionals, transactions } = useProjects();
  const { activeTasks } = useTasks();
  const { progress: releaseProgress, checkedItems, totalItems } = useReleaseChecklist(project.id);

  const fin = isOwner ? getProjectFinancials(project.id) : null;
  const team = isOwner ? (professionals[project.id] || []) : [];
  const projectTasks = activeTasks.filter((t) => t.projectId === project.id);
  const overdueTasks = projectTasks.filter((t) => t.dueDate && formatDueDate(t.dueDate)?.urgent);
  const projectTxs = transactions.filter((t) => t.projectId === project.id);
  const unpaidFees = isOwner ? team.filter((p) => p.fee > 0).reduce((acc, p) => acc + p.fee, 0) : 0;
  const pendingTxs = projectTxs.filter((t) => !t.paid);

  // Determine "next action"
  const nextAction = (() => {
    if (overdueTasks.length > 0) return { label: `Resolver ${overdueTasks.length} tarefa${overdueTasks.length > 1 ? "s" : ""} vencida${overdueTasks.length > 1 ? "s" : ""}`, severity: "critical" as const };
    if (pendingTxs.length > 0) return { label: `${pendingTxs.length} pagamento${pendingTxs.length > 1 ? "s" : ""} pendente${pendingTxs.length > 1 ? "s" : ""}`, severity: "warning" as const };
    if (projectTasks.length > 0) return { label: projectTasks[0].description, severity: "info" as const };
    if (project.stage === "upload" || project.stage === "master") return { label: "Preparar lançamento", severity: "info" as const };
    return { label: "Avançar para próxima etapa", severity: "info" as const };
  })();

  const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      {/* Stage timeline */}
      <Card className="border-border bg-card/50">
        <CardContent className="pt-5 pb-4">
          <p className="text-sm font-medium mb-3">{STAGE_LABEL[project.stage] ?? project.stage}</p>
          <div className="flex items-center justify-between">
            {STAGE_STEPS.map((stage, i) => {
              const done = i < currentStageIdx || project.completed;
              const current = i === currentStageIdx && !project.completed;
              return (
                <div key={stage} className="flex flex-col items-center gap-1 flex-1">
                  <div className={cn(
                    "h-2.5 w-2.5 rounded-full transition-all",
                    done ? "bg-success" : current ? "bg-primary ring-2 ring-primary/30 ring-offset-1 ring-offset-card" : "bg-muted-foreground/25",
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
        <Card className={cn(
          "border",
          nextAction.severity === "critical" ? "border-destructive/40 bg-destructive/5" :
          nextAction.severity === "warning" ? "border-amber-400/40 bg-amber-400/5" :
          "border-primary/30 bg-primary/5",
        )}>
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <ArrowRight className={cn("h-4 w-4 shrink-0",
              nextAction.severity === "critical" ? "text-destructive" :
              nextAction.severity === "warning" ? "text-amber-400" : "text-primary"
            )} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Próxima ação</p>
              <p className="text-sm font-medium truncate">{nextAction.label}</p>
            </div>
          </CardContent>
        </Card>
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
              <p className="text-[10px] text-amber-400 mt-0.5">{pendingTxs.length} pendente{pendingTxs.length > 1 ? "s" : ""}</p>
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

      {/* Cultural Profile */}
      {isOwner && <ProjectCulturalProfile projectId={project.id} />}
    </div>
  );
}
