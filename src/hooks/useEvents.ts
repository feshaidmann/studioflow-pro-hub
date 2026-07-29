import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description: string;
  eventType: string;
  startDatetime: string;
  endDatetime: string | null;
  location: string;
  status: string;
  projectId: string | null;
  allDay: boolean;
  createdAt: string;
}

export type NewEvent = Omit<CalendarEvent, "id" | "userId" | "createdAt">;

interface EventRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_datetime: string;
  end_datetime: string | null;
  location: string | null;
  status: string;
  project_id: string | null;
  all_day: boolean | null;
  created_at: string;
}

function dbToEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? "",
    eventType: row.event_type,
    startDatetime: row.start_datetime,
    endDatetime: row.end_datetime ?? null,
    location: row.location ?? "",
    status: row.status,
    projectId: row.project_id ?? null,
    allDay: row.all_day ?? false,
    createdAt: row.created_at,
  };
}

const byStart = (a: CalendarEvent, b: CalendarEvent) => a.startDatetime.localeCompare(b.startDatetime);

export const eventsKey = (userId?: string) => ["events", userId ?? "anon"] as const;

export function useEvents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = eventsKey(user?.id);

  const { data: events = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async (): Promise<CalendarEvent[]> => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("start_datetime", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(dbToEvent);
    },
  });

  // Realtime: agenda changes (own device or another session) refresh the cache.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`events:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events", filter: `user_id=eq.${user.id}` },
        () => { queryClient.invalidateQueries({ queryKey: key }); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, queryClient]);

  const setCache = useCallback((updater: (prev: CalendarEvent[]) => CalendarEvent[]) => {
    queryClient.setQueryData<CalendarEvent[]>(key, (prev) => updater(prev ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, user?.id]);

  const addEvent = useCallback(async (ev: NewEvent): Promise<CalendarEvent | null> => {
    if (!user) return null;
    const { data, error } = await supabase.from("events").insert({
      user_id: user.id,
      title: ev.title.trim(),
      description: ev.description,
      event_type: ev.eventType,
      start_datetime: ev.startDatetime,
      end_datetime: ev.endDatetime || null,
      location: ev.location,
      status: ev.status,
      project_id: ev.projectId || null,
      all_day: ev.allDay,
    }).select().single();
    if (error || !data) { toast.error("Erro ao criar evento"); return null; }
    const created = dbToEvent(data);
    setCache((prev) => [...prev, created].sort(byStart));
    return created;
  }, [user, setCache]);

  const updateEvent = useCallback(async (id: string, ev: Partial<NewEvent>): Promise<void> => {
    const dbData: Partial<EventRow> = {};
    if (ev.title !== undefined) dbData.title = ev.title.trim();
    if (ev.description !== undefined) dbData.description = ev.description;
    if (ev.eventType !== undefined) dbData.event_type = ev.eventType;
    if (ev.startDatetime !== undefined) dbData.start_datetime = ev.startDatetime;
    if (ev.endDatetime !== undefined) dbData.end_datetime = ev.endDatetime || null;
    if (ev.location !== undefined) dbData.location = ev.location;
    if (ev.status !== undefined) dbData.status = ev.status;
    if (ev.projectId !== undefined) dbData.project_id = ev.projectId || null;
    if (ev.allDay !== undefined) dbData.all_day = ev.allDay;

    const { error } = await supabase.from("events").update(dbData).eq("id", id);
    if (error) { toast.error("Erro ao atualizar evento"); return; }
    setCache((prev) => prev.map((e) => e.id === id ? { ...e, ...ev } : e).sort(byStart));
  }, [setCache]);

  const deleteEvent = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir evento"); return; }
    setCache((prev) => prev.filter((e) => e.id !== id));
  }, [setCache]);

  return { events, loading: isLoading, addEvent, updateEvent, deleteEvent };
}
