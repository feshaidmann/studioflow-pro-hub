import { useNavigate } from "react-router-dom";
import { Plus, AudioWaveform, Trash2, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTrackIntelligenceList } from "@/hooks/useTrackIntelligence";

const scoreColor = (s: number | null) => {
  if (s === null) return "text-muted-foreground";
  if (s >= 85) return "text-[hsl(var(--success))]";
  if (s >= 65) return "text-warning";
  return "text-destructive";
};

export default function TrackIntelligence() {
  const navigate = useNavigate();
  const { items, loading, remove } = useTrackIntelligenceList();

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AudioWaveform className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Track Intelligence</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Diagnóstico de prontidão de release com score contextual gerado por IA, baseado nos metadados do projeto e nas suas respostas.
          </p>
        </div>
        <Button onClick={() => navigate("/track-intelligence/new")} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Nova análise
        </Button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center space-y-3 border-dashed">
          <AudioWaveform className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h2 className="text-base font-medium">Nenhuma análise ainda</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Gere o primeiro diagnóstico de prontidão para descobrir gaps técnicos, estratégicos e de mercado antes de lançar.
          </p>
          <Button onClick={() => navigate("/track-intelligence/new")} className="gap-2 mt-2">
            <Plus className="h-4 w-4" /> Criar primeira análise
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <Card
              key={it.id}
              className="p-4 hover:border-primary/40 transition-colors cursor-pointer group"
              onClick={() => navigate(`/track-intelligence/${it.id}`)}
            >
              <div className="flex items-center gap-4">
                <div className={`text-3xl font-light tabular-nums ${scoreColor(it.consolidated_score)} w-16 text-center`}>
                  {it.status === "pending" ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> :
                   it.status === "error" ? <AlertCircle className="h-6 w-6 text-destructive mx-auto" /> :
                   it.consolidated_score ?? "—"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-medium truncate">{it.track_title}</h3>
                    {it.score_label && <Badge variant="outline" className="text-[10px]">{it.score_label}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {it.genre} · {(it.target_platforms || []).join(", ")} ·{" "}
                    {new Date(it.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); remove(it.id); }}
                  className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
