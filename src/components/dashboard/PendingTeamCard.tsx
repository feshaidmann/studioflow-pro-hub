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
    <Card role="region" aria-labelledby="region-team-title" className="glass-card animate-fade-in border-l-4 border-l-warning">
      <CardHeader className="pb-2">
        <CardTitle id="region-team-title" className="text-sm flex items-center gap-2">
          <Users aria-hidden="true" className="h-4 w-4 text-warning" />
          Equipe pendente
          <Badge variant="secondary" className="text-[10px]" aria-label={`${totalPending} pendência${totalPending > 1 ? "s" : ""}`}>{totalPending}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul role="list" className="space-y-2 m-0 p-0 list-none">
          {/* Pending invites */}
          {invites.map((inv) => (
            <li key={inv.id}>
              <button
                type="button"
                onClick={() => navigate(`/projects/${inv.projectId}`)}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Convite pendente para ${inv.professionalName}${inv.professionalRole ? ` (${inv.professionalRole})` : ""} no projeto ${inv.projectName}, ${inv.daysWaiting === 0 ? "criado hoje" : `há ${inv.daysWaiting} dia${inv.daysWaiting > 1 ? "s" : ""} sem resposta`}`}
              >
                <Clock aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
            </li>
          ))}

          {/* Overdue/upcoming deliveries */}
          {deliveries.slice(0, 5).map((del, i) => {
            const overdue = del.daysUntilDue !== null && del.daysUntilDue < 0;
            return (
              <li key={`del-${i}`}>
                <button
                  type="button"
                  onClick={() => navigate(`/projects/${del.projectId}`)}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={`Entrega de ${del.memberName}${del.role ? ` (${del.role})` : ""} no projeto ${del.projectName}, ${overdue ? `${Math.abs(del.daysUntilDue!)} dias atrasada` : del.daysUntilDue !== null ? `${del.daysUntilDue} dias restantes` : "sem prazo"}`}
                >
                  {overdue ? (
                    <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5 text-destructive shrink-0" />
                  ) : (
                    <Clock aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
                    overdue
                      ? "border-destructive/40 text-destructive"
                      : del.daysUntilDue !== null && del.daysUntilDue <= 3
                        ? "border-warning/40 text-warning"
                        : "border-border"
                  )}>
                    {overdue
                      ? `${Math.abs(del.daysUntilDue!)}d atrasado`
                      : del.daysUntilDue !== null
                        ? `${del.daysUntilDue}d restantes`
                        : "Sem prazo"}
                  </Badge>
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
