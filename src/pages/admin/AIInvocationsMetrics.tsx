import { useEffect, useState, useMemo } from "react";
import { Navigate, Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";

type SeriesPoint = { bucket: string; success: number; errors: number; total: number };
type TopUser = { user_id: string; display_name: string | null; total: number; success: number; errors: number; last_seen: string; cost_usd: number };
type TopFunction = { function_name: string; total: number; unique_users: number; errors: number; cost_usd: number };

interface MetricsResponse {
  since: string;
  bucket: "hour" | "day";
  totals: { total: number; success: number; errors: number; unique_users: number; total_cost_usd: number; tokens_input: number; tokens_output: number };
  series: SeriesPoint[];
  top_users: TopUser[];
  top_functions: TopFunction[];
}

type RecentEvent = {
  id: string;
  created_at: string;
  function_name: string;
  user_id: string | null;
  model: string;
  status: string;
  cost_usd: number;
};

const PERIODS = [
  { hours: 24, label: "24h" },
  { hours: 168, label: "7d" },
  { hours: 720, label: "30d" },
];

const KNOWN_FUNCTIONS = [
  "music-dna-analyze",
  "ai-task-assistant",
  "project-ai-assistant",
  "generate-daily-tasks",
  "edital-ai-assistant",
  "match-editais",
  "extract-edital-fields",
  "oportunidades-search",
  "suggest-visual-direction",
  "generate-visual-direction",
  "enrich-neighbor-context",
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

export default function AIInvocationsMetrics() {
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const [hours, setHours] = useState(168);
  const [fnName, setFnName] = useState<string>("music-dna-analyze");
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [recent, setRecent] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: rpc, error: err }, recentRes] = await Promise.all([
        supabase.rpc("get_ai_invocations_metrics" as never, {
          p_hours: hours,
          p_function_name: fnName || null,
        } as never),
        (async () => {
          let q = supabase
            .from("ai_invocations")
            .select("id,created_at,function_name,user_id,model,status,cost_usd")
            .order("created_at", { ascending: false })
            .limit(50);
          if (fnName) q = q.eq("function_name", fnName);
          return q;
        })(),
      ]);
      if (err) throw err;
      if (recentRes.error) throw recentRes.error;
      setData(rpc as unknown as MetricsResponse);
      setRecent((recentRes.data ?? []) as RecentEvent[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar métricas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAdmin) load(); /* eslint-disable-next-line */ }, [isAdmin, hours, fnName]);

  const seriesChart = useMemo(() => {
    if (!data?.series) return [];
    const isHour = data.bucket === "hour";
    return data.series.map(p => ({
      ...p,
      label: isHour
        ? new Date(p.bucket).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit" })
        : new Date(p.bucket).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    }));
  }, [data]);

  if (adminLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-pulse text-muted-foreground">Verificando permissões…</div></div>;
  }
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const t = data?.totals;
  const errorRate = t && t.total > 0 ? Math.round((t.errors / t.total) * 1000) / 10 : 0;
  const peak = seriesChart.reduce((m, p) => p.total > m ? p.total : m, 0);

  const fmtTs = (s: string) => new Date(s).toLocaleString("pt-BR");
  const shortId = (id: string | null) => id ? id.slice(0, 8) : "—";

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin" className="gap-1"><ChevronLeft className="h-4 w-4" /> Admin</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">IA · Invocações</h1>
            <p className="text-sm text-muted-foreground">Gargalos e picos por função/usuário em <code className="text-xs">ai_invocations</code>.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={fnName}
            onChange={(e) => setFnName(e.target.value)}
            className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground"
          >
            <option value="">Todas as funções</option>
            {KNOWN_FUNCTIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <div className="flex rounded-md border border-border overflow-hidden">
            {PERIODS.map(p => (
              <button
                key={p.hours}
                onClick={() => setHours(p.hours)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${hours === p.hours ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
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

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Totais</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Invocações" value={loading ? "…" : (t?.total ?? 0).toLocaleString("pt-BR")} sub={`pico: ${peak.toLocaleString("pt-BR")} por ${data?.bucket === "hour" ? "hora" : "dia"}`} />
          <StatCard label="Usuários únicos" value={loading ? "…" : (t?.unique_users ?? 0).toLocaleString("pt-BR")} />
          <StatCard label="Taxa de erro" value={loading ? "…" : `${errorRate}%`} sub={`${t?.errors ?? 0} falhas`} tone={errorRate > 5 ? "danger" : errorRate > 1 ? "warning" : "success"} />
          <StatCard label="Custo estimado" value={loading ? "…" : `US$ ${(t?.total_cost_usd ?? 0).toFixed(2)}`} sub={`${(t?.tokens_input ?? 0).toLocaleString("pt-BR")} in / ${(t?.tokens_output ?? 0).toLocaleString("pt-BR")} out`} />
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Invocações por {data?.bucket === "hour" ? "hora" : "dia"}
          </h2>
        </div>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            {seriesChart.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Sem invocações no período</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={seriesChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="success" stackId="1" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.4)" name="Sucesso" />
                    <Area type="monotone" dataKey="errors" stackId="1" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.5)" name="Erros" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Top usuários</h2>
        </div>
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            {(data?.top_users ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Sem dados de uso por usuário</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Usuário</th>
                      <th className="text-right px-3 py-2 font-medium">Total</th>
                      <th className="text-right px-3 py-2 font-medium">Sucesso</th>
                      <th className="text-right px-3 py-2 font-medium">Erros</th>
                      <th className="text-right px-3 py-2 font-medium">Custo</th>
                      <th className="text-right px-3 py-2 font-medium">Último uso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data!.top_users.map(u => (
                      <tr key={u.user_id} className="hover:bg-muted/30">
                        <td className="px-3 py-2">
                          <div className="font-medium text-foreground">{u.display_name || "—"}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{shortId(u.user_id)}</div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{u.total}</td>
                        <td className="px-3 py-2 text-right font-mono text-success">{u.success}</td>
                        <td className={`px-3 py-2 text-right font-mono ${u.errors > 0 ? "text-destructive" : ""}`}>{u.errors}</td>
                        <td className="px-3 py-2 text-right font-mono">US$ {Number(u.cost_usd).toFixed(3)}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{fmtTs(u.last_seen)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {!fnName && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Top funções</h2>
          </div>
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              {(data?.top_functions ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Sem dados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Função</th>
                        <th className="text-right px-3 py-2 font-medium">Total</th>
                        <th className="text-right px-3 py-2 font-medium">Usuários</th>
                        <th className="text-right px-3 py-2 font-medium">Erros</th>
                        <th className="text-right px-3 py-2 font-medium">Taxa erro</th>
                        <th className="text-right px-3 py-2 font-medium">Custo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data!.top_functions.map(f => {
                        const rate = f.total > 0 ? Math.round((f.errors / f.total) * 1000) / 10 : 0;
                        return (
                          <tr key={f.function_name} className="hover:bg-muted/30">
                            <td className="px-3 py-2">
                              <button onClick={() => setFnName(f.function_name)} className="font-mono text-foreground hover:text-primary">
                                {f.function_name}
                              </button>
                            </td>
                            <td className="px-3 py-2 text-right font-mono">{f.total}</td>
                            <td className="px-3 py-2 text-right font-mono">{f.unique_users}</td>
                            <td className={`px-3 py-2 text-right font-mono ${f.errors > 0 ? "text-destructive" : ""}`}>{f.errors}</td>
                            <td className={`px-3 py-2 text-right font-mono ${rate > 5 ? "text-destructive" : rate > 1 ? "text-warning" : ""}`}>{rate}%</td>
                            <td className="px-3 py-2 text-right font-mono">US$ {Number(f.cost_usd).toFixed(3)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Últimos 50 eventos</h2>
        </div>
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Sem eventos</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Quando</th>
                      <th className="text-left px-3 py-2 font-medium">Função</th>
                      <th className="text-left px-3 py-2 font-medium">Usuário</th>
                      <th className="text-left px-3 py-2 font-medium">Modelo</th>
                      <th className="text-left px-3 py-2 font-medium">Status</th>
                      <th className="text-right px-3 py-2 font-medium">Custo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recent.map(ev => (
                      <tr key={ev.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">{fmtTs(ev.created_at)}</td>
                        <td className="px-3 py-2 font-mono">{ev.function_name}</td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">{shortId(ev.user_id)}</td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">{ev.model || "—"}</td>
                        <td className="px-3 py-2">
                          <Badge variant={ev.status === "success" ? "outline" : "destructive"} className="text-[10px]">
                            {ev.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">US$ {Number(ev.cost_usd).toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
