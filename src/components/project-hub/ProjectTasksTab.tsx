import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, ListChecks } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";

interface ProjectTasksTabProps {
  projectId: string;
}

export default function ProjectTasksTab({ projectId }: ProjectTasksTabProps) {
  const { activeTasks, completedTasks, addTask, toggleTask, deleteTask } = useTasks();
  const [newTaskDesc, setNewTaskDesc] = useState("");

  const projectActiveTasks = activeTasks.filter((t) => t.projectId === projectId);
  const projectCompletedTasks = completedTasks.filter((t) => t.projectId === projectId);

  const handleAddTask = async () => {
    if (!newTaskDesc.trim()) return;
    await addTask({ description: newTaskDesc.trim(), projectId });
    setNewTaskDesc("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Tarefas do Projeto</span>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Nova tarefa…"
          value={newTaskDesc}
          onChange={(e) => setNewTaskDesc(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAddTask(); }}
          className="h-8 text-sm"
        />
        <Button size="sm" className="h-8 px-2 shrink-0" onClick={handleAddTask} disabled={!newTaskDesc.trim()}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {projectActiveTasks.length === 0 && projectCompletedTasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma tarefa neste projeto ainda.</p>
      ) : (
        <div className="space-y-1">
          {projectActiveTasks.map((task) => (
            <div key={task.id} className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary/30 transition-colors group">
              <Checkbox checked={false} onCheckedChange={() => toggleTask(task.id)} className="shrink-0 mt-0.5" />
              <span className="flex-1 text-xs leading-snug">{task.description}</span>
              <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={() => deleteTask(task.id)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {projectCompletedTasks.length > 0 && (
            <div className="pt-2 space-y-1">
              <p className="text-xs text-muted-foreground">Concluídas ({projectCompletedTasks.length})</p>
              {projectCompletedTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center gap-2 rounded-lg px-2 py-1 opacity-60 hover:opacity-80 group">
                  <Checkbox checked={true} onCheckedChange={() => toggleTask(task.id)} className="shrink-0" />
                  <span className="flex-1 text-xs line-through text-muted-foreground">{task.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
