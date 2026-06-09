import { useState, useEffect, useMemo } from "react";
import { format, addHours, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { EVENT_TYPES, EVENT_STATUSES } from "@/lib/eventTypes";
import type { CalendarEvent, NewEvent } from "@/hooks/useEvents";
import { DateTimePickerField } from "@/components/ui/date-time-picker-field";
import { AlertTriangle } from "lucide-react";

interface EventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editEvent?: CalendarEvent | null;
  onSave: (data: NewEvent) => Promise<void>;
  prefill?: Partial<NewEvent>;
  existingEvents?: CalendarEvent[];
}

/** Convert ISO → "yyyy-MM-dd'T'HH:mm" for internal state */
function toLocalInput(iso: string) {
  try { return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm"); } catch { return ""; }
}

/** Convert "yyyy-MM-dd'T'HH:mm" → ISO */
function fromLocalInput(val: string): string {
  if (!val) return "";
  return new Date(val).toISOString();
}

function defaultStart() {
  return format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm");
}

const EMPTY: NewEvent = {
  title: "", description: "", eventType: "show",
  startDatetime: fromLocalInput(defaultStart()),
  endDatetime: null, location: "", status: "confirmed",
  projectId: null, allDay: false,
};

export default function EventForm({ open, onOpenChange, editEvent, onSave, prefill, existingEvents = [] }: EventFormProps) {
  const { projects } = useProjects();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmConflict, setConfirmConflict] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("show");
  const [startInput, setStartInput] = useState(defaultStart());
  const [endInput, setEndInput] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("confirmed");
  const [projectId, setProjectId] = useState("");
  const [allDay, setAllDay] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    if (editEvent) {
      setTitle(editEvent.title);
      setDescription(editEvent.description);
      setEventType(editEvent.eventType);
      setStartInput(toLocalInput(editEvent.startDatetime));
      setEndInput(editEvent.endDatetime ? toLocalInput(editEvent.endDatetime) : "");
      setLocation(editEvent.location);
      setStatus(editEvent.status);
      setProjectId(editEvent.projectId ?? "");
      setAllDay(editEvent.allDay);
    } else {
      const base: NewEvent = { ...EMPTY, ...prefill };
      setTitle(base.title);
      setDescription(base.description);
      setEventType(base.eventType);
      setStartInput(base.startDatetime ? toLocalInput(base.startDatetime) : defaultStart());
      setEndInput(base.endDatetime ? toLocalInput(base.endDatetime) : "");
      setLocation(base.location);
      setStatus(base.status);
      setProjectId(base.projectId ?? "");
      setAllDay(base.allDay);
    }
  }, [open, editEvent, prefill]);

  const isValid = title.trim().length > 0 && startInput.length > 0;
  const endBeforeStart = !!endInput && endInput <= startInput;

  /** Detect conflicts: returns events that overlap the new/edited interval */
  const conflicts = useMemo(() => {
    if (!startInput) return [];
    const newStart = new Date(fromLocalInput(startInput)).getTime();
    // If no end, assume 1 h duration for overlap check
    const newEnd = endInput
      ? new Date(fromLocalInput(endInput)).getTime()
      : newStart + 60 * 60 * 1000;

    return existingEvents.filter((ev) => {
      // Skip the event being edited
      if (editEvent && ev.id === editEvent.id) return false;
      // Skip cancelled events
      if (ev.status === "cancelled") return false;
      const evStart = new Date(ev.startDatetime).getTime();
      const evEnd = ev.endDatetime
        ? new Date(ev.endDatetime).getTime()
        : evStart + 60 * 60 * 1000;
      // Overlap when one starts before the other ends
      return newStart < evEnd && newEnd > evStart;
    });
  }, [startInput, endInput, existingEvents, editEvent]);

  const hasConflict = conflicts.length > 0;

  const handleSave = async () => {
    setSubmitted(true);
    if (!isValid || endBeforeStart) return;
    // If there are conflicts and user hasn't confirmed yet, show warning first
    if (hasConflict && !confirmConflict) {
      setConfirmConflict(true);
      return;
    }
    setSaving(true);
    await onSave({
      title: title.trim(),
      description,
      eventType,
      startDatetime: fromLocalInput(startInput),
      endDatetime: endInput ? fromLocalInput(endInput) : null,
      location,
      status,
      projectId: projectId || null,
      allDay,
    });
    setSaving(false);
    onOpenChange(false);
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle>{editEvent ? t("agenda.editEvent") : t("agenda.newEvent")}</DialogTitle>
          <DialogDescription>
            {editEvent ? t("agenda.formEditDesc") : t("agenda.formDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="ev-title">{t("agenda.titleLabel")} *</Label>
            <Input
              id="ev-title"
              placeholder="Ex: Show no Sesc"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 120))}
              maxLength={120}
            />
            {submitted && !title.trim() && (
              <p className="text-xs text-destructive">{t("agenda.titleRequired")}</p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Tipo de Evento *</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-2">
                      <t.icon className="h-3.5 w-3.5" />
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* All day */}
          <div className="flex items-center gap-2">
            <Checkbox id="ev-allday" checked={allDay} onCheckedChange={(v) => setAllDay(!!v)} />
            <Label htmlFor="ev-allday" className="cursor-pointer">Evento de dia inteiro</Label>
          </div>

          {/* Dates */}
          {!allDay ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Início *</Label>
                <DateTimePickerField
                  value={startInput}
                  onChange={setStartInput}
                  placeholder="Selecionar início"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Término</Label>
                <DateTimePickerField
                  value={endInput}
                  onChange={setEndInput}
                  placeholder="Selecionar término"
                />
                {endBeforeStart && (
                  <p className="text-[10px] text-destructive">{t("agenda.endBeforeStart")}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <DateTimePickerField
                value={startInput}
                onChange={(val) => setStartInput(val ? val.slice(0, 10) + "T00:00" : "")}
                placeholder="Selecionar data"
                dateOnly
              />
            </div>
          )}

          {/* Location */}
          <div className="space-y-1.5">
            <Label>Local</Label>
            <Input placeholder="Local, link ou observação" value={location} onChange={(e) => setLocation(e.target.value.slice(0, 200))} maxLength={200} />
          </div>

          {/* Status + Project */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status *</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Projeto</Label>
              <Select value={projectId || "none"} onValueChange={(v) => setProjectId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder={t("agenda.noProject")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("agenda.noProject")}</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Descrição / Observações</Label>
            <Textarea
              placeholder="Detalhes, repertório, contatos, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              maxLength={1000}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Conflict warning */}
          {hasConflict && (
            <div className={`rounded-lg border px-3 py-2.5 space-y-1.5 ${
              confirmConflict
                ? "border-amber-500/40 bg-amber-500/10"
                : "border-destructive/40 bg-destructive/10"
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 shrink-0 ${confirmConflict ? "text-amber-400" : "text-destructive"}`} />
                <p className={`text-sm font-medium ${confirmConflict ? "text-amber-300" : "text-destructive"}`}>
                  {confirmConflict
                    ? t("agenda.conflictConfirmed")
                    : `${conflicts.length} conflito${conflicts.length > 1 ? "s" : ""} de agenda detectado${conflicts.length > 1 ? "s" : ""}`}
                </p>
              </div>
              <ul className="space-y-0.5 pl-6">
                {conflicts.map((ev) => (
                  <li key={ev.id} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                    <span className="font-medium text-foreground/80">{ev.title}</span>
                    <span>—</span>
                    <span>
                      {format(new Date(ev.startDatetime), "dd/MM HH:mm", { locale: ptBR })}
                      {ev.endDatetime && ` até ${format(new Date(ev.endDatetime), "HH:mm", { locale: ptBR })}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("agenda.cancel")}</Button>
          {hasConflict && !confirmConflict ? (
            <>
              <Button
                variant="outline"
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmConflict(true)}
              >
                {t("agenda.saveAnyway")}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saving || endBeforeStart}
              className="neon-glow active:scale-95 transition-transform"
            >
              {saving ? t("agenda.saving") : t("agenda.saveEvent")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
