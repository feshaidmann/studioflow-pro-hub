import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, AlertCircle, Info, Clock, DollarSign, Mail, Rocket, CalendarClock, ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { ProjectAlert, AlertSeverity, AlertCategory } from "@/hooks/useProjectAlerts";

const SEV_STYLE: Record<AlertSeverity, { border: string; bg: string; icon: React.ElementType; iconColor: string }> = {
  critical: { border: "border-destructive/40", bg: "bg-destructive/5", icon: AlertTriangle, iconColor: "text-destructive" },
  warning: { border: "border-amber-400/40", bg: "bg-amber-400/5", icon: AlertCircle, iconColor: "text-amber-400" },
  info: { border: "border-primary/30", bg: "bg-primary/5", icon: Info, iconColor: "text-primary" },
};

const CAT_ICON: Record<AlertCategory, React.ElementType> = {
  stalled: Clock,
  budget: DollarSign,
  invite: Mail,
  team: Mail,
  release: Rocket,
  deadline: CalendarClock,
};

// Map alert category to a target tab in project detail
const CAT_TAB: Record<AlertCategory, string> = {
  stalled: "visao-geral",
  budget: "financeiro",
  invite: "equipe",
  team: "equipe",
  release: "lancamento",
  deadline: "tarefas",
};

interface ProjectAlertsCardProps {
  alerts: ProjectAlert[];
  hidden?: boolean;
}

export default function ProjectAlertsCard({ alerts, hidden }: ProjectAlertsCardProps) {
  const navigate = useNavigate();

  if (alerts.length === 0 || hidden) return null;

  // Show max 6 alerts
  const visible = alerts.slice(0, 6);

  return (
    <Card className="glass-card animate-fade-in border-amber-400/20" style={{ animationDelay: "50ms" }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          Atenção Necessária
          <Badge variant="secondary" className="text-[10px]">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {visible.map((alert) => {
          const sev = SEV_STYLE[alert.severity];
          const SevIcon = sev.icon;
          const CatIcon = CAT_ICON[alert.category] ?? AlertCircle;
          return (
            <div
              key={alert.id}
              className={cn(
                "flex items-start gap-2.5 rounded-lg px-3 py-2 border cursor-pointer hover:-translate-y-0.5 transition-all duration-200",
                sev.border, sev.bg,
              )}
              onClick={() => navigate(`/projects/${alert.projectId}`)}
            >
              <SevIcon className={cn("h-4 w-4 shrink-0 mt-0.5", sev.iconColor)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-semibold">{alert.title}</span>
                  <CatIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">{alert.description}</p>
              </div>
              <Badge variant="outline" className="text-[9px] shrink-0 mt-0.5">{alert.projectName}</Badge>
            </div>
          );
        })}
        {alerts.length > 6 && (
          <p className="text-[10px] text-muted-foreground text-center pt-1">
            +{alerts.length - 6} alerta{alerts.length - 6 > 1 ? "s" : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
