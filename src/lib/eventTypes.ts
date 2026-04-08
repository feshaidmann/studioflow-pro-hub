import {
  Mic2, Guitar, Handshake, Sliders, Rocket, FileText,
  BarChart2, BookOpen, Plane, CalendarDays,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface EventTypeConfig {
  value: string;
  label: string;
  icon: LucideIcon;
  colorClass: string;       // Tailwind bg/text tokens
  badgeClass: string;       // badge bg
}

export const EVENT_TYPES: EventTypeConfig[] = [
  { value: "show",       label: "Show / Apresentação",  icon: Mic2,        colorClass: "text-primary",     badgeClass: "bg-primary/20 text-primary" },
  { value: "rehearsal",  label: "Ensaio",               icon: Guitar,      colorClass: "text-blue-400",    badgeClass: "bg-blue-500/20 text-blue-400" },
  { value: "meeting",    label: "Reunião",               icon: Handshake,   colorClass: "text-success",     badgeClass: "bg-success/20 text-success" },
  { value: "recording",  label: "Gravação / Estúdio",   icon: Sliders,     colorClass: "text-warning",     badgeClass: "bg-warning/20 text-warning" },
  { value: "release",    label: "Lançamento",            icon: Rocket,      colorClass: "text-yellow-400",  badgeClass: "bg-yellow-500/20 text-yellow-400" },
  { value: "delivery",   label: "Entrega de Material",  icon: FileText,    colorClass: "text-destructive",  badgeClass: "bg-destructive/20 text-destructive" },
  { value: "project_meeting", label: "Reunião de Projeto", icon: BarChart2, colorClass: "text-indigo-400",  badgeClass: "bg-indigo-500/20 text-indigo-400" },
  { value: "workshop",   label: "Workshop / Curso",      icon: BookOpen,    colorClass: "text-emerald-400", badgeClass: "bg-emerald-500/20 text-emerald-400" },
  { value: "travel",     label: "Viagem / Deslocamento", icon: Plane,       colorClass: "text-muted-foreground", badgeClass: "bg-secondary text-muted-foreground" },
  { value: "other",      label: "Outro",                 icon: CalendarDays,colorClass: "text-muted-foreground", badgeClass: "bg-secondary text-muted-foreground" },
];

export function getEventType(value: string): EventTypeConfig {
  return EVENT_TYPES.find((t) => t.value === value) ?? EVENT_TYPES[EVENT_TYPES.length - 1];
}

export const EVENT_STATUSES = [
  { value: "confirmed", label: "Confirmado", badgeClass: "bg-success/20 text-success" },
  { value: "pending",   label: "Pendente",   badgeClass: "bg-warning/20 text-warning" },
  { value: "cancelled", label: "Cancelado",  badgeClass: "bg-destructive/20 text-destructive" },
];

export function getEventStatus(value: string) {
  return EVENT_STATUSES.find((s) => s.value === value) ?? EVENT_STATUSES[0];
}
