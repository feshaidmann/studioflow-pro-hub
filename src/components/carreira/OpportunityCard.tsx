import { ExternalLink, MapPin, Calendar, DollarSign, ClipboardList, Trophy, Mic2, Trash2, Loader2, Sparkles, ThumbsUp, ThumbsDown, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TIPO_PALCO_LABELS, type TipoPalco } from "@/hooks/usePalcos";
import type { Opportunity } from "./types";
import { buildGoogleFallbackUrl } from "./linkHelpers";
import { trackAppEvent } from "@/lib/analytics";
import { useState } from "react";

function formatDate(d: string | null) {
  if (!d) return null;
  try {
    const date = new Date(d + "T12:00:00-03:00");
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit", month: "2-digit", year: "numeric",
    }).format(date);
  } catch { return d; }
}

function statusColor(status: string) {
  if (status === "Aberto") return "bg-success/15 text-success border-success/30";
  if (status === "Encerrado") return "bg-destructive/10 text-destructive border-destructive/25";
  if (status === "Previsto") return "bg-primary/10 text-primary border-primary/25";
  return "bg-muted text-muted-foreground border-border";
}

interface Props {
  opportunity: Opportunity;
  onApply?: (op: Opportunity) => void;
  onSave?: (op: Opportunity) => void;
  onRemove?: (op: Opportunity) => void;
  onClick?: (op: Opportunity) => void;
  alreadyApplied?: boolean;
  pending?: boolean;
  recommended?: boolean;
}

export default function OpportunityCard({ opportunity: op, onApply, onSave, onRemove, onClick, alreadyApplied, pending, recommended }: Props) {
  const isEdital = op.tipo === "edital";
  const TypeIcon = isEdital ? Trophy : Mic2;
  const typeLabel = isEdital
    ? "Edital"
    : (op.porteOuTipo ? TIPO_PALCO_LABELS[op.porteOuTipo as TipoPalco] || "Palco" : "Palco");
  const prazoFmt = formatDate(op.prazo);
  const isBroken = op.linkStatus === "broken";
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const sendFeedback = (verdict: "up" | "down") => {
    if (feedback) return;
    setFeedback(verdict);
    void trackAppEvent("carreira_ai_feedback", {
      verdict,
      opportunity_type: op.tipo,
      opportunity_key: op.key,
    });
  };

  return (
    <div
      className={cn(
        "group rounded-[0.875rem] border border-border bg-card/60 backdrop-blur-sm p-4 hover:bg-card transition-colors",
        onClick && "cursor-pointer"
      )}
      onClick={() => onClick?.(op)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant="outline"
            className={cn(
              "text-[11px] gap-1 font-medium",
              isEdital
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-warning/15 text-warning-foreground border-warning/40"
            )}
          >
            <TypeIcon className="h-3 w-3" />
            {typeLabel}
          </Badge>
          <Badge variant="outline" className={cn("text-[11px]", statusColor(op.status))}>
            {op.status}
          </Badge>
          {recommended && (
            <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent-foreground border-accent/30">
              Pra você
            </Badge>
          )}
          {isBroken && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] inline-flex items-center gap-1 text-muted-foreground border border-border rounded-full px-1.5 py-0.5">
                  <Search className="h-2.5 w-2.5" /> link oficial fora do ar
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Verificamos o link periodicamente — quando voltar, o botão de abrir aparece de novo.
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <h3 className="text-sm font-semibold leading-snug mb-1 line-clamp-2">{op.titulo}</h3>
      {op.organizador && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{op.organizador}</p>
      )}

      {op.matchReason && op.origem === "ai" && (
        <p className="text-xs text-primary/90 mb-2 line-clamp-2 inline-flex items-start gap-1">
          <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{op.matchReason}</span>
        </p>
      )}

      {op.resumo && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{op.resumo}</p>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground mb-3">
        {op.estado && (
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{op.estado}</span>
        )}
        {prazoFmt && (
          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />Prazo: {prazoFmt}</span>
        )}
        {op.valor && (
          <span className="inline-flex items-center gap-1 text-success font-medium">
            <DollarSign className="h-3 w-3" />{op.valor}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 pt-2 border-t border-border/60" onClick={(e) => e.stopPropagation()}>
        {isBroken ? (
          <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-muted-foreground" asChild>
            <a href={buildGoogleFallbackUrl(op)} target="_blank" rel="noopener noreferrer">
              <Search className="h-3 w-3 mr-1" /> Buscar no Google
            </a>
          </Button>
        ) : op.link ? (
          <Button size="sm" variant="ghost" className="h-7 text-xs px-2" asChild>
            <a href={op.link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" /> Abrir
            </a>
          </Button>
        ) : null}

        {op.origem === "ai" && (
          <div className="flex items-center gap-0.5 text-muted-foreground">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn("h-7 w-7", feedback === "up" && "text-success")}
                  onClick={() => sendFeedback("up")}
                  disabled={!!feedback}
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Útil para mim</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn("h-7 w-7", feedback === "down" && "text-destructive")}
                  onClick={() => sendFeedback("down")}
                  disabled={!!feedback}
                >
                  <ThumbsDown className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Não é o que procuro</TooltipContent>
            </Tooltip>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {onApply && (
            alreadyApplied ? (
              <Button size="sm" variant="outline" className="h-7 text-xs px-2" disabled>
                <ClipboardList className="h-3 w-3 mr-1" /> No pipeline
              </Button>
            ) : (
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs px-2"
                disabled={pending}
                onClick={() => onApply(op)}
              >
                {pending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <ClipboardList className="h-3 w-3 mr-1" />}
                {isEdital ? "Candidatar" : "Marcar interesse"}
              </Button>
            )
          )}
          {onSave && op.origem === "ai" && (
            <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => onSave(op)}>
              Salvar
            </Button>
          )}
          {onRemove && op.origem === "saved" && (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => onRemove(op)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
