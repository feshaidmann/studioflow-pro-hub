import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ArrowRight, Calendar, MessageSquare, MoreVertical, Music,
  Pencil, Rocket, Sliders, Sparkles, Trash2, Upload, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project } from "@/data/mockData";

interface Props {
  projects: Project[];
  getProjectStatus: (p: Project) => { label: string; color: string; key: string };
  onEdit: (p: Project) => void;
  onDelete: (id: string) => void;
  t: (key: string) => string;
}

const STAGE_ORDER = ["inicio", "gravacao", "mix", "master", "upload", "lancado"];

const NEXT_STEP: Record<string, { label: string; route: (id: string) => string; icon: React.ReactNode }> = {
  inicio: { label: "Convidar equipe", route: (id) => `/projects/${id}#team`, icon: <Users className="h-3.5 w-3.5" /> },
  gravacao: { label: "Agendar sessão", route: (id) => `/agenda?new=1&project=${id}`, icon: <Calendar className="h-3.5 w-3.5" /> },
  mix: { label: "Acompanhar mix", route: (id) => `/projects/${id}`, icon: <Sliders className="h-3.5 w-3.5" /> },
  master: { label: "Analisar master", route: (id) => `/projects/${id}#master`, icon: <Sparkles className="h-3.5 w-3.5" /> },
  upload: { label: "Preparar lançamento", route: (id) => `/projects/${id}#release`, icon: <Upload className="h-3.5 w-3.5" /> },
  lancado: { label: "Ver pós-lançamento", route: (id) => `/projects/${id}#release`, icon: <Rocket className="h-3.5 w-3.5" /> },
};

const STATUS_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "no_prazo", label: "No prazo" },
  { value: "quase", label: "Quase lá" },
  { value: "risco", label: "Em risco" },
  { value: "parado", label: "Parado" },
] as const;

type StatusFilterKey = typeof STATUS_FILTERS[number]["value"];

export function ProjectListView({ projects, getProjectStatus, onEdit, onDelete, t }: Props) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("all");

  const allActive = projects.filter((p) => !p.completed);
  const activeProjects = allActive.filter((p) => statusFilter === "all" || getProjectStatus(p).key === statusFilter);
  const showFilters = allActive.length > 3 || statusFilter !== "all";
  const mostAdvanced = [...allActive].sort((a, b) => STAGE_ORDER.indexOf(b.stage) - STAGE_ORDER.indexOf(a.stage))[0];

  return (
    <>
      {showFilters && (
        <div className="-mx-1 overflow-x-auto pb-1">
          <div className="flex gap-1.5 px-1 min-w-min">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all active:scale-95",
                  statusFilter === f.value
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {activeProjects.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Music className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{statusFilter !== "all" ? "Nenhum projeto encontrado com esses filtros." : t("projects.empty")}</p>
          </div>
        ) : (
          activeProjects.map((project) => {
            const status = getProjectStatus(project);
            const stageIdx = STAGE_ORDER.indexOf(project.stage);
            const progressPct = Math.round(((stageIdx + 1) / STAGE_ORDER.length) * 100);
            const next = NEXT_STEP[project.stage];
            return (
              <Card
                key={project.id}
                role="button"
                tabIndex={0}
                className="glass-card cursor-pointer hover:border-primary/40 hover:shadow-md transition-all active:scale-[0.99]"
                onClick={() => navigate(`/projects/${project.id}`)}
                onKeyDown={(e) => { if (e.key === "Enter") navigate(`/projects/${project.id}`); }}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate">{project.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{project.artist}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 -mr-1 -mt-1 shrink-0"
                          onClick={(e) => e.stopPropagation()} aria-label="Mais ações"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem asChild>
                          <Link to={`/projects/${project.id}`}><ArrowRight className="h-4 w-4 mr-2" />Abrir projeto</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/projects/${project.id}#chat`}><MessageSquare className="h-4 w-4 mr-2" />Conversar com a equipe</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(project); }}>
                          <Pencil className="h-4 w-4 mr-2" />Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <Badge variant="outline" className="text-[10px]">{t(`stage.${project.stage}`)}</Badge>
                      {project.projectType && project.projectType !== "single" && (
                        <Badge variant="secondary" className="text-[10px]">{t(`projects.${project.projectType}`)}</Badge>
                      )}
                      {project.bpm > 0 && (
                        <span className="text-[10px] text-muted-foreground/70 font-mono-nums bg-secondary/40 rounded px-1.5 py-0.5">{project.bpm} BPM</span>
                      )}
                      {project.key && (
                        <span className="text-[10px] text-muted-foreground/70 bg-secondary/40 rounded px-1.5 py-0.5">{project.key}</span>
                      )}
                    </div>
                    <Badge variant="outline" className={cn("text-[10px]", status.color)}>{status.label}</Badge>
                  </div>

                  <div className="space-y-1">
                    <Progress value={progressPct} className="h-2" />
                    <p className="text-[10px] text-muted-foreground font-mono-nums text-right">{progressPct}%</p>
                  </div>

                  {next && (
                    <Link
                      to={next.route(project.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-between rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-primary hover:bg-primary/10 transition-colors"
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        {next.icon}
                        Próximo: {next.label}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {activeProjects.length > 0 && mostAdvanced && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide px-1">
            Continue em <span className="text-foreground font-medium normal-case tracking-normal">{mostAdvanced.name}</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to={`/agenda?new=1&project=${mostAdvanced.id}`}
              className="rounded-lg border border-border bg-card p-3 hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-[0.98]"
            >
              <Calendar className="h-4 w-4 text-primary mb-1.5" />
              <p className="text-xs font-medium leading-tight">Agendar sessão</p>
            </Link>
            <Link
              to={`/projects/${mostAdvanced.id}#master`}
              className="rounded-lg border border-border bg-card p-3 hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4 text-primary mb-1.5" />
              <p className="text-xs font-medium leading-tight">Analisar master</p>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
