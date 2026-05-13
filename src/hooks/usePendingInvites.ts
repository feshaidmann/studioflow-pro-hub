import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PendingInvite {
  projectId: string;
  professionalName: string;
  createdAt: string;
}

export function usePendingInvites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setInvites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("project_invitations")
      .select("project_id, professional_name, created_at")
      .eq("invited_by", user.id)
      .eq("status", "pending")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.warn("[usePendingInvites]", error);
        if (data) {
          setInvites(
            data.map((d) => ({
              projectId: d.project_id,
              professionalName: d.professional_name,
              createdAt: d.created_at,
            })),
          );
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { invites, loading };
}
