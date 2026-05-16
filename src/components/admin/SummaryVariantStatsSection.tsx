import { useEffect, useState } from "react";
import { FlaskConical, RefreshCw, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface VariantRow {
  summary_variant: string;
  sample_size: number;
  thumbs_up_rate: number;
  thumbs_down_rate: number;
  saved_rate: number;
  copied_rate: number;
  task_created_rate: number;
  composite_score: number;
}

const VARIANT_LABEL: Record<string, string> = {
  A: "Variante A — Sonoridade",
  B: "Variante B — Storytelling",
};

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

export function SummaryVariantStatsSection() {
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc(
      "get_summary_variant_stats" as never,
    );
    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setRows((data as VariantRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const a = rows.find((r) => r.summary_variant === "A");
  const b = rows.find((r) => r.summary_variant === "B");

  // Vencedor: sample ≥ 30 em ambos e diferença ≥ 5%
  let winner: "A" | "B" | null = null;
  if (a && b && a.sample_size >= 30 && b.sample_size >= 30) {
    const diff = (b.composite_score ?? 0) - (a.composite_score ?? 0);
    if (Math.abs(diff) >= 0.05) winner = diff > 0 ? "B" : "A";
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

      {error && (
        <p className="text-xs text-destructive mb-3">Erro: {error}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {(["A", "B"] as const).map((key) => {
          const row = key === "A" ? a : b;
          const isWinner = winner === key;
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
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold">
                        {row.composite_score?.toFixed(2) ?? "—"}
                      </p>
                      <span className="text-[11px] text-muted-foreground">
                        score composto
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs">
                      <span className="text-muted-foreground">Amostra</span>
                      <span className="text-right font-mono">{row.sample_size}</span>
                      <span className="text-muted-foreground">👍 útil</span>
                      <span className="text-right font-mono">{pct(row.thumbs_up_rate)}</span>
                      <span className="text-muted-foreground">👎 não útil</span>
                      <span className="text-right font-mono">{pct(row.thumbs_down_rate)}</span>
                      <span className="text-muted-foreground">Salvos</span>
                      <span className="text-right font-mono">{pct(row.saved_rate)}</span>
                      <span className="text-muted-foreground">Copiados</span>
                      <span className="text-right font-mono">{pct(row.copied_rate)}</span>
                      <span className="text-muted-foreground">→ Tarefa</span>
                      <span className="text-right font-mono">{pct(row.task_created_rate)}</span>
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

      {a && b && (a.sample_size < 30 || b.sample_size < 30) && (
        <p className="text-[11px] text-muted-foreground">
          Amostra insuficiente para declarar vencedora (mínimo 30 por variante).
        </p>
      )}
    </section>
  );
}
