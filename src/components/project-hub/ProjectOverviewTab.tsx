import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const STAGE_STEPS = ["inicio", "gravacao", "mix", "master", "upload", "lancado"] as const;
const STAGE_LABEL: Record<string, string> = {
  inicio: "Projeto Iniciado", gravacao: "Gravação", mix: "Mix", master: "Master", upload: "Upload", lancado: "Lançado", rough: "Rascunho",
};
const TYPE_LABEL: Record<string, string> = {
  single: "Single", ep: "EP", album: "Álbum", beat: "Beat / Base", trilha_guia: "Trilha Guia", feat: "Feat",
};

interface ProjectOverviewTabProps {
  project: { id: string; name: string; artist: string; stage: string; completed: boolean; projectType: string };
  progress: number;
}

export default function ProjectOverviewTab({ project, progress }: ProjectOverviewTabProps) {
  const currentStageIdx = STAGE_STEPS.indexOf(project.stage as any);

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card/50">
        <CardContent className="pt-5 pb-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{STAGE_LABEL[project.stage] ?? project.stage}</span>
            <span className="font-mono text-primary font-bold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between pt-1">
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

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Tipo</p>
          <p className="text-sm font-medium mt-0.5">{TYPE_LABEL[project.projectType] ?? project.projectType}</p>
        </div>
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
      </div>
    </div>
  );
}
