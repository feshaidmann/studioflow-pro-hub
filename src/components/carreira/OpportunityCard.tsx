import { ExternalLink, MapPin, Calendar, DollarSign, ClipboardList, Trophy, Mic2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TIPO_PALCO_LABELS, type TipoPalco } from "@/hooks/usePalcos";
import type { Opportunity } from "./types";

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
  if (status === "Aberto") return "bg-green-500/20 text-green-900 border-green-500/40";
  if (status === "Encerrado") return "bg-red-500/15 text-red-900 border-red-500/30";
  if (status === "Previsto") return "bg-blue-500/15 text-blue-900 border-blue-500/30";
  return "bg-muted text-muted-foreground border-border";
}

interface Props {
  opportunity: Opportunity;
  onApply?: (op: Opportunity) => void;
  onSave?: (op: Opportunity) => void;
  onRemove?: (op: Opportunity) => void;
  onClick?: (op: Opportunity) => void;
}

export default function OpportunityCard({ opportunity: op, onApply, onSave, onRemove, onClick }: Props) {
  const isEdital = op.tipo === "edital";
  const TypeIcon = isEdital ? Trophy : Mic2;
  const typeLabel = isEdital
    ? "Edital"
    : (op.porteOuTipo ? TIPO_PALCO_LABELS[op.porteOuTipo as TipoPalco] || "Palco" : "Palco");
  const prazoFmt = formatDate(op.prazo);

  return (
    <div
      className={cn(
        "group rounded-[0.875rem] border border-border bg-card/60 backdrop-blur-sm p-4 hover:bg-card transition-colors",
        onClick && "cursor-pointer"
      )}
      onClick={() => onClick?.(op)}
    >
      {/* Header: badge tipo + status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant="outline"
            className={cn(
              "text-[11px] gap-1 font-medium",
              isEdital
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-amber-500/10 text-amber-900 border-amber-500/40"
            )}
          >
            <TypeIcon className="h-3 w-3" />
            {typeLabel}
          </Badge>
          <Badge variant="outline" className={cn("text-[11px]", statusColor(op.status))}>
            {op.status}
          </Badge>
          {op.area && isEdital && (
            <Badge variant="secondary" className="text-[11px]">{op.area}</Badge>
          )}
        </div>
      </div>

      <h3 className="text-sm font-semibold leading-snug mb-1 line-clamp-2">{op.titulo}</h3>
      {op.organizador && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{op.organizador}</p>
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
          <span className="inline-flex items-center gap-1 text-green-700 font-medium">
            <DollarSign className="h-3 w-3" />{op.valor}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border/60" onClick={(e) => e.stopPropagation()}>
        {op.link && (
          <Button size="sm" variant="ghost" className="h-7 text-xs px-2" asChild>
            <a href={op.link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 mr-1" /> Abrir
            </a>
          </Button>
        )}
        {onApply && isEdital && op.editalId && (
          <Button size="sm" variant="default" className="h-7 text-xs px-2 ml-auto" onClick={() => onApply(op)}>
            <ClipboardList className="h-3 w-3 mr-1" /> Candidatar
          </Button>
        )}
        {onSave && op.origem === "ai" && (
          <Button size="sm" variant="outline" className="h-7 text-xs px-2 ml-auto" onClick={() => onSave(op)}>
            Salvar
          </Button>
        )}
        {onRemove && op.origem === "saved" && (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive ml-auto" onClick={() => onRemove(op)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
