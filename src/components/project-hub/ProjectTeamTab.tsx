import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, Mail, Phone, DollarSign, Music, X as XIcon, Check, Clock, Copy, Link2 } from "lucide-react";
import { useProjects } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Professional } from "@/data/mockData";

interface ProjectTeamTabProps {
  projectId: string;
}

export default function ProjectTeamTab({ projectId }: ProjectTeamTabProps) {
  const { professionals, removeProfessional } = useProjects();
  const team = professionals[projectId] || [];

  const [inviteTokens, setInviteTokens] = useState<Record<string, string>>({});
  const [inviteStatuses, setInviteStatuses] = useState<Record<string, string>>({});
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("project_invitations").select("professional_email, token, status").eq("project_id", projectId).then(({ data }) => {
      if (!data) return;
      const tokenMap: Record<string, string> = {};
      const statusMap: Record<string, string> = {};
      data.forEach((row) => {
        if (row.token) tokenMap[row.professional_email] = row.token;
        if (row.status) statusMap[row.professional_email] = row.status;
      });
      setInviteTokens(tokenMap);
      setInviteStatuses(statusMap);
    });
  }, [projectId]);

  const getInviteLink = (token: string) => `${window.location.origin}/invite/${token}`;

  const handleCopyLink = async (token: string) => {
    await navigator.clipboard.writeText(getInviteLink(token));
    setCopiedToken(token);
    toast.success("Link copiado! 🔗");
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (team.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <Users className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Nenhum colaborador neste projeto ainda.</p>
        <p className="text-xs text-muted-foreground">Adicione membros pela tela de Projetos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Colaboradores ({team.length})</span>
      </div>
      {team.map((prof) => {
        const token = prof.email ? inviteTokens[prof.email] : null;
        const inviteLink = token ? getInviteLink(token) : null;
        const isCopied = token && copiedToken === token;
        const inviteStatus = prof.email ? inviteStatuses[prof.email] : null;
        return (
          <div key={prof.id} className="rounded-lg bg-secondary/30 border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-wrap gap-1.5">
                <span className="font-medium text-sm">{prof.name}</span>
                <Badge variant="secondary" className="text-xs">{prof.role}</Badge>
                {inviteStatus === "pending" && <Badge variant="outline" className="text-[10px] gap-1 border-yellow-500/50 text-yellow-400"><Clock className="h-2.5 w-2.5"/>Pendente</Badge>}
                {inviteStatus === "accepted" && <Badge variant="outline" className="text-[10px] gap-1 border-green-500/50 text-green-400"><Check className="h-2.5 w-2.5"/>Aceito</Badge>}
                {inviteStatus === "declined" && <Badge variant="outline" className="text-[10px] gap-1 border-red-500/50 text-red-400"><XIcon className="h-2.5 w-2.5"/>Recusado</Badge>}
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeProfessional(projectId, prof.id)}>
                <XIcon className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {prof.instrument && prof.instrument !== "—" && <span className="flex items-center gap-1"><Music className="h-3 w-3" />{prof.instrument}</span>}
              {prof.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{prof.email}</span>}
              {prof.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{prof.phone}</span>}
              {prof.fee > 0 && <span className="flex items-center gap-1 text-foreground"><DollarSign className="h-3 w-3" />R$ {prof.fee.toLocaleString()}</span>}
            </div>
            {prof.notes && <p className="text-xs text-muted-foreground italic">{prof.notes}</p>}
            {inviteLink && (
              <div className="pt-1 border-t border-border/40 space-y-1.5">
                <div className="flex items-center gap-1.5 rounded-md bg-primary/5 border border-primary/20 px-2 py-1.5">
                  <Link2 className="h-3 w-3 text-primary shrink-0" />
                  <span className="text-[10px] text-muted-foreground truncate flex-1 font-mono">/invite/{token}</span>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 w-full" onClick={() => handleCopyLink(token!)}>
                  {isCopied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                  {isCopied ? "Copiado!" : "Copiar link"}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
