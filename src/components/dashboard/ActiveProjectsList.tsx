import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic2, Music2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Project } from "@/data/mockData";

interface ActiveProjectsListProps {
  projects: Project[];
  hidden?: boolean;
}

export default function ActiveProjectsList({ projects, hidden }: ActiveProjectsListProps) {
  const navigate = useNavigate();
  const activeProjects = projects.filter((p) => !p.masterDone && !p.completed);

  return (
    <Card className={cn("glass-card animate-fade-in", hidden && "hidden")}>
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
  );
}
