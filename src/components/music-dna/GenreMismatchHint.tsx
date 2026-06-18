import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { normalizeGenreName, sameFamily, getFamilies, FAMILY_LABELS } from "@/lib/genreFamilies";
import { useGenreMismatchCalibration } from "@/hooks/useGenreMismatchCalibration";

interface ClassifierHint {
  detected: string;
  score: number;
  runnerUp: { genre: string; score: number } | null;
  top3: Array<{ genre: string; score: number }>;
}

interface Props {
  hint: ClassifierHint;
  declared: string | null | undefined;
  analysisId?: string | null;
}

/**
 * Mostra um aviso amigável quando o classificador interno (cosine sim sobre features)
 * diverge significativamente do gênero declarado pelo usuário ou classificado pela IA.
 *
 * Limiares de score/gap são calibrados por usuário e por gênero declarado, com base
 * no histórico de cliques em "Falso alerta" / "Alerta correto".
 */
export function GenreMismatchHint({ hint, declared, analysisId }: Props) {
  const { getThresholds, submitFeedback, submitting } = useGenreMismatchCalibration();
  const [dismissed, setDismissed] = useState(false);

  return null;

  if (dismissed) return null;
  if (!hint?.detected || !declared) return null;

  // Match exato após normalização (sufixos regionais, acentos, case)
  if (normalizeGenreName(hint.detected) === normalizeGenreName(declared)) return null;

  // Mesma família musical → não alerta
  if (sameFamily(hint.detected, declared)) return null;

  const top1 = hint.score;
  const top2 = hint.runnerUp?.score ?? 0;
  const gap = top1 - top2;

  const { scoreThreshold, gapThreshold } = getThresholds(declared);
  if (top1 < scoreThreshold || gap < gapThreshold) return null;

  // Se o runner-up pertence à família do declarado, declared está
  // suficientemente representado nas opções próximas → não alerta
  if (hint.runnerUp && sameFamily(hint.runnerUp.genre, declared)) return null;

  async function handleFeedback(verdict: "falso_alerta" | "correto") {
    setDismissed(true);
    try {
      await submitFeedback({
        declared: declared!,
        detected: hint.detected,
        score: top1,
        gap,
        verdict,
        analysisId: analysisId ?? null,
      });
      if (verdict === "falso_alerta") {
        toast.success(`Anotado — vou ser mais conservador para ${declared}.`);
      } else {
        toast.success("Anotado — alertas como esse vão continuar aparecendo.");
      }
    } catch (e) {
      console.error("[GenreMismatchHint] feedback error", e);
      toast.error("Não consegui registrar o feedback. Tente novamente.");
      setDismissed(false);
    }
  }

  return (
    <Card className="border-l-4 border-l-amber-400 bg-amber-50/40 animate-fade-in">
      <CardContent className="p-4 flex gap-3 items-start">
        <Sparkles className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="space-y-2 flex-1">
          <p className="text-[11px] font-mono uppercase tracking-widest text-amber-700">
            Sugestão do classificador
          </p>
          <p className="text-sm leading-relaxed text-foreground">
            Você (ou a IA) classificou a faixa como <strong>{declared}</strong>, mas as
            características técnicas se aproximam mais de <strong>{hint.detected}</strong>{" "}
            ({Math.round(top1 * 100)}% de similaridade).
            {hint.runnerUp && (
              <span className="text-muted-foreground">
                {" "}Outras proximidades: {hint.runnerUp.genre} ({Math.round(top2 * 100)}%).
              </span>
            )}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Sinal técnico apenas. Esses dois gêneros têm assinaturas acústicas distintas — vale conferir
            tags e referências antes de ajustar.
          </p>

          {(() => {
            const famDeclared = getFamilies(declared!);
            const famDetected = getFamilies(hint.detected);
            const fmtFam = (fs: string[]) =>
              fs.length === 0
                ? "fora das famílias mapeadas"
                : fs.map((f) => FAMILY_LABELS[f] ?? f).join(", ");
            const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
            return (
              <details className="group">
                <summary className="text-[11px] font-mono text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none">
                  Detalhes técnicos
                </summary>
                <div className="mt-2 space-y-0.5 text-[11px] font-mono text-muted-foreground leading-relaxed pl-2 border-l border-border/60">
                  <div>Família declarada: {fmtFam(famDeclared)}</div>
                  <div>Família detectada: {fmtFam(famDetected)}</div>
                  <div>
                    Top 1 ({hint.detected}): {pct(top1)} • Top 2
                    {hint.runnerUp ? ` (${hint.runnerUp.genre})` : ""}: {pct(top2)}
                  </div>
                  <div>Gap: {pct(gap)}</div>
                  <div>
                    Limiares: score ≥ {pct(scoreThreshold)}, gap ≥ {pct(gapThreshold)}
                  </div>
                </div>
              </details>
            );
          })()}

          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-muted-foreground mr-auto">Esse alerta faz sentido?</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-amber-700"
              disabled={submitting}
              onClick={() => handleFeedback("falso_alerta")}
            >
              <ThumbsDown className="h-3.5 w-3.5 mr-1" /> Falso alerta
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={submitting}
              onClick={() => handleFeedback("correto")}
            >
              <ThumbsUp className="h-3.5 w-3.5 mr-1" /> Alerta correto
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
