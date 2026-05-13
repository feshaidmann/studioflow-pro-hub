import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { GuestProject } from "./useGuestProjects";

export interface GuestTask {
  description: string;
  source: string;
  dueDate: string | null;
  assignedTo: string;
  blocked: boolean;
  blockedReason: string;
  severity: string;
  projectName: string;
}

export function useGuestTasks(guestProjects: GuestProject[]) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<GuestTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user || guestProjects.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }
    const ids = guestProjects.filter((g) => !g.completed).map((g) => g.id);
    if (ids.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("tasks")
      .select("description, source, due_date, assigned_to, blocked, blocked_reason, severity, project_id")
      .in("project_id", ids)
      .eq("completed", false)
      .eq("dismissed", false)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.warn("[useGuestTasks]", error);
        if (data) {
          const nameMap = Object.fromEntries(guestProjects.map((g) => [g.id, g.name]));
          setTasks(
            data.map((t: any) => ({
              description: t.description,
              source: t.source,
              dueDate: t.due_date,
              assignedTo: t.assigned_to,
              blocked: t.blocked,
              blockedReason: t.blocked_reason,
              severity: t.severity,
              projectName: nameMap[t.project_id] || "",
            })),
          );
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, guestProjects]);

  return { tasks, loading };
}
