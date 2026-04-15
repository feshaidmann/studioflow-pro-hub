import { useMemo } from "react";
import { Trophy, TrendingUp, FileText, Award, ThumbsDown, Clock, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { type EditalApplication, RESULTADO_LABELS, RESULTADO_COLORS, APPLICATION_STATUS_LABELS, type ResultadoType } from "@/hooks/useEditalApplications";

interface Props {
  applications: EditalApplication[];
}

export default function EditalMetricsDashboard({ applications }: Props) {
  const metrics = useMemo(() => {
    const total = applications.length;
    const byStatus = {
      interesse: applications.filter(a => a.status === "interesse").length,
      preparando: applications.filter(a => a.status === "preparando").length,
      inscrito: applications.filter(a => a.status === "inscrito").length,
      resultado: applications.filter(a => a.status === "resultado").length,
    };
    const withResult = applications.filter(a => a.resultado);
    const aprovados = withResult.filter(a => a.resultado === "aprovado");
    const reprovados = withResult.filter(a => a.resultado === "reprovado");
    const listaEspera = withResult.filter(a => a.resultado === "lista_espera");
    const desistencias = withResult.filter(a => a.resultado === "desistencia");

    const totalAprovado = aprovados.reduce((sum, a) => sum + (a.valor_aprovado || 0), 0);
    const taxaAprovacao = withResult.length > 0
      ? Math.round((aprovados.length / withResult.length) * 100)
      : 0;

    const recentLessons = withResult
      .filter(a => a.licoes_aprendidas)
      .sort((a, b) => (b.data_resultado || b.updated_at).localeCompare(a.data_resultado || a.updated_at))
      .slice(0, 5);

    return {
      total, byStatus, aprovados, reprovados, listaEspera, desistencias,
      totalAprovado, taxaAprovacao, withResult, recentLessons,
    };
  }, [applications]);

  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Inicie candidaturas para ver métricas aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{metrics.total}</p>
            <p className="text-xs text-muted-foreground">Total candidaturas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="h-5 w-5 mx-auto text-green-600 mb-1" />
            <p className="text-2xl font-bold text-green-700">{metrics.aprovados.length}</p>
            <p className="text-xs text-muted-foreground">Aprovadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{metrics.taxaAprovacao}%</p>
            <p className="text-xs text-muted-foreground">Taxa de aprovação</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-5 w-5 mx-auto text-amber-600 mb-1" />
            <p className="text-2xl font-bold">
              {metrics.totalAprovado.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground">Total captado</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline funnel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pipeline de candidaturas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(["interesse", "preparando", "inscrito", "resultado"] as const).map((status) => {
            const count = metrics.byStatus[status];
            const pct = metrics.total > 0 ? (count / metrics.total) * 100 : 0;
            return (
              <div key={status} className="flex items-center gap-3">
                <span className="text-xs w-20 text-right text-muted-foreground">{APPLICATION_STATUS_LABELS[status]}</span>
                <Progress value={pct} className="flex-1 h-2" />
                <span className="text-xs font-medium w-8">{count}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Results breakdown */}
      {metrics.withResult.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Resultados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(["aprovado", "reprovado", "lista_espera", "desistencia"] as ResultadoType[]).map((r) => {
                const count = metrics.withResult.filter(a => a.resultado === r).length;
                if (count === 0) return null;
                return (
                  <Badge key={r} variant="outline" className={RESULTADO_COLORS[r]}>
                    {RESULTADO_LABELS[r]}: {count}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent lessons */}
      {metrics.recentLessons.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Lições aprendidas recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.recentLessons.map((app) => (
              <div key={app.id} className="border-l-2 border-primary/30 pl-3">
                <p className="text-xs font-medium line-clamp-1">{app.edital?.titulo || "Edital"}</p>
                {app.resultado && (
                  <Badge variant="outline" className={`text-[10px] mt-0.5 ${RESULTADO_COLORS[app.resultado]}`}>
                    {RESULTADO_LABELS[app.resultado]}
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground mt-1">{app.licoes_aprendidas}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
