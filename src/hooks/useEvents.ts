import { useState, useEffect, useCallback } from "react";
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

function dbToEvent(row: any): CalendarEvent {
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

export function useEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setEvents([]); setLoading(false); return; }
    let active = true;
    setLoading(true);
    supabase
      .from("events")
      .select("*")
      .order("start_datetime", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error("useEvents fetch error:", error);
        if (data) setEvents(data.map(dbToEvent));
        setLoading(false);
      });
    return () => { active = false; };
  }, [user]);

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
    setEvents((prev) => [...prev, created].sort((a, b) => a.startDatetime.localeCompare(b.startDatetime)));
    return created;
  }, [user]);

  const updateEvent = useCallback(async (id: string, ev: Partial<NewEvent>): Promise<void> => {
    const dbData: Record<string, any> = {};
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
    setEvents((prev) =>
      prev
        .map((e) => e.id === id ? { ...e, ...ev } : e)
        .sort((a, b) => a.startDatetime.localeCompare(b.startDatetime))
    );
  }, []);

  const deleteEvent = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir evento"); return; }
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { events, loading, addEvent, updateEvent, deleteEvent };
}
