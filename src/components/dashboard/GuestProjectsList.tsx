import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Music2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DataSkeleton } from "@/components/ui/data-skeleton";
import { StatusBadge } from "./StatusBadge";

interface GuestProject {
  id: string;
  name: string;
  artist: string;
  stage: string;
  completed: boolean;
  project_type: string;
  role: string;
}

const STAGE_LABEL: Record<string, string> = {
  rough: "Rascunho", inicio: "Iniciado", gravacao: "Gravação", mix: "Mix", master: "Master", upload: "Pronto", lancado: "Lançado",
};

interface GuestProjectsListProps {
  projects: GuestProject[];
  loading?: boolean;
}

export default function GuestProjectsList({ projects, loading }: GuestProjectsListProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card
        role="region"
        aria-labelledby="region-guest-projects-title"
        aria-busy="true"
        className="glass-card animate-fade-in"
        style={{ animationDelay: "80ms" }}
      >
        <CardHeader className="pb-2">
          <CardTitle id="region-guest-projects-title" className="text-base flex items-center gap-2">
            <Users aria-hidden="true" className="h-4 w-4 text-primary" />
            Projetos como Parceiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div role="status" aria-live="polite" aria-label="Carregando projetos como parceiro">
            <DataSkeleton lines={2} />
            <span className="sr-only">Carregando…</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const active = projects.filter((p) => !p.completed);

  if (active.length === 0) return null;

  return (
    <Card role="region" aria-labelledby="region-guest-projects-title" className="glass-card animate-fade-in" style={{ animationDelay: "80ms" }}>
      <CardHeader className="pb-2">
        <CardTitle id="region-guest-projects-title" className="text-base flex items-center gap-2">
          <Users aria-hidden="true" className="h-4 w-4 text-primary" />
          Projetos como Parceiro
          <StatusBadge variant="neutral" aria-label={`${active.length} projeto${active.length > 1 ? "s" : ""} como parceiro`}>{active.length}</StatusBadge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <ul role="list" className="space-y-1.5 m-0 p-0 list-none">
          {active.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full text-left flex items-center gap-3 rounded-lg px-3 py-2.5 border border-border/40 bg-card/60 hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Abrir projeto ${p.name}${p.artist ? ` de ${p.artist}` : ""}, estágio ${STAGE_LABEL[p.stage] ?? p.stage}, papel ${p.role || "Colaborador"}`}
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                <Music2 aria-hidden="true" className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.artist || "—"}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="secondary" className="text-[10px]">
                    {STAGE_LABEL[p.stage] ?? p.stage}
                  </Badge>
                  <Badge className="text-[9px] bg-primary/10 text-primary border border-primary/30">
                    {p.role || "Colaborador"}
                  </Badge>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
