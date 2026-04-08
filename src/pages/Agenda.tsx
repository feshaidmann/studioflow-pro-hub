import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { isToday, isThisWeek, isThisMonth, parseISO, startOfDay, addDays } from "date-fns";
import { Plus, CalendarDays, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useEvents, type CalendarEvent, type NewEvent } from "@/hooks/useEvents";
import { useProjects } from "@/contexts/ProjectContext";
import EventCard from "@/components/agenda/EventCard";
import EventForm from "@/components/agenda/EventForm";
import TransactionForm from "@/components/finance/TransactionForm";
import { EVENT_TYPES } from "@/lib/eventTypes";

type DateFilter = "all" | "today" | "week" | "month";

export default function Agenda() {
  const { t } = useLanguage();
  const { events, loading, addEvent, updateEvent, deleteEvent } = useEvents();
  const { projects } = useProjects();

  /* ── Form state ── */
  const [formOpen, setFormOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  /* ── Transaction from show ── */
  const [txFormOpen, setTxFormOpen] = useState(false);
  const [txPrefill, setTxPrefill] = useState<{ description: string; date: string; projectId?: string } | null>(null);

  /* ── Filters ── */
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");

  const filtered = useMemo(() => {
    const now = startOfDay(new Date());
    const next7 = addDays(now, 7);

    return events.filter((ev) => {
      const d = parseISO(ev.startDatetime);

      // date filter
      if (dateFilter === "today" && !isToday(d)) return false;
      if (dateFilter === "week" && !(d >= now && d <= next7)) return false;
      if (dateFilter === "month" && !isThisMonth(d)) return false;

      // type filter
      if (typeFilter !== "all" && ev.eventType !== typeFilter) return false;

      // project filter
      if (projectFilter !== "all" && ev.projectId !== projectFilter) return false;

      return true;
    });
  }, [events, dateFilter, typeFilter, projectFilter]);

  const getProjectName = (id: string | null) =>
    id ? projects.find((p) => p.id === id)?.name : undefined;

  const handleSave = async (data: NewEvent) => {
    if (editEvent) {
      await updateEvent(editEvent.id, data);
      toast.success(t("agenda.eventUpdated"));
    } else {
      await addEvent(data);
      toast.success(t("agenda.eventCreated"));
    }
    setEditEvent(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteEvent(deleteTarget);
    setDeleteTarget(null);
    toast.success(t("agenda.eventDeleted"));
  };

  const handleCreateTransaction = (ev: CalendarEvent) => {
    setTxPrefill({
      description: ev.title,
      date: ev.startDatetime.slice(0, 10),
      projectId: ev.projectId ?? undefined,
    });
    setTxFormOpen(true);
  };

  const DATE_FILTERS: { value: DateFilter; label: string }[] = [
    { value: "all", label: t("agenda.filterAll") },
    { value: "today", label: t("agenda.filterToday") },
    { value: "week", label: t("agenda.filterWeek") },
    { value: "month", label: t("agenda.filterMonth") },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold neon-text">{t("agenda.title")}</h1>
          {!loading && (
            <Badge variant="secondary" className="text-xs">{events.length} {events.length !== 1 ? t("agenda.events") : t("agenda.event")}</Badge>
          )}
        </div>
        <Button
          className="neon-glow active:scale-95 transition-transform"
          onClick={() => { setEditEvent(null); setFormOpen(true); }}
        >
          <Plus className="h-4 w-4 mr-1" /> {t("agenda.newEvent")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Date quick filters */}
        <div className="flex gap-1 flex-wrap">
          {DATE_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={dateFilter === f.value ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs active:scale-95 transition-transform"
              onClick={() => setDateFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        {/* Type filter */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="flex-1 min-w-[140px] sm:w-[180px] sm:flex-none h-8 text-xs">
            <SelectValue placeholder={t("agenda.eventType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("agenda.allTypes")}</SelectItem>
            {EVENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Project filter */}
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="flex-1 min-w-[140px] sm:w-[180px] sm:flex-none h-8 text-xs">
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("agenda.allProjects")}</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Event list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          {t("misc.loading")}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <CalendarDays className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">
            {events.length === 0
              ? t("agenda.noEvents")
              : t("agenda.noEventsFiltered")}
          </p>
          {events.length === 0 && (
            <Button variant="outline" size="sm" onClick={() => { setEditEvent(null); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> {t("agenda.createFirst")}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in">
          {filtered.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              projectName={getProjectName(ev.projectId)}
              onEdit={() => { setEditEvent(ev); setFormOpen(true); }}
              onDelete={() => setDeleteTarget(ev.id)}
              onCreateTransaction={ev.eventType === "show" ? () => handleCreateTransaction(ev) : undefined}
            />
          ))}
        </div>
      )}

      {/* Event Form */}
      <EventForm
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditEvent(null); }}
        editEvent={editEvent}
        onSave={handleSave}
        existingEvents={events}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("agenda.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("agenda.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("misc.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("misc.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transaction Form (from Show) */}
      <TransactionForm
        open={txFormOpen}
        onOpenChange={setTxFormOpen}
        prefillDescription={txPrefill?.description}
        prefillDate={txPrefill?.date}
        prefillCategory="Shows"
        lockedProjectId={txPrefill?.projectId}
      />
    </div>
  );
}
