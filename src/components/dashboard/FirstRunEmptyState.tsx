import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus, ArrowRight, Sparkles, CheckCircle2, Circle,
  FolderPlus, ListMusic, UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project } from "@/data/mockData";
import type { Profile } from "@/contexts/ProfileContext";
import { getJourneyPlan } from "@/lib/journeyPersonalization";

const ONBOARDING_STEPS = [
  {
    id: "create_project",
    icon: FolderPlus,
    label: "Criar seu primeiro projeto",
    desc: "Escolha um nome, tipo e gênero para sua música",
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

export default function FirstRunEmptyState({ onNavigate, recentProject, profile }: { onNavigate: (path: string) => void; recentProject?: Project | null; profile?: Profile | null }) {
  const STORAGE_KEY = "sfp_onboarding_done";
  const [done, setDone] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
  });
  const plan = useMemo(() => getJourneyPlan(profile?.main_pain ?? "organization", profile?.current_moment ?? "", profile?.track_view_mode ?? "basic"), [profile]);

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

  if (recentProject) {
    return (
      <div className="col-span-full animate-fade-in">
        <Card className="glass-card border-primary/20 relative overflow-hidden">
          <CardContent className="p-6 md:p-8 relative z-10 space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-primary">Projeto criado pelo onboarding</p>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-1">{recentProject.name} já está pronto para avançar</h2>
                <p className="text-muted-foreground text-sm leading-relaxed mt-2 max-w-md">
                  Agora vamos transformar suas respostas em progresso real: checklist, análise técnica e próximas ações.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button className="gap-2" size="lg" onClick={() => onNavigate(`/projects/${recentProject.id}`)}>
                Ver projeto <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" onClick={() => onNavigate(plan.primaryPath)}>{plan.primaryLabel}</Button>
              <Button variant="secondary" size="lg" onClick={() => onNavigate("/music-dna")}>Analisar faixa</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="col-span-full animate-fade-in">
      <Card className={cn(
        "glass-card border-primary/30 relative overflow-hidden",
        allDone && "border-success/40"
      )}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
        <CardContent className="p-6 md:p-8 relative z-10">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-primary/15 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">Primeiros passos</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Vamos criar seu primeiro projeto
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-md">
                Do rascunho ao lançamento — organize sua música, acompanhe o progresso e colabore com sua equipe em um só lugar.
              </p>
              <Button
                className="active:scale-95 transition-transform gap-2"
                size="lg"
                onClick={() => onNavigate("/projects?new=1")}
              >
                <Plus className="h-4 w-4" />
                Criar seu primeiro projeto
              </Button>
            </div>
            <div className="w-full md:w-72 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-foreground">Checklist de início</p>
                <span className="text-xs text-muted-foreground font-mono-nums">
                  {completedCount}/{totalCount}
                </span>
              </div>
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
                  Tudo pronto! Agora é só criar música.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
