import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, ChevronDown, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project } from "@/data/mockData";

export function CompletedProjectsSection({ projects }: { projects: Project[] }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const completed = projects.filter((p) => p.completed);
  if (completed.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Projetos concluídos ({completed.length})
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 mt-2">
        {completed.map((project) => (
          <Card
            key={project.id}
            className="glass-card opacity-60 hover:opacity-90 transition-opacity cursor-pointer"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <span className="font-medium text-sm">{project.name}</span>
                <p className="text-xs text-muted-foreground">{project.artist}</p>
              </div>
              <Trophy className="h-4 w-4 text-success" />
            </CardContent>
          </Card>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
