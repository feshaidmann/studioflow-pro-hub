import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Activity, ArrowRight, Check, Music, Pencil, Trash2,
  Trophy, Upload, UserPlus, Users, X as XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ProjectFinanceCard from "@/components/finance/ProjectFinanceCard";
import { AddTeamWizard, type AddTeamWizardProps } from "./AddTeamWizard";
import type { Project, Professional } from "@/data/mockData";
import type { MasterResult } from "@/contexts/ProjectContext";

const STAGE_LIST = ["inicio", "gravacao", "mix", "master", "upload", "lancado"] as const;

type TeamWizardDeps = Omit<AddTeamWizardProps, "open" | "onOpenChange" | "project">;

interface ProjectDetailCardProps extends TeamWizardDeps {
  project: Project;
  teamMembers: Professional[];
  masterResult: MasterResult | undefined;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  removeProfessional: (projectId: string, profId: string) => void;
  onEdit: (p: Project) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onNewTransaction: () => void;
  onMasterAnalyze: () => void;
  onLancadoCompleted: (projectId: string, projectName: string) => Promise<void>;
  setProject: (updater: (prev: Project | null) => Project | null) => void;
}

export function ProjectDetailCard({
  project, teamMembers, masterResult, updateProject, removeProfessional,
  onEdit, onDelete, onClose, onNewTransaction, onMasterAnalyze, onLancadoCompleted,
  setProject,
  // team wizard deps
  globalProfessionals, globalsLoading, addProfessional, addProfessionalToGlobal,
  addNotification, onFeeRequired, t,
}: ProjectDetailCardProps) {
  const navigate = useNavigate();
  const [showTeam, setShowTeam] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <Card className="glass-card animate-scale-in border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{project.name} — {t("projects.timeline")}</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(project)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(project.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {project.artist} · <span className="font-mono-nums">{project.bpm}</span> BPM · {project.key}
        </p>
      </CardHeader>

      <CardContent>
        {/* Timeline */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
          {STAGE_LIST.map((stage, i, arr) => {
            const stageIdx = STAGE_LIST.indexOf(project.stage as typeof STAGE_LIST[number]);
            const completed = project.completed || i < stageIdx;
            const current = !project.completed && i === stageIdx;
            const isLast = i === arr.length - 1;
            const isDisabled = project.completed;
            return (
              <div key={stage} className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={isDisabled}
                  title={isDisabled ? undefined : `Ir para: ${t(`stage.${stage}`)}`}
                  onClick={async () => {
                    if (isDisabled || current) return;
                    if (stage === "lancado") {
                      await updateProject(project.id, { stage: "lancado" });
                      setProject((prev) => prev ? { ...prev, stage: "lancado" } : null);
                      await onLancadoCompleted(project.id, project.name);
                    } else {
                      await updateProject(project.id, { stage });
                      setProject((prev) => prev ? { ...prev, stage } : null);
                      toast.success(`Estágio atualizado: ${t(`stage.${stage}`)}`);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg min-w-[88px] text-center transition-all border focus:outline-none",
                    isDisabled ? "cursor-default opacity-80" : current ? "cursor-default" : "cursor-pointer hover:scale-105 hover:shadow-md",
                    completed
                      ? "bg-success/15 border-success/40 text-success"
                      : current
                      ? "bg-primary/15 border-primary/50 text-primary"
                      : "bg-secondary/30 border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  <span className="text-[11px] font-medium leading-tight">{t(`stage.${stage}`)}</span>
                  {completed
                    ? <Check className="h-3.5 w-3.5" />
                    : current
                    ? <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    : <div className="h-2 w-2 rounded-full bg-border/60" />}
                </button>
                {!isLast && (
                  <div className={cn("h-0.5 w-4 shrink-0 rounded-full transition-colors", completed ? "bg-success/60" : "bg-border/40")} />
                )}
              </div>
            );
          })}
        </div>

        {/* Completion / upload banners */}
        {project.completed ? (
          <div className="mt-4 rounded-lg bg-success/10 border border-success/30 p-3 flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-success">Projeto lançado e concluído! 🎉</span>
            </div>
            <Button
              variant="outline" size="sm"
              className="shrink-0 text-xs h-7 border-success/40 text-success hover:bg-success/10"
              onClick={async () => {
                await updateProject(project.id, { completed: false, stage: "upload" });
                setProject((prev) => prev ? { ...prev, completed: false, stage: "upload" } : null);
                toast.success("Projeto reaberto ✅");
              }}
            >
              Reabrir
            </Button>
          </div>
        ) : project.stage === "upload" && (
          <Button onClick={onMasterAnalyze} className="mt-4 w-full active:scale-95 transition-transform gap-2">
            <Upload className="h-4 w-4" /> Analisar Master (Upload)
          </Button>
        )}

        {/* Master analysis result */}
        {masterResult && (
          <div className="mt-4 rounded-lg bg-primary/5 border border-primary/20 p-3 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Master Analysis</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{masterResult.fileName}</span>
            </div>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">LUFS: </span>
                <span className={cn("font-mono-nums font-bold", masterResult.lufs <= -14 ? "text-success" : "text-destructive")}>
                  {masterResult.lufs.toFixed(1)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Peak: </span>
                <span className={cn("font-mono-nums font-bold", masterResult.truePeak <= -1 ? "text-success" : masterResult.truePeak <= 0 ? "text-warning" : "text-destructive")}>
                  {masterResult.truePeak.toFixed(1)} dBTP
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">DR: </span>
                <span className={cn("font-mono-nums font-bold", masterResult.dynamicRange >= 7 ? "text-success" : "text-warning")}>
                  {masterResult.dynamicRange.toFixed(1)} LU
                </span>
              </div>
            </div>
          </div>
        )}

        <ProjectFinanceCard
          projectId={project.id}
          onNewTransaction={onNewTransaction}
          onViewAll={() => navigate("/finance")}
        />

        {/* Notes */}
        <div className="mt-6 border-t border-border pt-4">
          <Label className="text-sm font-medium mb-2 block">Observações</Label>
          <Textarea
            placeholder="Anotações sobre o projeto, referências, acordos, próximos passos…"
            value={project.notes ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              setProject((prev) => prev ? { ...prev, notes: val } : null);
              if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
              notesDebounceRef.current = setTimeout(() => { updateProject(project.id, { notes: val }); }, 600);
            }}
            className="resize-none h-28"
          />
        </div>

        {/* Team */}
        <div className="mt-6 border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowTeam(!showTeam)}
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
            >
              <Users className="h-4 w-4" />
              Colaboradores ({teamMembers.length})
            </button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setTeamDialogOpen(true)}>
              <UserPlus className="h-3 w-3 mr-1" /> {t("team.add")}
            </Button>
          </div>

          {showTeam && (
            <div className="space-y-2 animate-fade-in">
              {teamMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">{t("team.empty")}</p>
              ) : (
                <>
                  {teamMembers.map((prof) => (
                    <div key={prof.id} className="rounded-lg bg-secondary/30 border border-border p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-wrap gap-1.5">
                          <span className="font-medium text-sm">{prof.name}</span>
                          <Badge variant="secondary" className="text-xs">{prof.role}</Badge>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeProfessional(project.id, prof.id)}>
                          <XIcon className="h-3 w-3" />
                        </Button>
                      </div>
                      {prof.instrument && prof.instrument !== "—" && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Music className="h-3 w-3" />{prof.instrument}
                        </p>
                      )}
                    </div>
                  ))}
                  <Link to={`/projects/${project.id}`}>
                    <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 mt-1">
                      <Users className="h-3.5 w-3.5" />
                      Ver equipe completa e convites
                      <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                    </Button>
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        <AddTeamWizard
          open={teamDialogOpen}
          onOpenChange={setTeamDialogOpen}
          project={project}
          globalProfessionals={globalProfessionals}
          globalsLoading={globalsLoading}
          addProfessional={addProfessional}
          addProfessionalToGlobal={addProfessionalToGlobal}
          addNotification={addNotification}
          onFeeRequired={onFeeRequired}
          t={t}
        />
      </CardContent>
    </Card>
  );
}
