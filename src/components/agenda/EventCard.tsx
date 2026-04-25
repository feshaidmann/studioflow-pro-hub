import { format, parseISO, isToday, isTomorrow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, FolderKanban, Pencil, Trash2, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getEventType, getEventStatus } from "@/lib/eventTypes";
import type { CalendarEvent } from "@/hooks/useEvents";

interface EventCardProps {
  event: CalendarEvent;
  projectName?: string;
  onEdit: () => void;
  onDelete: () => void;
  onCreateTransaction?: () => void;
}

function formatEventDate(iso: string, allDay: boolean) {
  try {
    const d = parseISO(iso);
    const dateStr = isToday(d) ? "Hoje" : isTomorrow(d) ? "Amanhã" : format(d, "dd/MM/yyyy", { locale: ptBR });
    if (allDay) return dateStr;
    return `${dateStr} • ${format(d, "HH'h'mm", { locale: ptBR })}`;
  } catch {
    return iso;
  }
}

export default function EventCard({ event, projectName, onEdit, onDelete, onCreateTransaction }: EventCardProps) {
  const navigate = useNavigate();
  const typeConfig = getEventType(event.eventType);
  const statusConfig = getEventStatus(event.status);
  const TypeIcon = typeConfig.icon;
  const isPastEvent = isPast(parseISO(event.startDatetime)) && !isToday(parseISO(event.startDatetime));

  return (
    <div
      className={cn(
        "glass-card gradient-border rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5",
        isPastEvent && event.status !== "cancelled" && "opacity-60",
        event.status === "cancelled" && "opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: icon + content */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={cn("mt-0.5 shrink-0 p-2 rounded-lg bg-card/60", typeConfig.colorClass)}>
            <TypeIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            {/* Type + Status badges */}
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", typeConfig.badgeClass)}>
                <TypeIcon className="h-2.5 w-2.5" />
                {typeConfig.label}
              </span>
              <Badge className={cn("text-[10px] px-2 py-0.5 rounded-full border-0", statusConfig.badgeClass)}>
                {statusConfig.label}
              </Badge>
            </div>

            {/* Title */}
            <p className="font-semibold text-sm leading-tight truncate">{event.title}</p>

            {/* Date */}
            <p className="text-xs text-muted-foreground font-mono-nums">
              📅 {formatEventDate(event.startDatetime, event.allDay)}
              {event.endDatetime && !event.allDay && (
                <span> – {format(parseISO(event.endDatetime), "HH'h'mm", { locale: ptBR })}</span>
              )}
            </p>

            {/* Location */}
            {event.location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{event.location}</span>
              </p>
            )}

            {/* Project */}
            {projectName && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FolderKanban className="h-3 w-3 shrink-0" />
                <span className="truncate">{projectName}</span>
              </p>
            )}

            {/* Description excerpt */}
            {event.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{event.description}</p>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          {event.eventType === "show" && onCreateTransaction && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-success hover:text-success gap-1 px-2" onClick={onCreateTransaction}>
              <DollarSign className="h-3 w-3" /> Criar receita
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
