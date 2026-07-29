import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Professional, ProfMetrics } from "@/components/professionals/types";

/** Perfil público resolvido por e-mail (RPC find_public_profile_by_email). */
interface PublicProfileRow { username: string | null; display_name: string | null }

/** Linha de project_members com projeto embedado pela query. */
interface MemberRow {
  project_id: string | null;
  created_at: string;
  role: string | null;
  fee: number | null;
  delivery_status: string | null;
  delivery_due_date: string | null;
  projects: { id: string; name: string; completed: boolean } | null;
}

export function useProfessionalMetrics(prof: Professional | null) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<ProfMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!prof || !user) { setMetrics(null); return; }
    let cancelled = false;
    setLoading(true);
    setMetrics(null);

    (async () => {
      const [membersRes, platformCountRes, ratingsRes, profileRes] = await Promise.all([
        supabase
          .from("project_members")
          .select("project_id, created_at, role, fee, delivery_status, delivery_due_date, projects:project_id(id, name, completed)")
          .eq("user_id", user.id)
          .ilike("name", prof.name)
          .order("created_at", { ascending: false }),
        supabase.rpc("get_professional_project_count", {
          p_email: prof.email ?? "",
          p_name: prof.name,
        }),
        supabase
          .from("professional_ratings")
          .select("stars")
          .eq("user_id", user.id)
          .ilike("professional_name", prof.name),
        prof.email
          ? supabase
              .rpc("find_public_profile_by_email", { p_email: prof.email.toLowerCase() })
              .then((res) => ({
                data: (Array.isArray(res.data) ? res.data[0] ?? null : null) as PublicProfileRow | null,
              }))
          : Promise.resolve({ data: null as PublicProfileRow | null }),
      ]);

      if (cancelled) return;

      const ratingRows = ratingsRes.data ?? [];
      const ratingCount = ratingRows.length;
      const avgRating = ratingCount > 0
        ? ratingRows.reduce((acc, r) => acc + Number(r.stars), 0) / ratingCount
        : null;

      const rows = (membersRes.data ?? []) as MemberRow[];
      const projectNames = rows.map((m) => m.projects?.name).filter(Boolean);
      const lastActivity = rows[0]?.created_at ?? null;
      const collaborationHistory = rows.map((m) => ({
        projectId: m.projects?.id ?? null,
        projectName: m.projects?.name || "—",
        completed: m.projects?.completed ?? false,
        role: m.role || "",
        fee: Number(m.fee) || 0,
        deliveryStatus: m.delivery_status || "",
        joinedAt: m.created_at,
        deliveryDueDate: m.delivery_due_date ?? null,
      }));

      const fees = collaborationHistory.filter((h) => h.fee > 0).map((h) => h.fee);
      const avgFee = fees.length > 0 ? fees.reduce((a, b) => a + b, 0) / fees.length : null;

      const deliveryDays = collaborationHistory
        .filter((h) => h.deliveryDueDate && h.joinedAt)
        .map((h) => Math.ceil((new Date(h.deliveryDueDate!).getTime() - new Date(h.joinedAt).getTime()) / 86400000))
        .filter((d) => d > 0);
      const avgDeliveryDays = deliveryDays.length > 0
        ? Math.round(deliveryDays.reduce((a, b) => a + b, 0) / deliveryDays.length)
        : null;

      const publicProfileData = profileRes?.data;
      const publicProfile = publicProfileData?.username
        ? { username: publicProfileData.username, display_name: publicProfileData.display_name ?? "" }
        : null;

      setMetrics({
        projectCount: rows.length,
        projectNames,
        avgRating,
        ratingCount,
        lastActivity,
        platformProjectCount: Number(platformCountRes.data) || 0,
        avgFee,
        avgDeliveryDays,
        collaborationHistory,
        publicProfile,
      });
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [prof, user]);

  return { metrics, loading };
}
