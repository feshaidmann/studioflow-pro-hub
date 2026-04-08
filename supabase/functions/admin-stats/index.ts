import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const userId = claimsData.claims.sub;

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

  // --- Profiles (non-admin only) ---
  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, display_name, user_type, plan, created_at")
    .in("id", nonAdminIds.length > 0 ? nonAdminIds : ["00000000-0000-0000-0000-000000000000"]);

  const profileMap = new Map(
    (profiles ?? []).map((p: { id: string; display_name: string; user_type: string; plan: string; created_at: string }) => [p.id, p])
  );

  // --- Total non-admin users ---
  const totalUsers = nonAdminIds.length;

  // --- Plan breakdown (non-admin) ---
  const planCounts: Record<string, number> = {};
  for (const p of profiles ?? []) {
    const plan = (p as any).plan ?? "free";
    planCounts[plan] = (planCounts[plan] ?? 0) + 1;
  }

  // --- Professionals stats ---
  const [
    { count: totalProfessionals },
    { count: totalGlobalProfessionals },
    { count: totalProjectMembers },
  ] = await Promise.all([
    adminClient.from("professionals").select("*", { count: "exact", head: true }),
    adminClient.from("professionals").select("*", { count: "exact", head: true }).eq("allow_global_listing", true),
    adminClient.from("project_members").select("*", { count: "exact", head: true }),
  ]);

  const globalPercent =
    totalProfessionals && totalProfessionals > 0
      ? Math.round(((totalGlobalProfessionals ?? 0) / totalProfessionals) * 100)
      : 0;

  // --- Other counts ---
  const [
    { count: totalProjects },
    { count: totalTasks },
    { count: totalTransactions },
    { count: totalNotifications },
    { count: totalMixTracks },
  ] = await Promise.all([
    adminClient.from("projects").select("*", { count: "exact", head: true }),
    adminClient.from("tasks").select("*", { count: "exact", head: true }),
    adminClient.from("transactions").select("*", { count: "exact", head: true }),
    adminClient.from("notifications").select("*", { count: "exact", head: true }),
    adminClient.from("mix_tracks").select("*", { count: "exact", head: true }),
  ]);

  // --- AI Invocations real tracking ---
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgoIso2 = new Date(now.getTime() - 7 * 86400000).toISOString();
  const thirtyDaysAgoIso2 = new Date(now.getTime() - 30 * 86400000).toISOString();

  const [
    { data: aiInvocationsToday },
    { data: aiInvocations7d },
    { data: aiInvocations30d },
    { data: aiInvocationsAll },
  ] = await Promise.all([
    adminClient.from("ai_invocations").select("cost_usd, function_name, model, status").gte("created_at", todayStart),
    adminClient.from("ai_invocations").select("cost_usd, function_name, model, status").gte("created_at", sevenDaysAgoIso2),
    adminClient.from("ai_invocations").select("cost_usd, function_name, model, status, created_at").gte("created_at", thirtyDaysAgoIso2).order("created_at", { ascending: false }),
    adminClient.from("ai_invocations").select("cost_usd, function_name, model, status"),
  ]);

  const sumCost = (rows: any[]) => (rows ?? []).reduce((s: number, r: any) => s + Number(r.cost_usd ?? 0), 0);
  const countSuccess = (rows: any[]) => (rows ?? []).filter((r: any) => r.status === "success").length;

  const aiRealCostToday = sumCost(aiInvocationsToday ?? []);
  const aiRealCost7d = sumCost(aiInvocations7d ?? []);
  const aiRealCost30d = sumCost(aiInvocations30d ?? []);
  const aiRealCostTotal = sumCost(aiInvocationsAll ?? []);
  const aiCallsToday = countSuccess(aiInvocationsToday ?? []);
  const aiCalls7d = countSuccess(aiInvocations7d ?? []);
  const aiCalls30d = (aiInvocations30d ?? []).filter((r: any) => r.status === "success").length;
  const aiCallsTotal = countSuccess(aiInvocationsAll ?? []);

  // Per-function breakdown (all time)
  const fnBreakdown: Record<string, { calls: number; cost: number }> = {};
  for (const r of aiInvocationsAll ?? []) {
    if (!fnBreakdown[r.function_name]) fnBreakdown[r.function_name] = { calls: 0, cost: 0 };
    fnBreakdown[r.function_name].calls++;
    fnBreakdown[r.function_name].cost += Number(r.cost_usd ?? 0);
  }

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
        user_type: profile?.user_type ?? "artist",
        plan: profile?.plan ?? "free",
        is_admin: false,
      };
    });

  // --- Revenue estimate from subscriptions (based on plan counts) ---
  // Pro plan price: R$ 49.90/month (configurable)
  const PRO_PRICE_BRL = 49.9;
  const proUsers = planCounts["pro"] ?? 0;
  const estimatedMonthlyRevenue = proUsers * PRO_PRICE_BRL;

  const products = [
    { name: "Plano Free", count: planCounts["free"] ?? 0, price: 0 },
    { name: "Plano Pro", count: proUsers, price: PRO_PRICE_BRL },
  ];

  // --- Activity last 30 days ---
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysIso = thirtyDaysAgo.toISOString();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysIso = sevenDaysAgo.toISOString();

  // --- Engagement: logins last 7 days & active users ---
  // "Active users" = users who created tasks, projects, transactions or events in last 7 days
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

  // Logins last 7 days via auth.users last_sign_in_at
  const loginsLast7Days = authUsers.filter((u) => {
    if (adminIds.has(u.id)) return false;
    if (!u.last_sign_in_at) return false;
    return new Date(u.last_sign_in_at) >= sevenDaysAgo;
  }).length;

  const [
    { data: recentTasks },
    { data: recentProjects },
    { data: recentTransactions },
    { data: recentNotifications },
  ] = await Promise.all([
    adminClient.from("tasks").select("created_at, source").gte("created_at", thirtyDaysIso),
    adminClient.from("projects").select("created_at").gte("created_at", thirtyDaysIso),
    adminClient.from("transactions").select("created_at").gte("created_at", thirtyDaysIso),
    adminClient.from("notifications").select("created_at").gte("created_at", thirtyDaysIso),
  ]);

  // Activity timeline
  const dayMap: Record<string, { date: string; tarefas: number; projetos: number; transacoes: number; notificacoes: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    dayMap[key] = { date: key, tarefas: 0, projetos: 0, transacoes: 0, notificacoes: 0 };
  }

  const toKey = (iso: string) => iso.split("T")[0];
  for (const t of recentTasks ?? []) { const k = toKey(t.created_at); if (dayMap[k]) dayMap[k].tarefas++; }
  for (const p of recentProjects ?? []) { const k = toKey(p.created_at); if (dayMap[k]) dayMap[k].projetos++; }
  for (const tx of recentTransactions ?? []) { const k = toKey(tx.created_at); if (dayMap[k]) dayMap[k].transacoes++; }
  for (const n of recentNotifications ?? []) { const k = toKey(n.created_at); if (dayMap[k]) dayMap[k].notificacoes++; }

  const activityTimeline = Object.values(dayMap);

  // --- Infrastructure cost estimates (with real AI tracking) ---
  const RESEND_COST_PER_EMAIL_USD = 0.001;
  const SUPABASE_ESTIMATED_USD = totalUsers > 50 ? 25 : 0;

  const { count: totalInvitations } = await adminClient
    .from("project_invitations")
    .select("*", { count: "exact", head: true });

  const emailCostTotal = (totalInvitations ?? 0) * RESEND_COST_PER_EMAIL_USD;
  const infraCosts = [
    { name: "Backend (Cloud)", value: SUPABASE_ESTIMATED_USD, currency: "USD", note: "Estimado baseado no volume de usuários" },
    { name: "IA (Gemini Flash)", value: parseFloat(aiRealCost30d.toFixed(6)), currency: "USD", note: `${aiCalls30d} chamadas nos últimos 30 dias` },
    { name: "E-mails (Resend)", value: parseFloat(emailCostTotal.toFixed(4)), currency: "USD", note: `${totalInvitations ?? 0} convites enviados` },
  ];

  // --- Edge functions list ---
  const edgeFunctions = [
    "ai-task-assistant",
    "audio-analyze",
    "generate-daily-tasks",
    "respond-to-invite",
    "search-platform-professionals",
    "send-project-invite",
    "admin-stats",
  ];

  // --- Function logs ---
  const { data: functionLogs } = await adminClient
    .from("function_logs")
    .select("id, created_at, function_name, level, message, details")
    .order("created_at", { ascending: false })
    .limit(50);

  return new Response(
    JSON.stringify({
      platform: {
        totalUsers,
        totalProjects: totalProjects ?? 0,
        totalTasks: totalTasks ?? 0,
        totalTransactions: totalTransactions ?? 0,
        totalProfessionals: totalProfessionals ?? 0,
        totalGlobalProfessionals: totalGlobalProfessionals ?? 0,
        globalPercent,
        totalProjectMembers: totalProjectMembers ?? 0,
        totalNotifications: totalNotifications ?? 0,
        totalMixTracks: totalMixTracks ?? 0,
      },
      engagement: {
        loginsLast7Days,
        activeUsersLast7Days,
        retentionRate: totalUsers > 0 ? Math.round((activeUsersLast7Days / totalUsers) * 100) : 0,
      },
      users,
      planCounts,
      products,
      estimatedMonthlyRevenue,
      infraCosts,
      edgeFunctions,
      aiUsage: {
        aiTasksToday: aiCallsToday,
        aiTasksThisWeek: aiCalls7d,
        aiCalls30d,
        aiCallsTotal,
        aiRealCostToday,
        aiRealCost7d,
        aiRealCost30d,
        aiRealCostTotal,
        fnBreakdown,
        aiCostTimeline,
      },
      activityTimeline,
      functionLogs: functionLogs ?? [],
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
