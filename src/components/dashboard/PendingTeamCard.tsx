import { useMemo, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PendingInvite {
  id: string;
  projectId: string;
  projectName: string;
  professionalName: string;
  professionalRole: string;
  createdAt: string;
  daysWaiting: number;
}

interface PendingDelivery {
  projectId: string;
  projectName: string;
  memberName: string;
  role: string;
  dueDate: string | null;
  deliveryStatus: string;
  daysUntilDue: number | null;
}

export default function PendingTeamCard({ hidden }: { hidden?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [deliveries, setDeliveries] = useState<PendingDelivery[]>([]);

  useEffect(() => {
    if (!user) return;

    // Fetch pending invites with project name
    supabase
      .from("project_invitations")
      .select("id, project_id, professional_name, professional_role, created_at, projects(name)")
      .eq("invited_by", user.id)
      .eq("status", "pending")
      .then(({ data }) => {
        if (data) {
          const now = Date.now();
          setInvites(
            data.map((d: any) => ({
              id: d.id,
              projectId: d.project_id,
              projectName: d.projects?.name || "—",
              professionalName: d.professional_name,
              professionalRole: d.professional_role,
              createdAt: d.created_at,
              daysWaiting: Math.floor((now - new Date(d.created_at).getTime()) / 86400000),
            }))
          );
        }
      });

    // Fetch team members with pending deliveries
    supabase
      .from("project_members")
      .select("project_id, name, role, delivery_due_date, delivery_status, projects(name)")
      .eq("user_id", user.id)
      .neq("delivery_status", "entregue")
      .then(({ data }) => {
        if (data) {
          const now = Date.now();
          setDeliveries(
            data
              .filter((d: any) => d.delivery_due_date)
              .map((d: any) => {
                const due = new Date(d.delivery_due_date).getTime();
                return {
                  projectId: d.project_id,
                  projectName: d.projects?.name || "—",
                  memberName: d.name,
                  role: d.role,
                  dueDate: d.delivery_due_date,
                  deliveryStatus: d.delivery_status,
                  daysUntilDue: Math.ceil((due - now) / 86400000),
                };
              })
              .sort((a: PendingDelivery, b: PendingDelivery) => (a.daysUntilDue ?? 999) - (b.daysUntilDue ?? 999))
          );
        }
      });
  }, [user]);

  const totalPending = invites.length + deliveries.length;

  if (hidden || totalPending === 0) return null;

  const overdueDeliveries = deliveries.filter((d) => d.daysUntilDue !== null && d.daysUntilDue < 0);

  return (
    <Card className="glass-card animate-fade-in border-warning/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-warning" />
          Equipe pendente
          <Badge variant="secondary" className="text-[10px]">{totalPending}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Pending invites */}
        {invites.map((inv) => (
          <button
            key={inv.id}
            onClick={() => navigate(`/projects/${inv.projectId}`)}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted/40 transition-colors text-left"
          >
            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {inv.professionalName}
                {inv.professionalRole && <span className="text-muted-foreground font-normal"> · {inv.professionalRole}</span>}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{inv.projectName}</p>
            </div>
            <Badge variant="outline" className={cn(
              "text-[9px] shrink-0",
              inv.daysWaiting > 3 ? "border-warning/40 text-warning" : "border-border"
            )}>
              {inv.daysWaiting === 0 ? "Hoje" : `${inv.daysWaiting}d sem resposta`}
            </Badge>
          </button>
        ))}

        {/* Overdue/upcoming deliveries */}
        {deliveries.slice(0, 5).map((del, i) => (
          <button
            key={`del-${i}`}
            onClick={() => navigate(`/projects/${del.projectId}`)}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted/40 transition-colors text-left"
          >
            {del.daysUntilDue !== null && del.daysUntilDue < 0 ? (
              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
            ) : (
              <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {del.memberName}
                {del.role && <span className="text-muted-foreground font-normal"> · {del.role}</span>}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{del.projectName}</p>
            </div>
            <Badge variant="outline" className={cn(
              "text-[9px] shrink-0",
              del.daysUntilDue !== null && del.daysUntilDue < 0
                ? "border-destructive/40 text-destructive"
                : del.daysUntilDue !== null && del.daysUntilDue <= 3
                  ? "border-warning/40 text-warning"
                  : "border-border"
            )}>
              {del.daysUntilDue !== null && del.daysUntilDue < 0
                ? `${Math.abs(del.daysUntilDue)}d atrasado`
                : del.daysUntilDue !== null
                  ? `${del.daysUntilDue}d restantes`
                  : "Sem prazo"}
            </Badge>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
