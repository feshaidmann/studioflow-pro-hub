import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { User, Clock, Target, CalendarDays, Activity, Music2, Users, FileText, CheckCircle2 } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ativo: { label: "Ativo", color: "bg-success/20 text-success border-success/30" },
  convidado: { label: "Convidado", color: "bg-primary/20 text-primary border-primary/30" },
  aguardando: { label: "Aguardando", color: "bg-warning/20 text-warning border-warning/30" },
  atrasado: { label: "Atrasado", color: "bg-destructive/20 text-destructive border-destructive/30" },
  entregou: { label: "Entregou", color: "bg-success/20 text-success border-success/30" },
  concluido: { label: "Concluído", color: "bg-muted text-muted-foreground border-border" },
};

const STAGE_LABELS: Record<string, string> = {
  rough: "Rascunho", inicio: "Projeto Iniciado", gravacao: "Gravação", mix: "Mix",
  master: "Master", upload: "Upload / Pré-lançamento", lancado: "Lançado",
};

const STAGE_PERCENT: Record<string, number> = {
  rough: 0, inicio: 5, gravacao: 25, mix: 55, master: 75, upload: 90, lancado: 100,
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

interface AcceptedInvitationInfo {
  professional_role: string;
  fee: number;
  deadline: string;
  schedule_notes: string;
  accepted_at: string | null;
  responded_at: string | null;
}

interface TeamMember {
  name: string;
  role: string;
  delivery_status: string;
}

export function buildMemberFromInvitation(invitation: AcceptedInvitationInfo, projectStage: string): MemberInfo {
  return {
    role: invitation.professional_role || "",
    delivery_status: "ativo",
    expected_deliverable: invitation.schedule_notes || "",
    delivery_due_date: invitation.deadline || null,
    last_activity_at: invitation.accepted_at ?? invitation.responded_at ?? null,
    stage: projectStage,
    fee: Number(invitation.fee ?? 0),
    notes: invitation.schedule_notes || "",
  };
}

export function computeIsLate(deliveryDueDate: string | null, deliveryStatus: string): boolean {
  if (!deliveryDueDate) return false;
  return (
    new Date(deliveryDueDate) < new Date() &&
    !["entregou", "concluido"].includes(deliveryStatus)
  );
}

export function computeDaysLeft(deliveryDueDate: string | null): number | null {
  if (!deliveryDueDate) return null;
  return Math.ceil((new Date(deliveryDueDate).getTime() - Date.now()) / 86400000);
}

interface CollaboratorOverviewTabProps {
  projectId: string;
  project: { name: string; artist: string; stage: string; completed: boolean; projectType: string };
}

export default function CollaboratorOverviewTab({ projectId, project }: CollaboratorOverviewTabProps) {
  const { user } = useAuth();
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [myTaskCount, setMyTaskCount] = useState<{ total: number; done: number }>({ total: 0, done: 0 });
  const [myFileCount, setMyFileCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadAll = async () => {
      let resolvedMember: MemberInfo | null = null;

      // My membership (direct member row)
      const { data: memberData } = await supabase
        .from("project_members")
        .select("role, delivery_status, expected_deliverable, delivery_due_date, last_activity_at, stage, fee, notes")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberData) {
        resolvedMember = memberData as MemberInfo;
      } else if (user.email) {
        // Fallback for accepted collaborators identified via invitation email
        const { data: invitationData } = await supabase
          .from("project_invitations")
          .select("professional_role, fee, deadline, schedule_notes, accepted_at, responded_at")
          .eq("project_id", projectId)
          .eq("status", "accepted")
          .ilike("professional_email", user.email)
          .order("accepted_at", { ascending: false })
          .maybeSingle();

        if (invitationData) {
          resolvedMember = buildMemberFromInvitation(invitationData as AcceptedInvitationInfo, project.stage);
        }
      }

      setMember(resolvedMember);

      // Team members from accepted invitations (safe fallback for collaborators)
      const { data: teamInvites } = await supabase
        .from("project_invitations")
        .select("professional_name, professional_role, professional_email")
        .eq("project_id", projectId)
        .eq("status", "accepted");

      if (teamInvites) {
        const normalizedEmail = user.email?.toLowerCase() ?? "";
        setTeamMembers(
          teamInvites
            .filter((member) => (member.professional_email || "").toLowerCase() !== normalizedEmail)
            .map((member) => ({
              name: member.professional_name || "Colaborador",
              role: member.professional_role || "",
              delivery_status: "ativo",
            }))
        );
      }

      // My tasks
      const { data: tasks } = await supabase
        .from("tasks")
        .select("completed")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .eq("dismissed", false);

      if (tasks) {
        setMyTaskCount({ total: tasks.length, done: tasks.filter((t) => t.completed).length });
      }

      // My files
      const { count } = await supabase
        .from("project_files")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("user_id", user.id);

      setMyFileCount(count ?? 0);
      setLoading(false);
    };

    loadAll();
  }, [projectId, user]);

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>;
  if (!member) return <div className="py-8 text-center text-sm text-muted-foreground">Você não é membro deste projeto.</div>;

  const statusInfo = STATUS_LABELS[member.delivery_status] ?? STATUS_LABELS.ativo;
  const dueDate = member.delivery_due_date ? new Date(member.delivery_due_date).toLocaleDateString("pt-BR") : null;
  const isLate = computeIsLate(member.delivery_due_date, member.delivery_status);
  const stageProgress = STAGE_PERCENT[project.stage] ?? 0;
  const daysLeft = computeDaysLeft(member.delivery_due_date);

  return (
    <div className="space-y-4 py-2">
      {/* Project info + progress */}
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary) / 0.15)" }}>
            <Music2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{project.name}</p>
            <p className="text-xs text-muted-foreground">{project.artist}</p>
          </div>
          {project.completed
            ? <Badge className="bg-success/20 text-success border-success/30 text-xs">Concluído</Badge>
            : <Badge variant="secondary" className="text-xs">{STAGE_LABELS[project.stage] ?? project.stage}</Badge>
          }
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Progresso do projeto</span>
            <span>{stageProgress}%</span>
          </div>
          <Progress value={stageProgress} className="h-1.5" />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border bg-card/60 p-3 text-center">
          <CheckCircle2 className="h-4 w-4 text-success mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{myTaskCount.done}/{myTaskCount.total}</p>
          <p className="text-[10px] text-muted-foreground">Tarefas</p>
        </div>
        <div className="rounded-lg border border-border bg-card/60 p-3 text-center">
          <FileText className="h-4 w-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{myFileCount}</p>
          <p className="text-[10px] text-muted-foreground">Arquivos</p>
        </div>
        <div className={`rounded-lg border p-3 text-center ${isLate ? "border-destructive/30 bg-destructive/5" : "border-border bg-card/60"}`}>
          <CalendarDays className={`h-4 w-4 mx-auto mb-1 ${isLate ? "text-destructive" : "text-muted-foreground"}`} />
          <p className={`text-lg font-bold ${isLate ? "text-destructive" : "text-foreground"}`}>
            {daysLeft !== null ? (daysLeft >= 0 ? daysLeft : Math.abs(daysLeft)) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {daysLeft !== null ? (daysLeft >= 0 ? "Dias restantes" : "Dias atrasado") : "Sem prazo"}
          </p>
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
          {member.fee > 0 && (
            <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Cachê</p>
              <p className="text-sm font-bold text-primary">R$ {Number(member.fee).toLocaleString("pt-BR")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Delivery info */}
      {(member.expected_deliverable || dueDate || member.notes) && (
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

          {dueDate && (
            <div className={`rounded-lg border p-3 ${isLate ? "bg-destructive/10 border-destructive/30" : "bg-secondary/40 border-border"}`}>
              <div className="flex items-center gap-1 mb-1">
                <CalendarDays className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prazo</p>
              </div>
              <p className={`text-sm font-medium ${isLate ? "text-destructive" : "text-foreground"}`}>{dueDate}</p>
            </div>
          )}

          {member.notes && (
            <div className="rounded-lg bg-secondary/40 border border-border p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Observações</p>
              <p className="text-sm text-foreground leading-relaxed">{member.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Team overview */}
      {teamMembers.length > 0 && (
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Equipe ({teamMembers.length + 1})</span>
          </div>
          <div className="space-y-2">
            {teamMembers.map((tm, i) => {
              const tmStatus = STATUS_LABELS[tm.delivery_status] ?? STATUS_LABELS.ativo;
              return (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary shrink-0">
                    {tm.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-foreground truncate flex-1">{tm.name}</span>
                  {tm.role && <span className="text-xs text-muted-foreground">{tm.role}</span>}
                  <Badge className={`text-[10px] px-1.5 py-0 h-4 ${tmStatus.color}`}>{tmStatus.label}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
