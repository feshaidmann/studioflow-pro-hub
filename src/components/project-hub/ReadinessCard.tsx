import { useNavigate } from "react-router-dom";
import { AudioWaveform, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLatestTrackIntelligence } from "@/hooks/useTrackIntelligence";

const scoreColor = (s: number | null) => {
  if (s === null) return "text-muted-foreground";
  if (s >= 85) return "text-success";
  if (s >= 65) return "text-warning";
  return "text-destructive";
};

export default function ReadinessCard({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const { latest, loading } = useLatestTrackIntelligence(projectId);

  if (loading) {
    return (
      <Card className="border-border bg-card/60 p-4 flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (!latest) {
    return (
      <Card className="border-border bg-card/60 p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <AudioWaveform className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="text-sm font-semibold">Diagnóstico de prontidão</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Gere um score 360º cruzando master, artwork, distribuição e estratégia.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 shrink-0"
            onClick={() => navigate(`/track-intelligence/new?project=${projectId}`)}
          >
            <Sparkles className="h-3.5 w-3.5" /> Verificar
          </Button>
        </div>
      </Card>
    );
  }

  const daysAgo = Math.floor((Date.now() - new Date(latest.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const isStale = daysAgo > 14;

  return (
    <Card className="border-border bg-card/60 p-4">
      <div className="flex items-center gap-3">
        <div className={`text-3xl font-light tabular-nums ${scoreColor(latest.consolidated_score)} w-14 text-center shrink-0`}>
          {latest.consolidated_score ?? "—"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">Prontidão de release</h3>
            {latest.score_label && (
              <Badge variant="outline" className="text-[10px]">{latest.score_label}</Badge>
            )}
            {isStale && (
              <Badge variant="outline" className="text-[10px] border-warning/30 text-warning">
                {daysAgo}d atrás
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerado {daysAgo === 0 ? "hoje" : `há ${daysAgo} dia${daysAgo > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
          <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => navigate(`/track-intelligence/${latest.id}`)}>
            Ver <ArrowRight className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate(`/track-intelligence/new?project=${projectId}`)}>
            Atualizar
          </Button>
        </div>
      </div>
    </Card>
  );
}
