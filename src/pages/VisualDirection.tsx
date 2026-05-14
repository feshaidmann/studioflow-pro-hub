import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Palette } from "lucide-react";
import { useProjects } from "@/contexts/ProjectContext";

export default function VisualDirection() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects } = useProjects();
  const project = projects.find((p) => p.id === id);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
        <Palette className="h-12 w-12 text-muted-foreground/30" aria-hidden="true" />
        <p className="text-muted-foreground">Projeto não encontrado.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/projects")}>
          <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" /> Voltar para projetos
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="mt-0.5 shrink-0 h-8 w-8" onClick={() => navigate(`/projects/${id}`)} aria-label="Voltar">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" aria-hidden="true" />
            Direção Visual
          </h1>
          <p className="text-sm text-muted-foreground">
            {project.artist} · {project.name}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-6 space-y-3">
        <h2 className="text-base font-semibold">Briefing visual em construção</h2>
        <p className="text-sm text-muted-foreground">
          O fluxo de 4 etapas (perfil artístico → geração de referências → revisão → briefing PDF) será habilitado em breve.
          A infraestrutura (banco, geração por IA, exportação de PDF) já está pronta — apenas a interface guiada será conectada.
        </p>
        <p className="text-xs text-muted-foreground">
          As referências geradas pela IA serão sempre rotuladas como <strong>"Referência de estilo"</strong> e nunca como arte final.
          O briefing é destinado a ser entregue a um designer profissional.
        </p>
      </div>
    </div>
  );
}
