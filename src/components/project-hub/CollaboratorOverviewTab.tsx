import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { User, Clock, Target, CalendarDays, Activity, Music2 } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ativo: { label: "Ativo", color: "bg-success/20 text-success border-success/30" },
  convidado: { label: "Convidado", color: "bg-primary/20 text-primary border-primary/30" },
  aguardando: { label: "Aguardando", color: "bg-warning/20 text-warning border-warning/30" },
  atrasado: { label: "Atrasado", color: "bg-destructive/20 text-destructive border-destructive/30" },
  entregou: { label: "Entregou", color: "bg-success/20 text-success border-success/30" },
  concluido: { label: "Concluído", color: "bg-muted text-muted-foreground border-border" },
};

interface MemberInfo {
  role: string;
  delivery_status: string;
  expected_deliverable: string;
  delivery_due_date: string | null;
  last_activity_at: string | null;
  stage: string;
  fee: number;
  notes: string;
}

interface CollaboratorOverviewTabProps {
  projectId: string;
  project: { name: string; artist: string; stage: string; completed: boolean; projectType: string };
}

export default function CollaboratorOverviewTab({ projectId, project }: CollaboratorOverviewTabProps) {
  const { user } = useAuth();
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("project_members")
      .select("role, delivery_status, expected_deliverable, delivery_due_date, last_activity_at, stage, fee, notes")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setMember(data as MemberInfo);
        setLoading(false);
      });
  }, [projectId, user]);

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>;
  if (!member) return <div className="py-8 text-center text-sm text-muted-foreground">Você não é membro deste projeto.</div>;

  const statusInfo = STATUS_LABELS[member.delivery_status] ?? STATUS_LABELS.ativo;
  const dueDate = member.delivery_due_date ? new Date(member.delivery_due_date).toLocaleDateString("pt-BR") : null;
  const isLate = member.delivery_due_date && new Date(member.delivery_due_date) < new Date() && !["entregou", "concluido"].includes(member.delivery_status);

  return (
    <div className="space-y-4 py-2">
      {/* Project info */}
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary) / 0.15)" }}>
            <Music2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{project.name}</p>
            <p className="text-xs text-muted-foreground">{project.artist}</p>
          </div>
          {project.completed && <Badge className="bg-success/20 text-success border-success/30 text-xs">Concluído</Badge>}
        </div>
      </div>

      {/* My role card */}
      <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Minha Participação</span>
          <Badge className={`ml-auto text-xs ${statusInfo.color}`}>{statusInfo.label}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-secondary/40 border border-border p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Função</p>
            <p className="text-sm font-medium text-foreground">{member.role || "—"}</p>
          </div>
          <div className="rounded-lg bg-secondary/40 border border-border p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Etapa</p>
            <p className="text-sm font-medium text-foreground">{member.stage || project.stage || "—"}</p>
          </div>
        </div>
      </div>

      {/* Delivery info */}
      <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Entrega</span>
        </div>

        {member.expected_deliverable && (
          <div className="rounded-lg bg-secondary/40 border border-border p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Entrega esperada</p>
            <p className="text-sm text-foreground">{member.expected_deliverable}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {dueDate && (
            <div className={`rounded-lg border p-3 ${isLate ? "bg-destructive/10 border-destructive/30" : "bg-secondary/40 border-border"}`}>
              <div className="flex items-center gap-1 mb-1">
                <CalendarDays className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prazo</p>
              </div>
              <p className={`text-sm font-medium ${isLate ? "text-destructive" : "text-foreground"}`}>{dueDate}</p>
            </div>
          )}
          {member.fee > 0 && (
            <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Cachê</p>
              <p className="text-sm font-bold text-primary">R$ {Number(member.fee).toLocaleString("pt-BR")}</p>
            </div>
          )}
        </div>

        {member.notes && (
          <div className="rounded-lg bg-secondary/40 border border-border p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Observações</p>
            <p className="text-sm text-foreground leading-relaxed">{member.notes}</p>
          </div>
        )}
      </div>

      {/* Activity */}
      {member.last_activity_at && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <Activity className="h-3 w-3" />
          Última atividade: {new Date(member.last_activity_at).toLocaleDateString("pt-BR")}
        </div>
      )}
    </div>
  );
}
