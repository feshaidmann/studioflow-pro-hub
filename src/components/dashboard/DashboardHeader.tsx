import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Project } from "@/data/mockData";
import { painLabels } from "@/lib/journeyPersonalization";

interface DashboardHeaderProps {
  displayName: string;
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  mainPain?: string;
}

export default function DashboardHeader({ displayName, projects, selectedProjectId, onSelectProject, mainPain }: DashboardHeaderProps) {
  const navigate = useNavigate();
  const focus = mainPain ? painLabels[mainPain] : null;

  return (
    <div className="rounded-xl bg-card/40 backdrop-blur-md p-4 -mx-4 md:-mx-6 md:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Olá, {displayName} 👋{focus ? ` Seu foco hoje é ${focus}.` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={selectedProjectId} onValueChange={onSelectProject}>
          <SelectTrigger className="w-full sm:w-[180px] bg-card/60">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Filtrar projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os projetos</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => navigate("/projects")} className="active:scale-95 transition-transform w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1" /> <span>Novo Projeto</span>
        </Button>
      </div>
    </div>
  );
}
