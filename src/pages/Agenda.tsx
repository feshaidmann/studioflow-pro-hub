import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { isToday, isThisWeek, isThisMonth, parseISO, startOfDay, addDays, format } from "date-fns";
import { Plus, CalendarDays, Loader2, Users, AlertTriangle, Info, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useEvents, type CalendarEvent, type NewEvent } from "@/hooks/useEvents";
import { useProjects } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import EventCard from "@/components/agenda/EventCard";
import EventForm from "@/components/agenda/EventForm";
import TransactionForm from "@/components/finance/TransactionForm";
import { EVENT_TYPES } from "@/lib/eventTypes";
import { cn } from "@/lib/utils";
import { MobileStickyHeader } from "@/components/ui/mobile-sticky-header";

type DateFilter = "all" | "today" | "week" | "month";

export default function Agenda() {
  const { t } = useLanguage();
  const { events, loading, addEvent, updateEvent, deleteEvent } = useEvents();
  const { projects } = useProjects();
  const { user } = useAuth();

  /* ── Collaborator deadlines ── */
  interface TeamDeadline {
    memberName: string;
    role: string;
    projectName: string;
    projectId: string;
    dueDate: string;
    daysUntilDue: number;
    status: string;
  }
  const [teamDeadlines, setTeamDeadlines] = useState<TeamDeadline[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("project_members")
      .select("name, role, delivery_due_date, delivery_status, project_id, projects(name)")
      .eq("user_id", user.id)
      .neq("delivery_status", "entregue")
      .not("delivery_due_date", "is", null)
      .then(({ data }) => {
        if (data) {
          const now = Date.now();
          setTeamDeadlines(
            data
              .map((d: any) => ({
                memberName: d.name,
                role: d.role,
                projectName: d.projects?.name || "—",
                projectId: d.project_id,
                dueDate: d.delivery_due_date,
                daysUntilDue: Math.ceil((new Date(d.delivery_due_date).getTime() - now) / 86400000),
                status: d.delivery_status,
              }))
              .sort((a: TeamDeadline, b: TeamDeadline) => a.daysUntilDue - b.daysUntilDue)
          );
        }
      });
  }, [user]);

  /* ── Form state ── */
  const [formOpen, setFormOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [formPrefill, setFormPrefill] = useState<Partial<NewEvent> | undefined>(undefined);

  /* ── Auto-open form from URL params (?new=1&project=:id) ── */
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      const projectId = searchParams.get("project");
      setEditEvent(null);
      setFormPrefill(projectId ? { projectId } : undefined);
      setFormOpen(true);
      // Clean params so refresh doesn't reopen
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      next.delete("project");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Transaction from show ── */
  const [txFormOpen, setTxFormOpen] = useState(false);
  const [txPrefill, setTxPrefill] = useState<{ description: string; date: string; projectId?: string } | null>(null);

  /* ── Filters ── */
  const [dateFilter, setDateFilter] = useState<DateFilter>("week");
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

  // Events within 3 days without preparation (no description / no linked project tasks)
  const unpreparedEvents = useMemo(() => {
    const now = startOfDay(new Date());
    const soon = addDays(now, 3);
    return events.filter((ev) => {
      const d = parseISO(ev.startDatetime);
      if (d < now || d > soon) return false;
      // Consider unprepared if no description and important type
      const importantTypes = ["show", "recording", "rehearsal", "release"];
      if (!importantTypes.includes(ev.eventType)) return false;
      return !ev.description || ev.description.trim().length < 10;
    });
  }, [events]);

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
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Mobile sticky header com CTA */}
      <MobileStickyHeader
        title={t("agenda.title")}
        subtitle={!loading ? `${events.length} ${events.length !== 1 ? t("agenda.events") : t("agenda.event")}` : undefined}
        cta={
          <Button
            size="sm"
            className="h-9 active:scale-95 transition-transform"
            onClick={() => { setEditEvent(null); setFormOpen(true); }}
          >
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        }
      />

      {/* Header desktop */}
      <div className="hidden md:flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">{t("agenda.title")}</h1>
          {!loading && (
            <Badge variant="secondary" className="text-xs">{events.length} {events.length !== 1 ? t("agenda.events") : t("agenda.event")}</Badge>
          )}
        </div>
        <Button
          className="active:scale-95 transition-transform"
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

      {/* Team deadlines */}
      {teamDeadlines.length > 0 && (
        <Card className="glass-card border-warning/20 animate-fade-in">
          <CardContent className="p-4">
            <Collapsible defaultOpen={teamDeadlines.length <= 3}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full group">
                <Users className="h-4 w-4 text-warning" />
                <p className="text-sm font-semibold">Prazos da equipe</p>
                <Badge variant="secondary" className="text-[10px]">{teamDeadlines.length}</Badge>
                <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out">
                <div className="space-y-1.5 mt-3">
                  {teamDeadlines.slice(0, 6).map((td, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md hover:bg-muted/30 transition-colors">
                      {td.daysUntilDue < 0 ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      ) : (
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="font-medium truncate flex-1">{td.memberName}</span>
                      <span className="text-muted-foreground truncate">{td.role}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground truncate">{td.projectName}</span>
                      <Badge variant="outline" className={cn(
                        "text-[11px] shrink-0",
                        td.daysUntilDue < 0 ? "border-destructive/40 text-destructive" :
                        td.daysUntilDue <= 3 ? "border-warning/40 text-warning" : "border-border"
                      )}>
                        {td.daysUntilDue < 0
                          ? `${Math.abs(td.daysUntilDue)}d atrasado`
                          : td.daysUntilDue === 0
                            ? "Hoje"
                            : `${td.daysUntilDue}d`}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Preparation alerts */}
      {unpreparedEvents.length > 0 && (
        <Card className="glass-card border-amber-400/20 animate-fade-in">
          <CardContent className="p-4">
            <Collapsible defaultOpen={unpreparedEvents.length <= 3}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full group">
                <Info className="h-4 w-4 text-amber-400" />
                <p className="text-sm font-semibold">Eventos sem preparação</p>
                <Badge variant="secondary" className="text-[10px]">{unpreparedEvents.length}</Badge>
                <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p className="text-xs text-muted-foreground mt-2 mb-2">
                  Estes eventos acontecem nos próximos 3 dias e não possuem descrição ou checklist.
                </p>
                <div className="space-y-1">
                  {unpreparedEvents.slice(0, 5).map((ev) => (
                    <div key={ev.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => { setEditEvent(ev); setFormOpen(true); }}
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span className="font-medium truncate flex-1">{ev.title}</span>
                      <span className="text-muted-foreground">
                        {format(parseISO(ev.startDatetime), "dd/MM")}
                      </span>
                    </div>
                  ))}
                  {unpreparedEvents.length > 5 && (
                    <p className="text-[11px] text-muted-foreground px-2 pt-1">
                      +{unpreparedEvents.length - 5} outros eventos sem preparação
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Event list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          {t("misc.loading")}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="rounded-full bg-primary/10 p-4">
            <CalendarDays className="h-10 w-10 text-primary/60" />
          </div>
          <div className="space-y-1">
            <p className="text-foreground font-medium">
              {events.length === 0
                ? t("agenda.noEvents")
                : t("agenda.noEventsFiltered")}
            </p>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              {events.length === 0
                ? "Organize shows, ensaios e gravações em um só lugar."
                : "Tente ajustar os filtros acima para encontrar seus eventos."}
            </p>
          </div>
          {events.length === 0 && (
            <Button className="mt-2" onClick={() => { setEditEvent(null); setFormOpen(true); }}>
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
        onOpenChange={(o) => { setFormOpen(o); if (!o) { setEditEvent(null); setFormPrefill(undefined); } }}
        editEvent={editEvent}
        onSave={handleSave}
        existingEvents={events}
        prefill={formPrefill}
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
