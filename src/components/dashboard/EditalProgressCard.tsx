import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Clock, Award, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEditalApplications, APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS, type ApplicationStatus } from "@/hooks/useEditalApplications";

export default function EditalProgressCard({ hidden }: { hidden?: boolean }) {
  const navigate = useNavigate();
  const { data: applications = [], isLoading } = useEditalApplications();

  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    (["interesse", "preparando", "inscrito", "resultado"] as const).forEach((s) => {
      byStatus[s] = applications.filter((a) => a.status === s).length;
    });

    const aprovados = applications.filter((a) => a.resultado === "aprovado").length;

    // Find nearest deadline
    const now = new Date();
    let nearestDeadline: { titulo: string; prazo: string; daysLeft: number } | null = null;
    for (const app of applications) {
      if (app.status === "resultado") continue;
      const prazo = app.edital?.prazo;
      if (!prazo) continue;
      const d = new Date(prazo + "T23:59:59");
      const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && (!nearestDeadline || diff < nearestDeadline.daysLeft)) {
        nearestDeadline = { titulo: app.edital?.titulo || "Edital", prazo, daysLeft: diff };
      }
    }

    return { byStatus, aprovados, nearestDeadline, total: applications.length };
  }, [applications]);

  if (hidden || isLoading || stats.total === 0) return null;

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-primary" />
          Editais em andamento
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2.5">
        {/* Status chips */}
        <div className="flex flex-wrap gap-1.5">
          {(["interesse", "preparando", "inscrito", "resultado"] as ApplicationStatus[]).map((s) => {
            const count = stats.byStatus[s] || 0;
            if (count === 0) return null;
            return (
              <Badge key={s} variant="outline" className={APPLICATION_STATUS_COLORS[s] + " text-[10px]"}>
                {APPLICATION_STATUS_LABELS[s]}: {count}
              </Badge>
            );
          })}
          {stats.aprovados > 0 && (
            <Badge variant="outline" className="bg-green-500/15 text-green-700 border-green-200 text-[10px]">
              <Award className="h-3 w-3 mr-0.5" />
              {stats.aprovados} aprovado{stats.aprovados > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Nearest deadline */}
        {stats.nearestDeadline && (
          <div className={`flex items-center gap-2 text-xs rounded-md px-2.5 py-1.5 ${
            stats.nearestDeadline.daysLeft <= 3
              ? "bg-destructive/10 text-destructive"
              : stats.nearestDeadline.daysLeft <= 7
              ? "bg-warning/10 text-warning"
              : "bg-muted text-muted-foreground"
          }`}>
            <Clock className="h-3 w-3 shrink-0" />
            <span className="truncate flex-1">
              {stats.nearestDeadline.daysLeft === 0
                ? "Vence hoje"
                : stats.nearestDeadline.daysLeft === 1
                ? "Vence amanhã"
                : `${stats.nearestDeadline.daysLeft} dias`}
              {" · "}
              <span className="font-medium">{stats.nearestDeadline.titulo}</span>
            </span>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-primary w-full justify-center"
          onClick={() => navigate("/editais")}
        >
          Ver pipeline completo
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
