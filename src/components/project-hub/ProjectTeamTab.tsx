import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Users, Mail, Phone, DollarSign, Music, X as XIcon, Check, Clock,
  Copy, Link2, AlertTriangle, Package, ChevronDown, ChevronUp,
  CalendarDays, FileText, UserCheck, Send, UserPlus,
} from "lucide-react";
import { useProjects } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Professional } from "@/data/mockData";

/* ── Types ── */
type DeliveryStatus = "convidado" | "ativo" | "aguardando" | "atrasado" | "entregou" | "concluido";

interface MemberExtra {
  delivery_status: DeliveryStatus;
  delivery_due_date: string | null;
  expected_deliverable: string;
  last_activity_at: string | null;
  stage: string;
}

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; color: string; icon: typeof Clock }> = {
  convidado: { label: "Convidado", color: "border-warning/40 text-warning", icon: Clock },
  ativo: { label: "Ativo", color: "border-primary/40 text-primary", icon: UserCheck },
  aguardando: { label: "Aguardando", color: "border-warning/40 text-warning", icon: Clock },
  atrasado: { label: "Atrasado", color: "border-destructive/40 text-destructive", icon: AlertTriangle },
  entregou: { label: "Entregou", color: "border-success/40 text-success", icon: Package },
  concluido: { label: "Concluído", color: "border-success/40 text-success", icon: Check },
};

const STAGE_LABELS: Record<string, string> = {
  rough: "Projeto Iniciado", inicio: "Início", gravacao: "Gravação",
  mix: "Mix", master: "Master", upload: "Upload", lancado: "Lançado",
};

interface ProjectTeamTabProps {
  projectId: string;
}

