import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music2, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { ProjectWithHealth, ProjectHealth } from "@/hooks/useProjectAlerts";

const HEALTH_CONFIG: Record<ProjectHealth, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  organizado: { label: "Organizado", color: "text-success", bg: "bg-success/10 border-success/30", icon: CheckCircle2 },
  atencao: { label: "Atenção", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/30", icon: AlertCircle },
  critico: { label: "Crítico", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30", icon: AlertTriangle },
};

const STAGE_LABEL: Record<string, string> = {
  rough: "Rascunho", inicio: "Iniciado", gravacao: "Gravação", mix: "Mix", master: "Master", upload: "Pronto", lancado: "Lançado",
};

interface ProjectHealthListProps {
  projects: ProjectWithHealth[];
  hidden?: boolean;
}

export default function ProjectHealthList({ projects, hidden }: ProjectHealthListProps) {
  const navigate = useNavigate();

  if (hidden) return null;

  const active = projects.filter((p) => !p.project.completed);

  return (
    <Card className="glass-card animate-fade-in" style={{ animationDelay: "60ms" }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Music2 className="h-4 w-4 text-primary" />
          Projetos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {active.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum projeto ativo.</p>
        )}
        {active.map((pw) => {
          const cfg = HEALTH_CONFIG[pw.health];
          const HealthIcon = cfg.icon;
          return (
            <div
              key={pw.project.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 border border-border/40 bg-card/60 cursor-pointer hover:-translate-y-0.5 transition-all duration-200"
              onClick={() => navigate(`/projects/${pw.project.id}`)}
            >
              <HealthIcon className={cn("h-4 w-4 shrink-0", cfg.color)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{pw.project.name}</p>
                <p className="text-[11px] text-muted-foreground">{pw.project.artist || "—"}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant="secondary" className="text-[10px]">
                  {STAGE_LABEL[pw.project.stage] ?? pw.project.stage}
                </Badge>
                <Badge className={cn("text-[9px] border", cfg.bg, cfg.color)}>
                  {cfg.label}
                </Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
