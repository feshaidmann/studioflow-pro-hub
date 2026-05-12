import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

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

/**
 * Mostra um aviso amigável quando o classificador interno (cosine sim sobre features)
 * diverge significativamente do gênero declarado pelo usuário ou classificado pela IA.
 * Limiar duplo: confiança >= 0.75 e gap >= 0.03 entre top1/top2.
 */
export function GenreMismatchHint({ hint, declared }: Props) {
  if (!hint?.detected || !declared) return null;

  const norm = (s: string) => s.trim().toLowerCase();
  if (norm(hint.detected) === norm(declared)) return null;

  const top1 = hint.score;
  const top2 = hint.runnerUp?.score ?? 0;
  if (top1 < 0.75 || top1 - top2 < 0.03) return null;

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
            É só um sinal técnico. Se o gênero declarado faz sentido artisticamente, mantenha — gêneros
            híbridos podem soar tecnicamente próximos de outros estilos.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
