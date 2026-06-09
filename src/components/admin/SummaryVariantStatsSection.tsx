import { useEffect, useState } from "react";
import { FlaskConical, RefreshCw, Trophy, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface VariantRow {
  summary_variant: string;
  impressions: number | null;
  sample_size: number;
  thumbs_up_rate: number | null;
  thumbs_down_rate: number | null;
  saved_rate: number | null;
  copied_rate: number | null;
  task_created_rate: number | null;
  composite_score: number | null;
}

const VARIANT_LABEL: Record<string, string> = {
  A: "Variante A — Sonoridade",
  B: "Variante B — Storytelling",
};

// Critério de parada do experimento: mínimo de impressões por variante e
// diferença mínima na métrica-norte (task_created_rate) para chamar de vencedora.
const MIN_IMPRESSIONS_PER_VARIANT = 100;
const MIN_DELTA_TASK_RATE = 0.10; // 10 pontos percentuais

function pct(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(1)}%`;
}

export function SummaryVariantStatsSection() {
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("get_summary_variant_stats");
    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setRows((data as VariantRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const a = rows.find((r) => r.summary_variant === "A");
  const b = rows.find((r) => r.summary_variant === "B");

  const aImp = a?.impressions ?? 0;
  const bImp = b?.impressions ?? 0;
  const minImp = Math.min(aImp, bImp);
  const enoughSample = aImp >= MIN_IMPRESSIONS_PER_VARIANT && bImp >= MIN_IMPRESSIONS_PER_VARIANT;

  // Vencedor pela métrica-norte (task_created_rate), só quando amostra é suficiente
  let winner: "A" | "B" | null = null;
  if (enoughSample && a && b) {
    const aTask = a.task_created_rate ?? 0;
    const bTask = b.task_created_rate ?? 0;
    if (Math.abs(aTask - bTask) >= MIN_DELTA_TASK_RATE) {
      winner = aTask > bTask ? "A" : "B";
    }
  }

  return (
    <section className="pb-8">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            A/B Resumo DNA
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Métrica-norte e status do experimento */}
      <Card className="mb-3 border-dashed">
        <CardContent className="p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">
              Métrica-norte: <span className="font-medium text-foreground">virou tarefa (task_created_rate)</span> sobre impressões reais.
            </span>
          </div>
          <div className="font-mono text-[11px] text-muted-foreground">
            {enoughSample ? (
              winner ? (
                <span className="text-primary">Experimento concluído · vencedora {winner}</span>
              ) : (
                <span>Amostra suficiente · diferença &lt; {(MIN_DELTA_TASK_RATE * 100).toFixed(0)}pp (inconclusivo)</span>
              )
            ) : (
              <span>
                Em andamento · faltam {Math.max(0, MIN_IMPRESSIONS_PER_VARIANT - minImp)} impressões na variante mais lenta
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="text-xs text-destructive mb-3">Erro: {error}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
        {(["A", "B"] as const).map((key) => {
          const row = key === "A" ? a : b;
          const isWinner = winner === key;
          const imp = row?.impressions ?? 0;
          return (
            <Card
              key={key}
              className={isWinner ? "border-primary/60 bg-primary/5" : "border-border"}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {key}
                    </Badge>
                    <p className="text-sm font-medium">{VARIANT_LABEL[key]}</p>
                  </div>
                  {isWinner && (
                    <Badge className="gap-1 text-[10px]">
                      <Trophy className="h-3 w-3" /> Vencedora
                    </Badge>
                  )}
                </div>
                {row ? (
                  <>
                    {/* KPI principal */}
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold tabular-nums">
                        {pct(row.task_created_rate)}
                      </p>
                      <span className="text-[11px] text-muted-foreground">
                        viraram tarefa
                      </span>
                    </div>
                    {/* Denominador e amostra */}
                    <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs">
                      <span className="text-muted-foreground">Impressões</span>
                      <span className="text-right font-mono">{imp}</span>
                      <span className="text-muted-foreground">Análises geradas</span>
                      <span className="text-right font-mono">{row.sample_size}</span>
                    </div>
                    {/* Taxas auxiliares */}
                    <div className="pt-2 border-t border-border/60 grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs">
                      <span className="text-muted-foreground">👍 útil</span>
                      <span className="text-right font-mono">{pct(row.thumbs_up_rate)}</span>
                      <span className="text-muted-foreground">👎 não útil</span>
                      <span className="text-right font-mono">{pct(row.thumbs_down_rate)}</span>
                      <span className="text-muted-foreground">Salvos</span>
                      <span className="text-right font-mono">{pct(row.saved_rate)}</span>
                      <span className="text-muted-foreground">Copiados</span>
                      <span className="text-right font-mono">{pct(row.copied_rate)}</span>
                      <span className="text-muted-foreground">Score composto</span>
                      <span className="text-right font-mono">
                        {row.composite_score?.toFixed(2) ?? "—"}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem dados ainda</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Todas as taxas usam o nº de <strong>impressões</strong> (resumo visto ≥1s) como
        denominador. A métrica-norte é "virou tarefa" — único sinal que mede valor
        entregue. Polegares e cópias são termômetros secundários. Texto livre dos 👎
        fica em <code className="text-[10px]">metadata.reason</code> para análise qualitativa.
      </p>
    </section>
  );
}
