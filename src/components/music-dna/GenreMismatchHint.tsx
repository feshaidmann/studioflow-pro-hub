import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { normalizeGenreName, sameFamily } from "@/lib/genreFamilies";

interface ClassifierHint {
  detected: string;
  score: number;
  runnerUp: { genre: string; score: number } | null;
  top3: Array<{ genre: string; score: number }>;
}

interface Props {
  hint: ClassifierHint;
  declared: string | null | undefined;
}

// Limiares calibrados após feedback inicial:
// - score >= 0.92: cosseno em vetores 0-1 de 8 dims tende a ser alto;
//   só sinalizamos quando a afinidade técnica é muito forte.
// - gap >= 0.05 entre top1 e top2: evita ruído estatístico.
// - Pares dentro da mesma família musical não disparam alerta.
// - Se o runner-up está na mesma família do declarado, consideramos o
//   declarado "próximo o bastante" e suprimimos o alerta.
const SCORE_THRESHOLD = 0.92;
const GAP_THRESHOLD = 0.05;

/**
 * Mostra um aviso amigável quando o classificador interno (cosine sim sobre features)
 * diverge significativamente do gênero declarado pelo usuário ou classificado pela IA.
 */
export function GenreMismatchHint({ hint, declared }: Props) {
  if (!hint?.detected || !declared) return null;

  // Match exato após normalização (sufixos regionais, acentos, case)
  if (normalizeGenreName(hint.detected) === normalizeGenreName(declared)) return null;

  // Mesma família musical → não alerta
  if (sameFamily(hint.detected, declared)) return null;

  const top1 = hint.score;
  const top2 = hint.runnerUp?.score ?? 0;
  if (top1 < SCORE_THRESHOLD || top1 - top2 < GAP_THRESHOLD) return null;

  // Se o runner-up pertence à família do declarado, declared está
  // suficientemente representado nas opções próximas → não alerta
  if (hint.runnerUp && sameFamily(hint.runnerUp.genre, declared)) return null;

  return (
    <Card className="border-l-4 border-l-amber-400 bg-amber-50/40 animate-fade-in">
      <CardContent className="p-4 flex gap-3 items-start">
        <Sparkles className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
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
        </div>
      </CardContent>
    </Card>
  );
}
