import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface GuestProject {
  id: string;
  name: string;
  artist: string;
  stage: string;
  completed: boolean;
  project_type: string;
  role: string;
}

export function useGuestProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<GuestProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase.rpc("get_member_projects").then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.warn("[useGuestProjects]", error);
      if (data) {
        setProjects(
          data.map((d: any) => ({
            id: d.id,
            name: d.name,
            artist: d.artist,
            stage: d.stage,
            completed: d.completed,
            project_type: d.project_type,
            role: d.role,
          })),
        );
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { projects, loading };
}
