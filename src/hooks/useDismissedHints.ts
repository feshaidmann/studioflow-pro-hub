import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type DismissMode = "snooze" | "permanent";

/**
 * Gerencia sugestões de profissional ocultadas pelo usuário em um projeto.
 * snooze_until = NULL → permanente; snooze_until > now() → snooze ativo.
 */
export function useDismissedHints(projectId?: string) {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id || !projectId) {
      setDismissed(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_hint_dismissals" as any)
      .select("specialty, snooze_until")
      .eq("user_id", user.id)
      .eq("project_id", projectId);
    const now = Date.now();
    const active = new Set<string>();
    (data ?? []).forEach((row: any) => {
      const until = row.snooze_until ? new Date(row.snooze_until).getTime() : null;
      if (until === null || until > now) active.add(row.specialty);
    });
    setDismissed(active);
    setLoading(false);
  }, [user?.id, projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const dismiss = useCallback(
    async (specialty: string, mode: DismissMode) => {
      if (!user?.id || !projectId) return;
      const snooze_until =
        mode === "snooze"
          ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
          : null;
      await supabase
        .from("marketplace_hint_dismissals" as any)
        .upsert(
          {
            user_id: user.id,
            project_id: projectId,
            specialty,
            snooze_until,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,project_id,specialty" },
        );
      setDismissed((prev) => new Set(prev).add(specialty));
    },
    [user?.id, projectId],
  );

  return { dismissed, dismiss, loading, refresh };
}
