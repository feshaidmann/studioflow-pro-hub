import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const THROTTLE_KEY = "sfp_tasks_last_gen";
const THROTTLE_MS = 60 * 60 * 1000;

/**
 * Dispara `generate-daily-tasks` no máximo 1x por hora por sessão.
 * Mostra toast com delta de novas tarefas, garantindo refresh ao final.
 */
export function useDailyTaskAutoGen(projectsCount: number, refreshTasks: () => void | Promise<unknown>) {
  const { user } = useAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!user || projectsCount === 0 || ranRef.current) return;
    const lastGen = Number(localStorage.getItem(THROTTLE_KEY) || "0");
    if (Date.now() - lastGen < THROTTLE_MS) {
      ranRef.current = true;
      refreshTasks();
      return;
    }
    ranRef.current = true;

    const run = async () => {
      try {
        const beforeRes = await supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("auto_generated", true)
          .eq("completed", false)
          .eq("dismissed", false);
        const beforeCount = beforeRes.count ?? 0;

        await supabase.functions.invoke("generate-daily-tasks", { body: {} });
        localStorage.setItem(THROTTLE_KEY, String(Date.now()));

        const afterRes = await supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("auto_generated", true)
          .eq("completed", false)
          .eq("dismissed", false);
        const delta = (afterRes.count ?? 0) - beforeCount;
        if (delta > 0) {
          toast.info(
            `Checklist atualizado · ${delta} ${delta === 1 ? "nova tarefa" : "novas tarefas"}`,
            { duration: 4000 },
          );
        }
      } catch (err) {
        console.warn("[useDailyTaskAutoGen]", err);
        ranRef.current = false; // permite nova tentativa em outra sessão
      } finally {
        refreshTasks();
      }
    };
    run();
  }, [user, projectsCount, refreshTasks]);
}
