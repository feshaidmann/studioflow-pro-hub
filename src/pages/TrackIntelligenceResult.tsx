import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Loader2, AlertCircle, Info, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTrackIntelligence, type TIASeverity } from "@/hooks/useTrackIntelligence";

const SEVERITY_STYLES: Record<TIASeverity, { dot: string; label: string; border: string }> = {
  critical: { dot: "🔴", label: "Crítico", border: "border-destructive/30" },
  warning:  { dot: "🟡", label: "Atenção", border: "border-warning/30" },
  ok:       { dot: "🟢", label: "OK",      border: "border-[hsl(var(--success)/0.3)]" },
};

const scoreColor = (s: number) => {
  if (s >= 85) return "text-[hsl(var(--success))]";
  if (s >= 65) return "text-warning";
  if (s >= 40) return "text-destructive";
  return "text-destructive";
};

const scoreRing = (s: number) => {
  if (s >= 85) return "stroke-[hsl(var(--success))]";
  if (s >= 65) return "stroke-warning";
  return "stroke-destructive";
};

function ScoreDial({ score }: { score: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative w-44 h-44">
      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
        <circle cx="80" cy="80" r={r} className="stroke-muted/30 fill-none" strokeWidth="10" />
        <circle
          cx="80" cy="80" r={r} fill="none" strokeWidth="10" strokeLinecap="round"
          className={scoreRing(score)}
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-5xl font-light tabular-nums ${scoreColor(score)}`}>{score}</span>
        <span className="text-[10px] text-muted-foreground tracking-wider mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

const DIM_LABELS: Record<string, { label: string; weight: string }> = {
  technical:    { label: "TÉCNICA",    weight: "35%" },
  completeness: { label: "COMPLETUDE", weight: "25%" },
  strategy:     { label: "ESTRATÉGIA", weight: "25%" },
  market:       { label: "MERCADO",    weight: "15%" },
};

export default function TrackIntelligenceResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { item, loading } = useTrackIntelligence(id);

  if (loading) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-20 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-sm text-muted-foreground">Análise não encontrada.</p>
        <Button variant="link" onClick={() => navigate("/track-intelligence")}>Voltar ao histórico</Button>
      </div>
    );
  }

  if (item.status === "error" || !item.diagnosis) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-12">
        <Card className="p-8 text-center space-y-3 border-destructive/30">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <h2 className="text-base font-medium">Diagnóstico indisponível</h2>
          <p className="text-sm text-muted-foreground">{item.error_message || "Não foi possível gerar este diagnóstico. Tente novamente."}</p>
          <Button onClick={() => navigate("/track-intelligence/new")}>Nova análise</Button>
        </Card>
      </div>
    );
  }

  const d = item.diagnosis;
  const counts = {
    critical: d.gaps.filter(g => g.severity === "critical").length,
    warning:  d.gaps.filter(g => g.severity === "warning").length,
    ok:       d.gaps.filter(g => g.severity === "ok").length,
  };

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6 space-y-5">
      <button onClick={() => navigate("/track-intelligence")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3 w-3" /> Voltar ao histórico
      </button>

      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">"{item.track_title}" — Diagnóstico de prontidão</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(item.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })} · {item.genre} · {item.target_platforms.join(", ")}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate("/track-intelligence/new")} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Nova análise
        </Button>
      </header>

      {/* Score + Breakdown */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-stretch">
          <div className="flex flex-col items-center gap-2 shrink-0">
            <ScoreDial score={d.consolidated_score} />
            <Badge variant="outline" className="text-xs">{d.score_label}</Badge>
          </div>
          <div className="flex-1 w-full space-y-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Breakdown por dimensão</p>
            {Object.entries(d.dimensions).map(([k, v]) => {
              const meta = DIM_LABELS[k];
              return (
                <div key={k} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{meta?.label} <span className="text-muted-foreground font-normal">({meta?.weight})</span></span>
                    <span className={`tabular-nums font-medium ${scoreColor(v.score)}`}>{v.score}</span>
                  </div>
                  <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                    <div className={`h-full ${scoreRing(v.score).replace("stroke-", "bg-")}`} style={{ width: `${v.score}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{v.justification}</p>
                </div>
              );
            })}
          </div>
        </div>
        {d.summary && (
          <p className="mt-5 pt-4 border-t border-border/50 text-sm text-muted-foreground italic">{d.summary}</p>
        )}
      </Card>

      {/* Gaps */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Gaps identificados</h2>
          <p className="text-[11px] text-muted-foreground">
            {counts.critical} críticos · {counts.warning} atenção · {counts.ok} ok
          </p>
        </div>
        <div className="space-y-2">
          {d.gaps.map(g => {
            const s = SEVERITY_STYLES[g.severity];
            return (
              <div key={g.id} className={`p-3 rounded-lg border ${s.border} bg-muted/10`}>
                <div className="flex items-start gap-3">
                  <span className="text-base leading-none mt-0.5">{s.dot}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium">{g.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{g.description}</p>
                  </div>
                  {g.action_route && g.action_label && (
                    <Button size="sm" variant="outline" className="text-xs gap-1 shrink-0" onClick={() => navigate(g.action_route!)}>
                      {g.action_label} <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Recommendations */}
      <Card className="p-5 space-y-3">
        <h2 className="text-sm font-semibold">Recomendações prioritárias</h2>
        <div className="space-y-3">
          {d.recommendations.map(r => (
            <div key={r.priority} className="flex gap-3">
              <div className="shrink-0 h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                {r.priority}
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="text-sm font-medium">{r.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{r.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 text-[11px] text-muted-foreground">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <p>Análise baseada nos dados declarados do seu projeto. Para análise acústica real do arquivo de áudio, use o Master Analyzer.</p>
      </div>
    </div>
  );
}
