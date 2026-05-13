import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rocket, Plus, Calendar, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Project } from "@/data/mockData";
import { StatusBadge } from "./StatusBadge";

function formatDueDate(d: string | null) {
  if (!d) return null;
  const date = new Date(d + "T12:00:00");
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.floor((date.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d atraso`, color: "text-destructive" };
  if (diff === 0) return { label: "Hoje", color: "text-warning" };
  if (diff === 1) return { label: "Amanhã", color: "text-warning" };
  if (diff <= 3) return { label: `em ${diff}d`, color: "text-warning/80" };
  return { label: `em ${diff}d`, color: "text-muted-foreground" };
}

interface UpcomingReleasesProps {
  projects: Project[];
  getMixPercent: (id: string) => number;
  hidden?: boolean;
}

export default function UpcomingReleases({ projects, getMixPercent, hidden }: UpcomingReleasesProps) {
  const navigate = useNavigate();

  const upcomingReleases = projects
    .filter((p) => !p.completed && (p.stage === "upload" || p.stage === "master" || p.stage === "lancado"))
    .sort((a, b) => {
      if (!a.uploadDate && !b.uploadDate) return 0;
      if (!a.uploadDate) return 1;
      if (!b.uploadDate) return -1;
      return a.uploadDate.localeCompare(b.uploadDate);
    });

  return (
    <Card role="region" aria-labelledby="region-releases-title" className={cn("glass-card animate-fade-in", hidden && "hidden")} style={{ animationDelay: "200ms" }}>
      <CardHeader className="pb-3">
        <CardTitle id="region-releases-title" className="text-base flex items-center gap-2">
          <Rocket aria-hidden="true" className="h-4 w-4 text-primary" />
          Próximos Lançamentos
          {upcomingReleases.length > 0 && (
            <StatusBadge variant="neutral" aria-label={`${upcomingReleases.length} lançamento${upcomingReleases.length > 1 ? "s" : ""}`}>
              {upcomingReleases.length}
            </StatusBadge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-xs text-muted-foreground hover:text-primary h-7 px-2"
            onClick={() => navigate("/projects")}
            aria-label="Ver todos os projetos"
          >
            Ver projetos <ArrowRight aria-hidden="true" className="h-3 w-3 ml-1" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingReleases.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum projeto chegou ao estágio de master ou lançamento ainda.
            </p>
            <Button size="sm" variant="outline" onClick={() => navigate("/projects")} aria-label="Criar novo projeto">
              <Plus aria-hidden="true" className="h-3.5 w-3.5 mr-1" /> Criar projeto
            </Button>
          </div>
        ) : (
          <ul role="list" className="space-y-3 m-0 p-0 list-none">
            {upcomingReleases.map((p) => {
              const mixPct = getMixPercent(p.id);
              const stageLabel = p.stage === "lancado" ? "Lançado" : p.stage === "upload" ? "Pronto p/ Lançar" : "Em Master";
              const stageBadgeVariant = (p.stage === "upload" || p.stage === "lancado") ? "default" : "secondary";
              const typeLabel = p.projectType === "single" ? "Single" : p.projectType === "ep" ? "EP" : p.projectType === "album" ? "Álbum" : (p.projectType ? String(p.projectType).toUpperCase() : "—");
              const relDate = p.uploadDate ? formatDueDate(p.uploadDate) : null;
              const aria = `Abrir ${p.name}${p.artist ? ` de ${p.artist}` : ""}, ${typeLabel}, estágio ${stageLabel}, ${mixPct}% de mix${relDate ? `, ${relDate.label}` : ""}`;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-label={aria}
                    onClick={() => navigate(`/projects?id=${p.id}`)}
                    className="w-full text-left gradient-border flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-lg p-3 hover:-translate-y-0.5 transition-all duration-200 bg-card/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div className="flex items-center justify-between sm:contents">
                      <div className="min-w-0 sm:w-40 sm:shrink-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.artist || "—"}</p>
                      </div>
                      <Badge variant={stageBadgeVariant} className="text-[10px] shrink-0 whitespace-nowrap sm:hidden">
                        {stageLabel}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{typeLabel}</span>
                        <span className="text-[10px] font-mono-nums text-muted-foreground">{mixPct}%</span>
                      </div>
                      <div
                        role="progressbar"
                        aria-valuenow={mixPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Progresso do mix de ${p.name}`}
                        className="h-1.5 rounded-full bg-secondary overflow-hidden"
                      >
                        <div
                          className="h-full rounded-full neon-progress-bar transition-all duration-700"
                          style={{ width: `${mixPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 shrink-0 w-28 justify-end">
                      <Calendar aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {relDate ? (
                        <span className={cn("text-xs font-mono-nums", relDate.color)}>{relDate.label}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem data</span>
                      )}
                    </div>
                    <Badge variant={stageBadgeVariant} className="text-[10px] shrink-0 whitespace-nowrap hidden sm:inline-flex">
                      {stageLabel}
                    </Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
