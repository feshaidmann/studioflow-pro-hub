import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: { user: __authUser }, error: claimsError } = await anonClient.auth.getUser(token);
  if (claimsError || !__authUser) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  const userId = __authUser.id;

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verify admin role
  const { data: roleData } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
  }

  // --- Get all admin user IDs to exclude ---
  const { data: adminRoles } = await adminClient
    .from("user_roles")
    .select("user_id, role")
    .eq("role", "admin");
  const adminIds = new Set((adminRoles ?? []).map((r: { user_id: string }) => r.user_id));

  // --- Auth users list ---
  const { data: authUsersData } = await adminClient.auth.admin.listUsers();
  const authUsers = authUsersData?.users ?? [];

  // Non-admin user IDs
  const nonAdminIds = authUsers.filter((u) => !adminIds.has(u.id)).map((u) => u.id);
  const safeIds = nonAdminIds.length > 0 ? nonAdminIds : ["00000000-0000-0000-0000-000000000000"];

  // --- Profiles (non-admin only) ---
  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, display_name, plan, created_at, onboarding_completed, track_view_mode")
    .in("id", safeIds);

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  const totalUsers = nonAdminIds.length;

  // --- Plan breakdown (non-admin) ---
  const planCounts: Record<string, number> = {};
  for (const p of profiles ?? []) {
    const plan = (p as any).plan ?? "free";
    planCounts[plan] = (planCounts[plan] ?? 0) + 1;
  }

  // --- Counts shown on UI ---
  const [
    { count: totalProjects },
    { count: totalTransactions },
  ] = await Promise.all([
    adminClient.from("projects").select("*", { count: "exact", head: true }),
    adminClient.from("transactions").select("*", { count: "exact", head: true }),
  ]);

  // --- AI Invocations (consolidated: 30d + total) ---
  const now = new Date();
  const thirtyDaysAgoIso = new Date(now.getTime() - 30 * 86400000).toISOString();

  const [
    { data: aiInvocations30d },
    { data: aiInvocationsAll },
  ] = await Promise.all([
    adminClient
      .from("ai_invocations")
      .select("cost_usd, status, created_at")
      .gte("created_at", thirtyDaysAgoIso)
      .order("created_at", { ascending: false }),
    adminClient.from("ai_invocations").select("cost_usd, status"),
  ]);

  const sumCost = (rows: any[]) => (rows ?? []).reduce((s: number, r: any) => s + Number(r.cost_usd ?? 0), 0);
  const countSuccess = (rows: any[]) => (rows ?? []).filter((r: any) => r.status === "success").length;

  const aiRealCost30d = sumCost(aiInvocations30d ?? []);
  const aiCalls30d = countSuccess(aiInvocations30d ?? []);
  const aiCallsTotal = countSuccess(aiInvocationsAll ?? []);

  // Daily AI cost timeline (last 30 days)
  const aiDayMap: Record<string, { date: string; calls: number; cost: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = d.toISOString().split("T")[0];
    aiDayMap[k] = { date: k, calls: 0, cost: 0 };
  }
  for (const r of aiInvocations30d ?? []) {
    const k = r.created_at.split("T")[0];
    if (aiDayMap[k]) {
      aiDayMap[k].calls++;
      aiDayMap[k].cost += Number(r.cost_usd ?? 0);
    }
  }
  const aiCostTimeline = Object.values(aiDayMap);

  // --- User list for table (non-admin) ---
  const users = authUsers
    .filter((u) => !adminIds.has(u.id))
    .map((u) => {
      const profile = profileMap.get(u.id) as any;
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        display_name: profile?.display_name ?? "",
        plan: profile?.plan ?? "free",
      };
    });

  // --- "Potencial" revenue (beta force Pro for all; rotulado claramente na UI) ---
  const PRO_PRICE_BRL = 49.9;
  const proUsers = planCounts["pro"] ?? 0;
  const potentialMonthlyRevenue = proUsers * PRO_PRICE_BRL;

  const products = [
    { name: "Plano Free", count: planCounts["free"] ?? 0, price: 0 },
    { name: "Plano Pro", count: proUsers, price: PRO_PRICE_BRL },
  ];

  // --- Activity & Engagement ---
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysIso = sevenDaysAgo.toISOString();
  const thirtyDaysIso = thirtyDaysAgoIso;

  const [
    { data: recentTasksWeek },
    { data: recentProjectsWeek },
    { data: recentTransactionsWeek },
    { data: recentEventsWeek },
  ] = await Promise.all([
    adminClient.from("tasks").select("user_id, created_at").gte("created_at", sevenDaysIso),
    adminClient.from("projects").select("user_id, created_at").gte("created_at", sevenDaysIso),
    adminClient.from("transactions").select("user_id, created_at").gte("created_at", sevenDaysIso),
    adminClient.from("events").select("user_id, created_at").gte("created_at", sevenDaysIso),
  ]);

  const activeUserIds = new Set<string>();
  for (const r of [...(recentTasksWeek ?? []), ...(recentProjectsWeek ?? []), ...(recentTransactionsWeek ?? []), ...(recentEventsWeek ?? [])]) {
    if (r.user_id && !adminIds.has(r.user_id)) activeUserIds.add(r.user_id);
  }
  const activeUsersLast7Days = activeUserIds.size;

  const loginsLast7Days = authUsers.filter((u) => {
    if (adminIds.has(u.id)) return false;
    if (!u.last_sign_in_at) return false;
    return new Date(u.last_sign_in_at) >= sevenDaysAgo;
  }).length;

  const newSignupsLast7Days = authUsers.filter((u) => {
    if (adminIds.has(u.id)) return false;
    return u.created_at && new Date(u.created_at) >= sevenDaysAgo;
  }).length;

  // Activity timeline (sem notificacoes, que nunca era renderizada)
  const [
    { data: recentTasks },
    { data: recentProjects },
    { data: recentTransactions },
  ] = await Promise.all([
    adminClient.from("tasks").select("created_at").gte("created_at", thirtyDaysIso),
    adminClient.from("projects").select("created_at").gte("created_at", thirtyDaysIso),
    adminClient.from("transactions").select("created_at").gte("created_at", thirtyDaysIso),
  ]);

  const dayMap: Record<string, { date: string; tarefas: number; projetos: number; transacoes: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    dayMap[key] = { date: key, tarefas: 0, projetos: 0, transacoes: 0 };
  }
  const toKey = (iso: string) => iso.split("T")[0];
  for (const t of recentTasks ?? []) { const k = toKey(t.created_at); if (dayMap[k]) dayMap[k].tarefas++; }
  for (const p of recentProjects ?? []) { const k = toKey(p.created_at); if (dayMap[k]) dayMap[k].projetos++; }
  for (const tx of recentTransactions ?? []) { const k = toKey(tx.created_at); if (dayMap[k]) dayMap[k].transacoes++; }
  const activityTimeline = Object.values(dayMap);

  // --- Function logs ---
  const { data: functionLogs } = await adminClient
    .from("function_logs")
    .select("id, created_at, function_name, level, message, details")
    .order("created_at", { ascending: false })
    .limit(50);

  // ═══════════════════════════════════════════════
  // ── PRODUCT ADOPTION METRICS ──
  // ═══════════════════════════════════════════════

  const onboardedUsers = (profiles ?? []).filter((p: any) => p.onboarding_completed === true).length;
  const onboardingRate = totalUsers > 0 ? Math.round((onboardedUsers / totalUsers) * 100) : 0;

  const basicModeUsers = (profiles ?? []).filter((p: any) => p.track_view_mode === "basic").length;
  const advancedModeUsers = (profiles ?? []).filter((p: any) => p.track_view_mode === "advanced").length;

  const { data: allProjects } = await adminClient
    .from("projects")
    .select("id, user_id, stage, completed, created_at")
    .in("user_id", safeIds);

  const projectsCreatedTotal = allProjects?.length ?? 0;
  const projectsLaunched = (allProjects ?? []).filter((p: any) => p.stage === "lancado" || p.completed === true).length;
  const launchRate = projectsCreatedTotal > 0 ? Math.round((projectsLaunched / projectsCreatedTotal) * 100) : 0;

  // Time to first project (median hours)
  const userFirstProject: Record<string, string> = {};
  for (const p of allProjects ?? []) {
    if (!userFirstProject[p.user_id] || p.created_at < userFirstProject[p.user_id]) {
      userFirstProject[p.user_id] = p.created_at;
    }
  }
  const timeToFirstProjectHours: number[] = [];
  for (const [uid, firstProjDate] of Object.entries(userFirstProject)) {
    const authUser = authUsers.find((u) => u.id === uid);
    if (authUser?.created_at) {
      const diff = (new Date(firstProjDate).getTime() - new Date(authUser.created_at).getTime()) / 3600000;
      if (diff >= 0) timeToFirstProjectHours.push(diff);
    }
  }
  timeToFirstProjectHours.sort((a, b) => a - b);
  const medianTimeToFirstProject = timeToFirstProjectHours.length > 0
    ? timeToFirstProjectHours[Math.floor(timeToFirstProjectHours.length / 2)]
    : null;

  // Time to first task (median) — exclude dismissed (soft-deleted)
  const { data: allTasksForActivation } = await adminClient
    .from("tasks")
    .select("user_id, created_at")
    .eq("auto_generated", false)
    .eq("dismissed", false)
    .in("user_id", safeIds)
    .order("created_at", { ascending: true });

  const userFirstTask: Record<string, string> = {};
  for (const t of allTasksForActivation ?? []) {
    if (!userFirstTask[t.user_id]) userFirstTask[t.user_id] = t.created_at;
  }
  const timeToFirstTaskHours: number[] = [];
  for (const [uid, firstTaskDate] of Object.entries(userFirstTask)) {
    const authUser = authUsers.find((u) => u.id === uid);
    if (authUser?.created_at) {
      const diff = (new Date(firstTaskDate).getTime() - new Date(authUser.created_at).getTime()) / 3600000;
      if (diff >= 0) timeToFirstTaskHours.push(diff);
    }
  }
  timeToFirstTaskHours.sort((a, b) => a - b);
  const medianTimeToFirstTask = timeToFirstTaskHours.length > 0
    ? timeToFirstTaskHours[Math.floor(timeToFirstTaskHours.length / 2)]
    : null;

  // Feature ranking (manual tasks only, agrupado por source_module/task_area)
  const { data: allTaskAreas } = await adminClient
    .from("tasks")
    .select("source_module, task_area")
    .eq("dismissed", false)
    .in("user_id", safeIds);

  const featureUsage: Record<string, number> = {};
  for (const t of allTaskAreas ?? []) {
    const area = t.source_module || t.task_area || "geral";
    if (area && area !== "") featureUsage[area] = (featureUsage[area] || 0) + 1;
  }

  const featureRanking = Object.entries(featureUsage)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const usersWithProjects = new Set((allProjects ?? []).map((p: any) => p.user_id));
  const usersWithoutProject = nonAdminIds.filter((uid) => !usersWithProjects.has(uid)).length;

  // ── Page drop-off (screen abandonment) ──
  // Ignora views com duration_seconds = 0 (fechamento de aba sem unload disparado)
  const { data: pageViewRows } = await adminClient
    .from("page_views")
    .select("page_path, duration_seconds")
    .gt("duration_seconds", 0)
    .gte("created_at", thirtyDaysIso);

  const pageAgg: Record<string, { views: number; totalDuration: number; bounces: number }> = {};
  for (const pv of pageViewRows ?? []) {
    if (!pageAgg[pv.page_path]) pageAgg[pv.page_path] = { views: 0, totalDuration: 0, bounces: 0 };
    pageAgg[pv.page_path].views++;
    pageAgg[pv.page_path].totalDuration += Number(pv.duration_seconds ?? 0);
    if (Number(pv.duration_seconds ?? 0) < 5) pageAgg[pv.page_path].bounces++;
  }

  const screenDropoff = Object.entries(pageAgg)
    .map(([path, d]) => ({
      path,
      views: d.views,
      avgDuration: d.views > 0 ? Math.round(d.totalDuration / d.views) : 0,
      bounceRate: d.views > 0 ? Math.round((d.bounces / d.views) * 100) : 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 15);

  const adoption = {
    onboardingRate,
    onboardedUsers,
    basicModeUsers,
    advancedModeUsers,
    projectsCreatedTotal,
    projectsLaunched,
    launchRate,
    medianTimeToFirstProject,
    medianTimeToFirstTask,
    usersWithoutProject,
    featureRanking,
    screenDropoff,
  };

  return new Response(
    JSON.stringify({
      platform: {
        totalUsers,
        totalProjects: totalProjects ?? 0,
        totalTransactions: totalTransactions ?? 0,
      },
      engagement: {
        loginsLast7Days,
        activeUsersLast7Days,
        newSignupsLast7Days,
        activeRate: totalUsers > 0 ? Math.round((activeUsersLast7Days / totalUsers) * 100) : 0,
      },
      adoption,
      users,
      planCounts,
      products,
      potentialMonthlyRevenue,
      aiUsage: {
        aiCalls30d,
        aiCallsTotal,
        aiRealCost30d,
        aiCostTimeline,
      },
      activityTimeline,
      functionLogs: functionLogs ?? [],
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