export default function ProjectTeamTab({ projectId }: ProjectTeamTabProps) {
  const navigate = useNavigate();
  const { professionals, removeProfessional } = useProjects();
  const team = professionals[projectId] || [];

  const [memberExtras, setMemberExtras] = useState<Record<string, MemberExtra>>({});
  const [inviteTokens, setInviteTokens] = useState<Record<string, string>>({});
  const [inviteStatuses, setInviteStatuses] = useState<Record<string, string>>({});
  const [inviteIds, setInviteIds] = useState<Record<string, string>>({});
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; email: string; name: string } | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MemberExtra>>({});
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);

  // Fetch invitations + member extras
  useEffect(() => {
    const fetchData = async () => {
      const [invRes, memRes] = await Promise.all([
        supabase.from("project_invitations").select("id, professional_email, token, status").eq("project_id", projectId),
        supabase.from("project_members").select("id, delivery_status, delivery_due_date, expected_deliverable, last_activity_at, stage").eq("project_id", projectId),
      ]);

      if (invRes.data) {
        const tokenMap: Record<string, string> = {};
        const statusMap: Record<string, string> = {};
        const idMap: Record<string, string> = {};
        invRes.data.forEach((row) => {
          if (row.token) tokenMap[row.professional_email] = row.token;
          if (row.status) statusMap[row.professional_email] = row.status;
          if (row.id) idMap[row.professional_email] = row.id;
        });
        setInviteTokens(tokenMap);
        setInviteStatuses(statusMap);
        setInviteIds(idMap);
      }

      if (memRes.data) {
        const extras: Record<string, MemberExtra> = {};
        memRes.data.forEach((row) => {
          extras[row.id] = {
            delivery_status: (row.delivery_status || "ativo") as DeliveryStatus,
            delivery_due_date: row.delivery_due_date,
            expected_deliverable: row.expected_deliverable || "",
            last_activity_at: row.last_activity_at,
            stage: row.stage || "",
          };
        });
        setMemberExtras(extras);
      }
    };
    fetchData();
  }, [projectId]);

  // Compute effective status (auto-detect late)
  const getEffectiveStatus = (prof: Professional): DeliveryStatus => {
    const extra = memberExtras[prof.id];
    if (!extra) {
      const invStatus = prof.email ? inviteStatuses[prof.email] : null;
      if (invStatus === "pending") return "convidado";
      return "ativo";
    }
    if (extra.delivery_status === "ativo" && extra.delivery_due_date && isPast(new Date(extra.delivery_due_date)) && !isToday(new Date(extra.delivery_due_date))) {
      return "atrasado";
    }
    return extra.delivery_status;
  };

  // Filter
  const filteredTeam = useMemo(() => {
    if (filterStatus === "all") return team;
    return team.filter((p) => getEffectiveStatus(p) === filterStatus);
  }, [team, filterStatus, memberExtras, inviteStatuses]);

  // Summary counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    team.forEach((p) => {
      const s = getEffectiveStatus(p);
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [team, memberExtras, inviteStatuses]);

  const getInviteLink = (token: string) => `${window.location.origin}/invite/${token}`;

  const handleCopyLink = async (token: string) => {
    await navigator.clipboard.writeText(getInviteLink(token));
    setCopiedToken(token);
    toast.success("Link copiado! 🔗");
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    const { data, error } = await supabase.rpc("revoke_project_invitation", {
      p_invitation_id: revokeTarget.id,
    });
    setRevoking(false);
    if (error) {
      toast.error("Não foi possível revogar o convite");
      return;
    }
    const payload = data as { ok?: boolean; reason?: string } | null;
    if (payload?.ok === false) {
      toast.info("Este convite já não está mais pendente");
    } else {
      toast.success("Convite revogado. O link antigo foi invalidado.");
    }
    setInviteStatuses((m) => ({ ...m, [revokeTarget.email]: "revoked" }));
    setInviteTokens((m) => {
      const { [revokeTarget.email]: _, ...rest } = m;
      return rest;
    });
    setRevokeTarget(null);
  };

  const startEditing = (prof: Professional) => {
    const extra = memberExtras[prof.id];
    setEditingId(prof.id);
    setEditForm({
      delivery_status: extra?.delivery_status || "ativo",
      delivery_due_date: extra?.delivery_due_date || null,
      expected_deliverable: extra?.expected_deliverable || "",
      stage: extra?.stage || "",
    });
  };

  const saveEdit = async (profId: string) => {
    setSaving(true);
    const { error } = await supabase.from("project_members").update({
      delivery_status: editForm.delivery_status || "ativo",
      delivery_due_date: editForm.delivery_due_date || null,
      expected_deliverable: editForm.expected_deliverable || "",
      stage: editForm.stage || "",
      last_activity_at: new Date().toISOString(),
    }).eq("id", profId);

    if (error) {
      toast.error("Erro ao salvar");
    } else {
      setMemberExtras((prev) => ({
        ...prev,
        [profId]: {
          ...prev[profId],
          delivery_status: (editForm.delivery_status || "ativo") as DeliveryStatus,
          delivery_due_date: editForm.delivery_due_date || null,
          expected_deliverable: editForm.expected_deliverable || "",
          stage: editForm.stage || "",
          last_activity_at: new Date().toISOString(),
        },
      }));
      toast.success("Atualizado! ✅");
    }
    setEditingId(null);
    setSaving(false);
  };

  const quickStatusChange = async (profId: string, status: DeliveryStatus) => {
    const { error } = await supabase.from("project_members").update({
      delivery_status: status,
      last_activity_at: new Date().toISOString(),
    }).eq("id", profId);

    if (!error) {
      setMemberExtras((prev) => ({
        ...prev,
        [profId]: { ...prev[profId], delivery_status: status, last_activity_at: new Date().toISOString() },
      }));
      toast.success(`Status: ${STATUS_CONFIG[status].label}`);
    }
  };

  if (team.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <Users className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Nenhum colaborador neste projeto ainda.</p>
        <Button variant="outline" size="sm" className="gap-1.5 mt-2" onClick={() => navigate(`/projects?id=${projectId}&addMember=1`)}>
          <UserPlus className="h-3.5 w-3.5" /> Adicionar membro
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + Summary */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Equipe ({team.length})</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => navigate(`/projects?id=${projectId}&addMember=1`)}>
            <UserPlus className="h-3 w-3" /> Adicionar
          </Button>
          {Object.entries(statusCounts).map(([status, count]) => {
            const cfg = STATUS_CONFIG[status as DeliveryStatus];
            if (!cfg) return null;
            return (
              <Badge
                key={status}
                variant="outline"
                className={cn("text-[10px] gap-1 cursor-pointer", cfg.color, filterStatus === status && "ring-1 ring-primary")}
                onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
              >
                {count} {cfg.label}
              </Badge>
            );
          })}
          {filterStatus !== "all" && (
            <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => setFilterStatus("all")}>
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Member Cards */}
      {filteredTeam.map((prof) => {
        const token = prof.email ? inviteTokens[prof.email] : null;
        const isCopied = token && copiedToken === token;
        const extra = memberExtras[prof.id];
        const effectiveStatus = getEffectiveStatus(prof);
        const statusCfg = STATUS_CONFIG[effectiveStatus];
        const isExpanded = expandedId === prof.id;
        const isEditing = editingId === prof.id;

        const dueDate = extra?.delivery_due_date;
        const daysLeft = dueDate ? differenceInDays(new Date(dueDate), new Date()) : null;

        return (
          <div key={prof.id} className="rounded-lg bg-secondary/30 border border-border overflow-hidden">
            {/* Main row */}
            <div
              className="p-3 cursor-pointer hover:bg-muted/20 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : prof.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center flex-wrap gap-1.5 min-w-0">
                  <span className="font-medium text-sm truncate">{prof.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{prof.role}</Badge>
                  <Badge variant="outline" className={cn("text-[10px] gap-1", statusCfg.color)}>
                    <statusCfg.icon className="h-2.5 w-2.5" />
                    {statusCfg.label}
                  </Badge>
                  {extra?.stage && (
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                      {STAGE_LABELS[extra.stage] || extra.stage}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {dueDate && (
                    <span className={cn(
                      "text-[10px] flex items-center gap-0.5",
                      daysLeft !== null && daysLeft < 0 ? "text-destructive" : daysLeft !== null && daysLeft <= 2 ? "text-warning" : "text-muted-foreground"
                    )}>
                      <CalendarDays className="h-2.5 w-2.5" />
                      {format(new Date(dueDate), "dd/MM", { locale: ptBR })}
                    </span>
                  )}
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
              </div>

              {/* Deliverable preview */}
              {extra?.expected_deliverable && !isExpanded && (
                <p className="text-[10px] text-muted-foreground mt-1 truncate flex items-center gap-1">
                  <FileText className="h-2.5 w-2.5 shrink-0" />
                  {extra.expected_deliverable}
                </p>
              )}
            </div>

            {/* Expanded details */}
            {isExpanded && (
              <div className="border-t border-border p-3 space-y-3">
                {/* Contact info */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {prof.instrument && prof.instrument !== "—" && (
                    <span className="flex items-center gap-1"><Music className="h-3 w-3" />{prof.instrument}</span>
                  )}
                  {prof.email && (
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{prof.email}</span>
                  )}
                  {prof.phone && (
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{prof.phone}</span>
                  )}
                  {prof.fee > 0 && (
                    <span className="flex items-center gap-1 text-foreground">
                      <DollarSign className="h-3 w-3" />R$ {prof.fee.toLocaleString("pt-BR")}
                    </span>
                  )}
                </div>

                {prof.notes && <p className="text-xs text-muted-foreground italic">{prof.notes}</p>}

                {/* Deliverable & status section */}
                {isEditing ? (
                  <div className="space-y-2 bg-muted/20 rounded-md p-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-0.5 block">Status</label>
                        <Select
                          value={editForm.delivery_status || "ativo"}
                          onValueChange={(v) => setEditForm({ ...editForm, delivery_status: v as DeliveryStatus })}
                        >
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                              <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-0.5 block">Etapa</label>
                        <Select
                          value={editForm.stage || "none"}
                          onValueChange={(v) => setEditForm({ ...editForm, stage: v === "none" ? "" : v })}
                        >
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-xs">Nenhuma</SelectItem>
                            {Object.entries(STAGE_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">Prazo</label>
                      <Input
                        type="date"
                        className="h-7 text-xs"
                        value={editForm.delivery_due_date || ""}
                        onChange={(e) => setEditForm({ ...editForm, delivery_due_date: e.target.value || null })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">Entrega esperada</label>
                      <Input
                        className="h-7 text-xs"
                        placeholder="Ex: Stems de guitarra mixados"
                        value={editForm.expected_deliverable || ""}
                        onChange={(e) => setEditForm({ ...editForm, expected_deliverable: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs flex-1" onClick={() => saveEdit(prof.id)} disabled={saving}>
                        <Check className="h-3 w-3 mr-1" /> Salvar
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Deliverable info */}
                    {extra?.expected_deliverable && (
                      <div className="bg-muted/20 rounded-md p-2">
                        <span className="text-[10px] text-muted-foreground block mb-0.5">Entrega esperada</span>
                        <p className="text-xs">{extra.expected_deliverable}</p>
                      </div>
                    )}

                    {/* Last activity */}
                    {extra?.last_activity_at && (
                      <p className="text-[10px] text-muted-foreground">
                        Último movimento: {format(new Date(extra.last_activity_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}

                    {/* Quick actions */}
                    <div className="flex flex-wrap gap-1.5">
                      <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={(e) => { e.stopPropagation(); startEditing(prof); }}>
                        <FileText className="h-2.5 w-2.5" /> Editar
                      </Button>
                      {effectiveStatus === "ativo" && (
                        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 border-success/40 text-success hover:bg-success/10"
                          onClick={(e) => { e.stopPropagation(); quickStatusChange(prof.id, "entregou"); }}>
                          <Package className="h-2.5 w-2.5" /> Marcar entrega
                        </Button>
                      )}
                      {effectiveStatus === "entregou" && (
                        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 border-success/40 text-success hover:bg-success/10"
                          onClick={(e) => { e.stopPropagation(); quickStatusChange(prof.id, "concluido"); }}>
                          <Check className="h-2.5 w-2.5" /> Concluir
                        </Button>
                      )}
                      {(effectiveStatus === "atrasado" || effectiveStatus === "aguardando") && (
                        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 border-primary/40 text-primary hover:bg-primary/10"
                          onClick={(e) => { e.stopPropagation(); quickStatusChange(prof.id, "ativo"); }}>
                          <UserCheck className="h-2.5 w-2.5" /> Reativar
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); setRemoveTarget({ id: prof.id, name: prof.name }); }}>
                        <XIcon className="h-2.5 w-2.5" /> Remover
                      </Button>
                    </div>
                  </div>
                )}

                {/* Invite link */}
                {token && (
                  <div className="pt-2 border-t border-border/40 space-y-1.5">
                    <div className="flex items-center gap-1.5 rounded-md bg-primary/5 border border-primary/20 px-2 py-1.5">
                      <Link2 className="h-3 w-3 text-primary shrink-0" />
                      <span className="text-[10px] text-muted-foreground truncate flex-1 font-mono">/invite/{token}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1 flex-1" onClick={() => handleCopyLink(token!)}>
                        {isCopied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                        {isCopied ? "Copiado!" : "Copiar link"}
                      </Button>
                      {prof.email && inviteIds[prof.email] && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 text-destructive hover:text-destructive border-destructive/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRevokeTarget({ id: inviteIds[prof.email!], email: prof.email!, name: prof.name });
                          }}
                        >
                          <XIcon className="h-3 w-3" /> Revogar
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                {prof.email && inviteStatuses[prof.email] === "revoked" && !token && (
                  <div className="pt-2 border-t border-border/40">
                    <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">
                      Convite revogado
                    </Badge>
                  </div>
                )}
                {prof.email && inviteStatuses[prof.email] === "expired" && !token && (
                  <div className="pt-2 border-t border-border/40">
                    <Badge variant="outline" className="text-[10px] border-warning/40 text-warning">
                      Convite expirado
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Remove confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{removeTarget?.name}</strong> da equipe deste projeto?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (removeTarget) { removeProfessional(projectId, removeTarget.id); setRemoveTarget(null); } }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke confirmation */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && !revoking && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar convite</AlertDialogTitle>
            <AlertDialogDescription>
              O link enviado para <strong>{revokeTarget?.name}</strong> ({revokeTarget?.email}) deixará de funcionar imediatamente.
              Esta ação não pode ser desfeita — você precisará enviar um novo convite caso queira incluí-lo no projeto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={revoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); handleRevoke(); }}
            >
              {revoking ? "Revogando…" : "Revogar link"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
