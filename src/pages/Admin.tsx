import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Shield,
  Users,
  FolderKanban,
  DollarSign,
  RefreshCw,
  Bot,
  Activity,
  AlertTriangle,
  TrendingUp,
  FileWarning,
  Filter,
  ChevronDown,
  LogIn,
  MessageSquarePlus,
  Star,
  Rocket,
  Clock,
  BarChart3,
  UserX,
  Layers,
  Gauge,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  AreaChart,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";

interface PlatformStats {
  totalUsers: number;
  totalProjects: number;
  totalTasks: number;
  totalTransactions: number;
  totalProfessionals: number;
  totalGlobalProfessionals: number;
  globalPercent: number;
  totalProjectMembers: number;
  totalNotifications: number;
}

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  display_name: string;
  user_type: string;
  plan: string;
  is_admin: boolean;
}

interface DayActivity {
  date: string;
  tarefas: number;
  projetos: number;
  transacoes: number;
  notificacoes: number;
}

interface InfraCost {
  name: string;
  value: number;
  currency: string;
  note: string;
}

interface Product {
  name: string;
  count: number;
  price: number;
}

interface FunctionLog {
  id: string;
  created_at: string;
  function_name: string;
  level: string;
  message: string;
  details: Record<string, unknown> | null;
}

interface AdminStatsResponse {
  platform: PlatformStats;
  engagement: {
    loginsLast7Days: number;
    activeUsersLast7Days: number;
    retentionRate: number;
  };
  adoption: {
    onboardingRate: number;
    onboardedUsers: number;
    basicModeUsers: number;
    advancedModeUsers: number;
    projectsCreatedTotal: number;
    projectsLaunched: number;
    launchRate: number;
    medianTimeToFirstProject: number | null;
    medianTimeToFirstTask: number | null;
    stuckUsersCount: number;
    usersWithoutProject: number;
    featureRanking: Array<{ name: string; count: number }>;
    screenDropoff: Array<{ path: string; views: number; avgDuration: number; bounceRate: number }>;
  };
  users: UserRow[];
  planCounts: Record<string, number>;
  products: Product[];
  estimatedMonthlyRevenue: number;
  infraCosts: InfraCost[];
  edgeFunctions: string[];
  aiUsage: {
    aiTasksToday: number;
    aiTasksThisWeek: number;
    aiCalls30d: number;
    aiCallsTotal: number;
    aiRealCostToday: number;
    aiRealCost7d: number;
    aiRealCost30d: number;
    aiRealCostTotal: number;
    fnBreakdown: Record<string, { calls: number; cost: number }>;
    aiCostTimeline: Array<{ date: string; calls: number; cost: number }>;
  };
  activityTimeline: DayActivity[];
  functionLogs: FunctionLog[];
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4 flex items-start gap-3">
        <Icon className={`h-8 w-8 shrink-0 mt-0.5 ${color}`} />
        <div>
          <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function SectionTitle({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{label}</h2>
      </div>
      {children}
    </div>
  );
}

export default function Admin() {
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("admin-stats");
      if (fnError) throw fnError;
      setStats(data as AdminStatsResponse);
      setLastRefresh(new Date());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchStats();
  }, [isAdmin]);

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Verificando permissões...</div>
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const p = stats?.platform;
  const ai = stats?.aiUsage;
  const ad = stats?.adoption;

  const fmtUsd = (v: number) => (v < 0.001 ? `$${v.toFixed(6)}` : `$${v.toFixed(4)}`);
  const fmtHours = (h: number | null | undefined) => {
    if (h == null) return "—";
    if (h < 1) return `${Math.round(h * 60)}min`;
    if (h < 24) return `${h.toFixed(1)}h`;
    return `${(h / 24).toFixed(1)}d`;
  };

  const FEATURE_LABELS: Record<string, string> = {
    geral: "Geral", mix: "Mix", financeiro: "Financeiro", chat: "Chat",
    arquivos: "Arquivos", dna_musical: "DNA Musical", mix_tracks: "Tracks/Mix",
    gravacao: "Gravação", master: "Master", lancamento: "Lançamento",
    equipe: "Equipe", agenda: "Agenda",
  };

  const Spinner = () => <span className="animate-pulse text-muted-foreground">…</span>;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-10 pb-12">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground">
              Atualizado em {lastRefresh.toLocaleTimeString("pt-BR")}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Saúde Geral ── */}
      <section>
        <SectionTitle icon={Activity} label="Saúde Geral" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Usuários cadastrados"
            value={loading ? <Spinner /> : p?.totalUsers ?? 0}
            icon={Users}
            color="text-primary"
            sub="Exclui admins"
          />
          <StatCard
            label="Projetos criados"
            value={loading ? <Spinner /> : p?.totalProjects ?? 0}
            icon={FolderKanban}
            color="text-blue-400"
          />
          <StatCard
            label="Logins (7 dias)"
            value={loading ? <Spinner /> : stats?.engagement?.loginsLast7Days ?? 0}
            icon={LogIn}
            color="text-warning"
            sub="Usuários que fizeram login recentemente"
          />
          <Card className="border-border bg-card">
            <CardContent className="p-4 flex items-start gap-3">
              <TrendingUp className="h-8 w-8 shrink-0 mt-0.5 text-success" />
              <div>
                <p className="text-2xl font-bold text-foreground leading-none">
                  {loading ? <Spinner /> : `${stats?.engagement?.retentionRate ?? 0}%`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Retenção semanal</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {loading
                    ? "—"
                    : `${stats?.engagement?.activeUsersLast7Days ?? 0} de ${p?.totalUsers ?? 0} ativos`}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Aderência & Ativação ── */}
      <section>
        <SectionTitle icon={Gauge} label="Aderência & Ativação de Produto" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatCard
            label="Onboarding completo"
            value={loading ? <Spinner /> : `${ad?.onboardingRate ?? 0}%`}
            icon={Rocket}
            color="text-success"
            sub={loading ? "" : `${ad?.onboardedUsers ?? 0} de ${p?.totalUsers ?? 0}`}
          />
          <StatCard
            label="Tempo até 1º projeto"
            value={loading ? <Spinner /> : fmtHours(ad?.medianTimeToFirstProject)}
            icon={Clock}
            color="text-primary"
            sub="Mediana"
          />
          <StatCard
            label="Tempo até 1ª tarefa"
            value={loading ? <Spinner /> : fmtHours(ad?.medianTimeToFirstTask)}
            icon={Clock}
            color="text-blue-400"
            sub="Mediana (manuais)"
          />
          <StatCard
            label="Taxa de lançamento"
            value={loading ? <Spinner /> : `${ad?.launchRate ?? 0}%`}
            icon={Rocket}
            color="text-primary"
            sub={loading ? "" : `${ad?.projectsLaunched ?? 0} de ${ad?.projectsCreatedTotal ?? 0}`}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatCard
            label="Modo Simples"
            value={loading ? <Spinner /> : ad?.basicModeUsers ?? 0}
            icon={Layers}
            color="text-muted-foreground"
            sub="Usuários"
          />
          <StatCard
            label="Modo Avançado"
            value={loading ? <Spinner /> : ad?.advancedModeUsers ?? 0}
            icon={Layers}
            color="text-primary"
            sub="Usuários"
          />
          <StatCard
            label="Sem projeto criado"
            value={loading ? <Spinner /> : ad?.usersWithoutProject ?? 0}
            icon={UserX}
            color="text-destructive"
            sub="Nunca criaram projeto"
          />
          <StatCard
            label="Sem progresso"
            value={loading ? <Spinner /> : ad?.stuckUsersCount ?? 0}
            icon={AlertTriangle}
            color="text-warning"
            sub="Projeto ativo parado em rascunho"
          />
        </div>

        {/* Feature ranking */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Features mais usadas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-3">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-6 rounded bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {(ad?.featureRanking ?? []).map((f, i) => {
                  const maxCount = (ad?.featureRanking ?? [])[0]?.count || 1;
                  const pct = Math.round((f.count / maxCount) * 100);
                  return (
                    <div key={f.name} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium text-foreground">
                            {FEATURE_LABELS[f.name] ?? f.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{f.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(ad?.featureRanking ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Sem dados suficientes</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>


      <section>
        <SectionTitle icon={DollarSign} label="Receita" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border-success/20 bg-success/5">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-success/80 font-medium uppercase tracking-wide">
                Receita Mensal Estimada
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-3xl font-bold text-success">
                {loading ? <Spinner /> : `R$ ${(stats?.estimatedMonthlyRevenue ?? 0).toFixed(2)}`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Baseado em assinaturas Pro ativas</p>
            </CardContent>
          </Card>

          {loading
            ? [1, 2].map((i) => (
                <Card key={i} className="border-border bg-card">
                  <CardContent className="p-4 space-y-2">
                    <div className="h-5 w-24 rounded bg-muted animate-pulse" />
                    <div className="h-8 w-16 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                  </CardContent>
                </Card>
              ))
            : (stats?.products ?? []).map((prod) => (
                <Card key={prod.name} className="border-border bg-card">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      {prod.name}
                    </p>
                    <p className="text-2xl font-bold text-foreground">{prod.count}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {prod.price > 0
                        ? `R$ ${prod.price.toFixed(2)}/mês · Total: R$ ${(prod.price * prod.count).toFixed(2)}`
                        : "Gratuito"}
                    </p>
                  </CardContent>
                </Card>
              ))}
        </div>
      </section>

      {/* ── IA & Custos ── */}
      <section>
        <SectionTitle icon={Bot} label="IA & Custos" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <Card className="border-border bg-card">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5" />
                Últimos 30 dias
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-foreground">
                {loading ? <Spinner /> : ai?.aiCalls30d ?? 0}
                <span className="text-sm font-normal text-muted-foreground ml-1">chamadas</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {loading ? "…" : fmtUsd(ai?.aiRealCost30d ?? 0)} USD rastreado
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-primary/80 font-medium uppercase tracking-wide">
                Total acumulado
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-primary">
                {loading ? <Spinner /> : ai?.aiCallsTotal ?? 0}
                <span className="text-sm font-normal text-muted-foreground ml-1">chamadas</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {loading ? "…" : fmtUsd(ai?.aiRealCostTotal ?? 0)} USD total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* AI cost line chart */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-0 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Custo por dia — últimos 30 dias
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4 pt-3">
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground text-sm">Carregando gráfico…</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={ai?.aiCostTimeline ?? []} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 16%)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(260 10% 55%)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => {
                      const d = new Date(v + "T12:00:00");
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(260 10% 55%)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) =>
                      v === 0 ? "$0" : v < 0.001 ? `$${v.toFixed(5)}` : `$${v.toFixed(4)}`
                    }
                    width={64}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(260 15% 8%)",
                      border: "1px solid hsl(260 15% 16%)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(v: string) =>
                      new Date(v + "T12:00:00").toLocaleDateString("pt-BR")
                    }
                    formatter={(value: number, name: string) => [
                      name === "cost"
                        ? value === 0
                          ? "$0"
                          : `$${value.toFixed(6)}`
                        : value,
                      name === "cost" ? "Custo USD" : "Chamadas",
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                    formatter={(value) => (value === "cost" ? "Custo USD" : "Chamadas")}
                  />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="hsl(263 70% 60%)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="calls"
                    stroke="hsl(38 92% 50%)"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="4 2"
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Atividade ── */}
      <section>
        <SectionTitle icon={TrendingUp} label="Atividade da Plataforma — Últimos 30 dias" />
        <Card className="border-border bg-card">
          <CardContent className="px-2 pb-4 pt-4">
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground text-sm">Carregando gráfico…</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart
                  data={stats?.activityTimeline ?? []}
                  margin={{ top: 8, right: 16, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradTarefas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(263 70% 50%)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(263 70% 50%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradProjetos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(213 77% 60%)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(213 77% 60%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradTransacoes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 15% 16%)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(260 10% 55%)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => {
                      const d = new Date(v + "T12:00:00");
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(260 10% 55%)" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(260 15% 8%)",
                      border: "1px solid hsl(260 15% 16%)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(v: string) =>
                      new Date(v + "T12:00:00").toLocaleDateString("pt-BR")
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
                  <Area
                    type="monotone"
                    dataKey="tarefas"
                    stroke="hsl(263 70% 50%)"
                    strokeWidth={2}
                    fill="url(#gradTarefas)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="projetos"
                    stroke="hsl(213 77% 60%)"
                    strokeWidth={2}
                    fill="url(#gradProjetos)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="transacoes"
                    stroke="hsl(142 71% 45%)"
                    strokeWidth={2}
                    fill="url(#gradTransacoes)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Usuários ── */}
      <section>
        <SectionTitle icon={Users} label="Usuários Cadastrados" />
        <Card className="border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((__, j) => (
                          <TableCell key={j}>
                            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : (stats?.users ?? []).map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium text-foreground text-sm">{u.email}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.display_name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-pink-400 border-pink-400/30 bg-pink-400/10 text-xs"
                          >
                            Artista
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.plan === "pro" ? "default" : "secondary"} className="text-xs">
                            {u.plan === "pro" ? "Pro" : "Free"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* ── Feedback Beta ── */}
      <BetaFeedbackSection />

      {/* ── Logs ── */}
      <FunctionLogsSection logs={stats?.functionLogs ?? []} loading={loading} />
    </div>
  );
}

/* ── Beta Feedback Section ── */
const CATEGORY_LABELS: Record<string, string> = {
  bug: "🐛 Bug",
  sugestao: "💡 Sugestão",
  elogio: "🎉 Elogio",
  duvida: "❓ Dúvida",
  geral: "💬 Geral",
};

interface FeedbackRow {
  id: string;
  user_id: string;
  category: string;
  message: string;
  rating: number | null;
  page: string;
  created_at: string;
}

function BetaFeedbackSection() {
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("beta_feedback" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setFeedbacks((data as FeedbackRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <section className="pb-8">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Feedbacks Beta
        </h2>
        {!loading && (
          <span className="text-xs text-muted-foreground">({feedbacks.length})</span>
        )}
      </div>
      <Card className="border-border">
        {loading ? (
          <CardContent className="p-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 rounded bg-muted animate-pulse" />
            ))}
          </CardContent>
        ) : feedbacks.length === 0 ? (
          <CardContent className="p-8 flex flex-col items-center gap-2 text-muted-foreground">
            <MessageSquarePlus className="h-8 w-8 opacity-30" />
            <p className="text-sm">Nenhum feedback recebido ainda</p>
          </CardContent>
        ) : (
          <CardContent className="p-0 divide-y divide-border">
            {feedbacks.map((fb) => (
              <div key={fb.id} className="px-4 py-3 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-foreground">
                    {CATEGORY_LABELS[fb.category] ?? fb.category}
                  </span>
                  {fb.rating && (
                    <span className="flex items-center gap-0.5 text-xs text-[hsl(var(--warning))]">
                      {Array.from({ length: fb.rating }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-current" />
                      ))}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {fb.page || "/"} · {new Date(fb.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 leading-snug">{fb.message}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{fb.user_id}</p>
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </section>
  );
}

/* ── Function Logs ── */
const LEVEL_STYLES: Record<string, string> = {
  error: "bg-destructive/10 text-destructive border-destructive/20",
  warn: "bg-warning/10 text-warning border-warning/20",
  info: "bg-primary/10 text-primary border-primary/20",
};

function FunctionLogsSection({ logs, loading }: { logs: FunctionLog[]; loading: boolean }) {
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const fnNames = ["all", ...Array.from(new Set(logs.map((l) => l.function_name)))];
  const visible = filter === "all" ? logs : logs.filter((l) => l.function_name === filter);
  const errorCount = logs.filter((l) => l.level === "error").length;

  return (
    <section className="pb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileWarning className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Logs de Funções
          </h2>
          {!loading && errorCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {errorCount} erros
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-xs bg-card border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {fnNames.map((n) => (
              <option key={n} value={n}>
                {n === "all" ? "Todas as funções" : n}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Card className="border-border">
        {loading ? (
          <CardContent className="p-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-muted animate-pulse" />
            ))}
          </CardContent>
        ) : visible.length === 0 ? (
          <CardContent className="p-8 flex flex-col items-center gap-2 text-muted-foreground">
            <FileWarning className="h-8 w-8 opacity-30" />
            <p className="text-sm">Nenhum log registrado</p>
          </CardContent>
        ) : (
          <CardContent className="p-0 divide-y divide-border">
            {visible.map((log) => (
              <div key={log.id} className="px-4 py-3">
                <div
                  className="flex items-start gap-3 cursor-pointer select-none"
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                >
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 mt-0.5 ${LEVEL_STYLES[log.level] ?? LEVEL_STYLES.info}`}
                  >
                    {log.level.toUpperCase()}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                        {log.function_name}
                      </code>
                      <span className="text-xs text-foreground truncate">{log.message}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform mt-0.5 ${
                      expanded === log.id ? "rotate-180" : ""
                    }`}
                  />
                </div>
                {expanded === log.id && log.details && (
                  <pre className="mt-2 text-[10px] bg-muted rounded p-3 overflow-auto max-h-40 text-muted-foreground">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </section>
  );
}
