import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ListChecks, Clock, AlertTriangle } from "lucide-react";

interface CollabTask {
  id: string;
  description: string;
  completed: boolean;
  due_date: string | null;
  severity: string;
  blocked: boolean;
  blocked_reason: string;
}

interface CollaboratorTasksTabProps {
  projectId: string;
}

export default function CollaboratorTasksTab({ projectId }: CollaboratorTasksTabProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<CollabTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // Get tasks assigned to user email or user id in this project
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    const displayName = profile?.display_name || user.email?.split("@")[0] || "";

    const { data, error } = await supabase
      .from("tasks")
      .select("id, description, completed, due_date, severity, blocked, blocked_reason")
      .eq("project_id", projectId)
      .or(`assigned_to.eq.${displayName},assigned_to.eq.${user.email},user_id.eq.${user.id}`)
      .eq("dismissed", false)
      .order("due_date", { ascending: true, nullsFirst: false });

    if (!error && data) setTasks(data);
    setLoading(false);
  }, [projectId, user]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const toggleTask = async (taskId: string, completed: boolean) => {
    await supabase.from("tasks").update({ completed }).eq("id", taskId);
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, completed } : t));
  };

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Carregando tarefas…</div>;

  const active = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);

  const isOverdue = (t: CollabTask) => t.due_date && new Date(t.due_date) < new Date() && !t.completed;

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Minhas Tarefas</span>
        <Badge variant="secondary" className="text-xs ml-auto">{active.length} pendente{active.length !== 1 ? "s" : ""}</Badge>
      </div>

      {active.length === 0 && done.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Nenhuma tarefa atribuída a você neste projeto.
        </div>
      )}

      {/* Active tasks */}
      <div className="space-y-2">
        {active.map((task) => (
          <div key={task.id} className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
            task.blocked ? "border-warning/40 bg-warning/5" : isOverdue(task) ? "border-destructive/40 bg-destructive/5" : "border-border bg-card/60"
          }`}>
            <Checkbox
              checked={false}
              onCheckedChange={() => toggleTask(task.id, true)}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{task.description}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {task.due_date && (
                  <span className={`text-xs flex items-center gap-1 ${isOverdue(task) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    <Clock className="h-3 w-3" />
                    {new Date(task.due_date).toLocaleDateString("pt-BR")}
                  </span>
                )}
                {task.blocked && (
                  <span className="text-xs flex items-center gap-1 text-warning">
                    <AlertTriangle className="h-3 w-3" />
                    Bloqueada{task.blocked_reason ? `: ${task.blocked_reason}` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Completed */}
      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Concluídas ({done.length})</p>
          {done.map((task) => (
            <div key={task.id} className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 opacity-60">
              <Checkbox
                checked={true}
                onCheckedChange={() => toggleTask(task.id, false)}
                className="mt-0.5"
              />
              <p className="text-sm text-muted-foreground line-through">{task.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
