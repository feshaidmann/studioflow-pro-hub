import { useState } from "react";
import {
  ExternalLink,
  MapPin,
  Calendar,
  DollarSign,
  ClipboardList,
  Loader2,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Search,
  MoreHorizontal,
  Bookmark,
  Trash2,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Opportunity } from "./types";
import { buildGoogleFallbackUrl } from "./linkHelpers";
import { trackAppEvent } from "@/lib/analytics";

function formatDate(d: string | null) {
  if (!d) return null;
  try {
    const date = new Date(d + "T12:00:00-03:00");
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  } catch {
    return d;
  }
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  try {
    const d = new Date(iso + "T12:00:00-03:00");
    return Math.round((d.getTime() - Date.now()) / 86400000);
  } catch {
    return null;
  }
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

export default function OpportunityCard({
  opportunity: op,
  onApply,
  onSave,
  onRemove,
  onClick,
  alreadyApplied,
  pending,
  recommended,
}: Props) {
  const isEdital = op.tipo === "edital";
  const prazoFmt = formatDate(op.prazo);
  const dLeft = daysUntil(op.prazo);
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

  // Single status pill: deadline-aware
  const statusPill = (() => {
    if (op.status === "Encerrado") {
      return { label: "Encerrado", cn: "bg-muted text-muted-foreground border-border" };
    }
    if (dLeft !== null && dLeft >= 0 && dLeft <= 7) {
      return {
        label: dLeft === 0 ? "Vence hoje" : `Faltam ${dLeft}d`,
        cn: "bg-warning/15 text-warning-foreground border-warning/40",
      };
    }
    if (op.status === "Aberto") {
      return { label: "Aberto", cn: "bg-success/15 text-success border-success/30" };
    }
    if (op.status === "Previsto") {
      return { label: "Previsto", cn: "bg-primary/10 text-primary border-primary/25" };
    }
    return { label: op.status, cn: "bg-muted text-muted-foreground border-border" };
  })();

  return (
    <div
      className={cn(
        "group rounded-[0.875rem] border border-border bg-card/60 backdrop-blur-sm p-3.5 hover:bg-card transition-colors",
        onClick && "cursor-pointer",
      )}
      onClick={() => onClick?.(op)}
    >
      {/* Header: status + recomendado + link-broken */}
      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        <Badge variant="outline" className={cn("text-[11px]", statusPill.cn)}>
          {statusPill.label}
        </Badge>
        {recommended && (
          <Badge
            variant="outline"
            className="text-[10px] bg-accent/10 text-accent-foreground border-accent/30"
          >
            <Sparkles className="h-2.5 w-2.5 mr-0.5" /> Pra você
          </Badge>
        )}
        {isBroken && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[10px] inline-flex items-center gap-1 text-muted-foreground border border-border rounded-full px-1.5 py-0.5">
                <Search className="h-2.5 w-2.5" /> link fora do ar
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Verificamos o link periodicamente — quando voltar, o botão de abrir aparece de novo.
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold leading-snug line-clamp-2">{op.titulo}</h3>
      {op.organizador && (
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
          {op.organizador}
        </p>
      )}

      {op.matchReason && (
        <p className="text-[11px] text-primary/90 mt-1.5 line-clamp-2 inline-flex items-start gap-1">
          <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{op.matchReason}</span>
        </p>
      )}

      {/* Meta line */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-2">
        {op.estado && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {op.estado}
          </span>
        )}
        {prazoFmt && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {prazoFmt}
          </span>
        )}
        {op.valor && (
          <span className="inline-flex items-center gap-1 text-success font-medium">
            <DollarSign className="h-3 w-3" />
            {op.valor}
          </span>
        )}
      </div>

      {/* Footer: primary CTA + overflow */}
      <div
        className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/60"
        onClick={(e) => e.stopPropagation()}
      >
        {op.origem === "ai" && (
          <div className="flex items-center gap-0.5 text-muted-foreground mr-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn("h-7 w-7", feedback === "up" && "text-success")}
                  onClick={() => sendFeedback("up")}
                  disabled={!!feedback}
                  aria-label="Útil"
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
                  aria-label="Não é o que procuro"
                >
                  <ThumbsDown className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Não é o que procuro</TooltipContent>
            </Tooltip>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {/* Primary CTA */}
          {onApply ? (
            alreadyApplied ? (
              <Button size="sm" variant="outline" className="h-7 text-xs px-2" disabled>
                <ClipboardList className="h-3 w-3 mr-1" /> No pipeline
              </Button>
            ) : (
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs px-2.5"
                disabled={pending}
                onClick={() => onApply(op)}
              >
                {pending ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <ClipboardList className="h-3 w-3 mr-1" />
                )}
                {isEdital ? "Candidatar" : "Tenho interesse"}
              </Button>
            )
          ) : null}

          {/* Overflow menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Mais ações">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onClick && (
                <DropdownMenuItem onClick={() => onClick(op)}>
                  <Eye className="h-3.5 w-3.5 mr-2" /> Ver detalhes
                </DropdownMenuItem>
              )}
              {isBroken ? (
                <DropdownMenuItem asChild>
                  <a href={buildGoogleFallbackUrl(op)} target="_blank" rel="noopener noreferrer">
                    <Search className="h-3.5 w-3.5 mr-2" /> Buscar no Google
                  </a>
                </DropdownMenuItem>
              ) : op.link ? (
                <DropdownMenuItem asChild>
                  <a href={op.link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-2" /> Abrir portal
                  </a>
                </DropdownMenuItem>
              ) : null}
              {onSave && op.origem === "ai" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onSave(op)}>
                    <Bookmark className="h-3.5 w-3.5 mr-2" /> Salvar para depois
                  </DropdownMenuItem>
                </>
              )}
              {onRemove && op.origem === "saved" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onRemove(op)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Remover
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
