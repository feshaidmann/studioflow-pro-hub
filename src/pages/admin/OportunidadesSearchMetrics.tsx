import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  RefreshCw,
  Gauge,
  ChevronLeft,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";

interface DailyPoint {
  day: string;
  invoked: number;
  succeeded: number;
  failed: number;
  p50_ms: number;
  p95_ms: number;
  avg_ms: number;
  samples: number;
}

interface MetricsResponse {
  since: string;
  totals: { invoked: number; succeeded: number; failed: number; unique_users: number };
  perf: { p50_ms: number; p95_ms: number; p99_ms: number; avg_ms: number; samples: number } | null;
  daily: DailyPoint[];
  failure_causes: Array<{ cause: string; n: number }>;
  recent_errors: Array<{ created_at: string; message: string; details: Record<string, unknown> | null }>;
}

const PERIODS = [
  { days: 7, label: "7d" },
  { days: 14, label: "14d" },
  { days: 30, label: "30d" },
];

function StatCard({ label, value, sub, tone = "default" }: {
  label: string; value: React.ReactNode; sub?: string; tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass =
    tone === "success" ? "text-success" :
    tone === "warning" ? "text-warning" :
    tone === "danger"  ? "text-destructive" :
    "text-foreground";
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <p className={`text-2xl font-bold leading-none ${toneClass}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function OportunidadesSearchMetrics() {
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const [days, setDays] = useState(14);
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: rpc, error: err } = await supabase.rpc(
        "get_oportunidades_search_metrics" as never,
        { p_days: days } as never,
      );
      if (err) throw err;
      setData(rpc as unknown as MetricsResponse);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar métricas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAdmin) load(); /* eslint-disable-next-line */ }, [isAdmin, days]);

  if (adminLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-pulse text-muted-foreground">Verificando permissões…</div></div>;
  }
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const t = data?.totals;
  const perf = data?.perf;
  const errorRate = t && t.invoked > 0 ? Math.round((t.failed / t.invoked) * 1000) / 10 : 0;
  const successRate = t && t.invoked > 0 ? Math.round((t.succeeded / t.invoked) * 1000) / 10 : 0;

  const fmtMs = (ms: number | null | undefined) => ms == null ? "—" : ms >= 1000 ? `${(ms/1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
  const fmtDay = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  const dailyChart = (data?.daily ?? []).map(d => ({ ...d, label: fmtDay(d.day) }));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin" className="gap-1"><ChevronLeft className="h-4 w-4" /> Admin</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Oportunidades Search — Telemetria</h1>
            <p className="text-sm text-muted-foreground">Invocations, erros e duração da função <code className="text-xs">oportunidades-search</code>.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border overflow-hidden">
            {PERIODS.map(p => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${days === p.days ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Totais */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Totais ({days}d)</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Invocações" value={loading ? "…" : (t?.invoked ?? 0).toLocaleString("pt-BR")} sub={`${t?.unique_users ?? 0} usuários únicos`} />
          <StatCard label="Sucessos" value={loading ? "…" : (t?.succeeded ?? 0).toLocaleString("pt-BR")} sub={`${successRate}% das invocações`} tone="success" />
          <StatCard label="Falhas" value={loading ? "…" : (t?.failed ?? 0).toLocaleString("pt-BR")} sub={`${errorRate}% das invocações`} tone={errorRate > 5 ? "danger" : errorRate > 1 ? "warning" : "default"} />
          <StatCard label="Taxa de erro" value={loading ? "…" : `${errorRate}%`} sub="Failed / Invoked" tone={errorRate > 5 ? "danger" : errorRate > 1 ? "warning" : "success"} />
        </div>
      </section>

      {/* Performance */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Duração (latência ponta a ponta)</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="p50" value={loading ? "…" : fmtMs(perf?.p50_ms)} sub="Mediana" />
          <StatCard label="p95" value={loading ? "…" : fmtMs(perf?.p95_ms)} tone={perf && perf.p95_ms > 8000 ? "warning" : "default"} />
          <StatCard label="p99" value={loading ? "…" : fmtMs(perf?.p99_ms)} tone={perf && perf.p99_ms > 15000 ? "danger" : "default"} />
          <StatCard label="Média" value={loading ? "…" : fmtMs(perf?.avg_ms)} sub={`${perf?.samples ?? 0} amostras`} />
        </div>
      </section>

      {/* Daily timeline */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Invocações por dia</h2>
        </div>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            {dailyChart.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Sem invocações no período</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="succeeded" stackId="1" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.4)" name="Sucesso" />
                    <Area type="monotone" dataKey="failed" stackId="1" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.5)" name="Falhas" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* p95 timeline */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Duração por dia (ms)</h2>
        </div>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            {dailyChart.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Sem amostras de duração</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `${v} ms`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="p50_ms" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="p50" />
                    <Line type="monotone" dataKey="p95_ms" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} name="p95" />
                    <Line type="monotone" dataKey="avg_ms" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="4 4" dot={false} name="média" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Failure causes */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <XCircle className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Causas de falha</h2>
        </div>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            {(data?.failure_causes ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Sem falhas registradas no período 🎉</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.failure_causes ?? []} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <YAxis type="category" dataKey="cause" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={140} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="n" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Recent errors */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Erros recentes</h2>
        </div>
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            {(data?.recent_errors ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhum erro registrado</p>
            ) : (
              <div className="divide-y divide-border">
                {(data?.recent_errors ?? []).map((e, i) => {
                  const d = e.details || {};
                  const duration = typeof d.duration_ms === "number" ? `${d.duration_ms}ms` : null;
                  const runId = typeof d.run_id === "string" ? d.run_id.slice(0, 8) : null;
                  return (
                    <div key={i} className="p-3 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-muted-foreground">
                          {new Date(e.created_at).toLocaleString("pt-BR")}
                        </span>
                        {runId && <Badge variant="outline" className="text-[10px]">run {runId}</Badge>}
                        {duration && <Badge variant="outline" className="text-[10px]">{duration}</Badge>}
                      </div>
                      <p className="mt-1 text-foreground">{e.message}</p>
                      {Object.keys(d).length > 0 && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">detalhes</summary>
                          <pre className="mt-1 p-2 bg-muted rounded text-[10px] overflow-x-auto">{JSON.stringify(d, null, 2)}</pre>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
