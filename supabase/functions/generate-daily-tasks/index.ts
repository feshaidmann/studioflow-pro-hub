import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function parseDeadline(raw: string): Date | null {
  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

// ── Upsert helper (ON CONFLICT DO NOTHING via partial unique index) ──────

async function upsertTask(
  supabase: ReturnType<typeof createClient>,
  params: {
    user_id: string;
    description: string;
    project_id?: string | null;
    due_date?: string | null;
    source: string;
    source_key: string;
  }
) {
  await supabase.from("tasks").upsert(
    {
      user_id: params.user_id,
      description: params.description,
      project_id: params.project_id ?? null,
      due_date: params.due_date ?? null,
      auto_generated: true,
      source: params.source,
      source_key: params.source_key,
    },
    { onConflict: "user_id,source_key", ignoreDuplicates: true }
  );
}

// ── Rule defaults ────────────────────────────────────────────────────────

interface RuleParams {
  inactivity: { days: number; active: boolean };
  budget: { alertPercent: number; active: boolean };
  invite_pending: { days: number; active: boolean };
  deadline: { daysAhead: number; active: boolean };
  master_check: { daysStuck: number; active: boolean };
  release: { daysAhead: number; active: boolean };
}

const DEFAULTS: RuleParams = {
  inactivity: { days: 7, active: true },
  budget: { alertPercent: 80, active: true },
  invite_pending: { days: 5, active: true },
  deadline: { daysAhead: 3, active: true },
  master_check: { daysStuck: 5, active: true },
  release: { daysAhead: 7, active: true },
};

async function loadRuleParams(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<RuleParams> {
  const { data: rows } = await supabase
    .from("task_rules")
    .select("rule_type, is_active, parameters")
    .eq("user_id", userId);

  const params = { ...DEFAULTS };
  for (const r of rows ?? []) {
    const key = r.rule_type as keyof RuleParams;
    if (key in params) {
      (params as any)[key] = {
        ...DEFAULTS[key],
        ...(r.parameters as Record<string, unknown>),
        active: r.is_active,
      };
    }
  }
  return params;
}

// ── Rule runners ──────────────────────────────────────────────────────────

async function ruleInactivity(supabase: ReturnType<typeof createClient>, userId: string, cfg: RuleParams["inactivity"]) {
  if (!cfg.active) return;
  const cutoff = daysAgo(cfg.days);
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, updated_at")
    .eq("user_id", userId)
    .eq("completed", false)
    .lt("updated_at", cutoff);

  for (const p of projects ?? []) {
    const daysInactive = daysBetween(new Date(p.updated_at), new Date());
    await upsertTask(supabase, {
      user_id: userId,
      description: `Nenhuma atividade no projeto "${p.name}" há ${daysInactive} dias. Que tal retomar?`,
      project_id: p.id,
      source: "inactivity",
      source_key: `inactivity:${p.id}`,
    });
  }
}

async function ruleBudget(supabase: ReturnType<typeof createClient>, userId: string, cfg: RuleParams["budget"]) {
  if (!cfg.active) return;
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, total_contract_value, amount_paid")
    .eq("user_id", userId)
    .eq("completed", false)
    .not("total_contract_value", "is", null);

  if (!projects?.length) return;

  const projectIds = projects.map((p: any) => p.id);
  const { data: txs } = await supabase
    .from("transactions")
    .select("project_id, type, amount")
    .eq("user_id", userId)
    .in("project_id", projectIds);

  for (const p of projects) {
    const contractValue = Number(p.total_contract_value);
    if (!contractValue) continue;

    const projTxs = (txs ?? []).filter((t: any) => t.project_id === p.id);
    const totalIncome = projTxs.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const totalExpense = projTxs.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0);

    const ratio = totalExpense / contractValue;
    if (ratio >= cfg.alertPercent / 100) {
      await upsertTask(supabase, {
        user_id: userId,
        description: `Projeto "${p.name}" atingiu ${Math.round(ratio * 100)}% do orçamento. Reveja custos ou negocie reajuste.`,
        project_id: p.id,
        source: "budget",
        source_key: `budget_80pct:${p.id}`,
      });
    }

    const profit = totalIncome - totalExpense;
    if (totalIncome > 0 && profit < 0) {
      await upsertTask(supabase, {
        user_id: userId,
        description: `Projeto "${p.name}" está com prejuízo estimado de R$ ${Math.abs(profit).toLocaleString("pt-BR")}. Revise as despesas.`,
        project_id: p.id,
        source: "budget",
        source_key: `budget_loss:${p.id}`,
      });
    }
  }
}

async function rulePendingInvites(supabase: ReturnType<typeof createClient>, userId: string, cfg: RuleParams["invite_pending"]) {
  if (!cfg.active) return;
  const cutoff = daysAgo(cfg.days);
  const { data: invites } = await supabase
    .from("project_invitations")
    .select("id, professional_name, project_id, projects(name), created_at")
    .eq("invited_by", userId)
    .eq("status", "pending")
    .lt("created_at", cutoff);

  for (const inv of invites ?? []) {
    const projName = (inv.projects as any)?.name ?? "";
    const daysPending = daysBetween(new Date(inv.created_at), new Date());
    await upsertTask(supabase, {
      user_id: userId,
      description: `${inv.professional_name} ainda não respondeu ao convite para "${projName}" (${daysPending}d). Deseja enviar um lembrete?`,
      project_id: inv.project_id,
      source: "invite_pending",
      source_key: `invite_pending:${inv.id}`,
    });
  }
}

async function ruleDeadlineApproaching(supabase: ReturnType<typeof createClient>, userId: string, cfg: RuleParams["deadline"]) {
  if (!cfg.active) return;
  const { data: invites } = await supabase
    .from("project_invitations")
    .select("id, professional_name, professional_role, project_id, deadline, projects(name)")
    .eq("invited_by", userId)
    .eq("status", "accepted")
    .neq("deadline", "");

  for (const inv of invites ?? []) {
    if (!inv.deadline) continue;
    const dl = parseDeadline(inv.deadline);
    if (!dl) continue;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = daysBetween(today, dl);
    if (diff < 0 || diff > cfg.daysAhead) continue;

    const projName = (inv.projects as any)?.name ?? "";
    const label = diff === 0 ? "hoje" : `em ${diff} dia${diff > 1 ? "s" : ""}`;

    await upsertTask(supabase, {
      user_id: userId,
      description: `O prazo de ${inv.professional_role || "profissional"} ${inv.professional_name} para "${projName}" vence ${label}. Acompanhe a entrega.`,
      project_id: inv.project_id,
      due_date: dl.toISOString().slice(0, 10),
      source: "deadline",
      source_key: `deadline_close:${inv.id}`,
    });
  }
}

async function ruleMasterStage(supabase: ReturnType<typeof createClient>, userId: string, cfg: RuleParams["master_check"]) {
  if (!cfg.active) return;
  const cutoff = daysAgo(cfg.daysStuck);
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, stage, master_done, streaming_ready, lufs, updated_at")
    .eq("user_id", userId)
    .eq("completed", false)
    .eq("stage", "master")
    .lt("updated_at", cutoff);

  for (const p of projects ?? []) {
    const daysStuck = daysBetween(new Date(p.updated_at), new Date());

    if (!p.master_done) {
      await upsertTask(supabase, {
        user_id: userId,
        description: `"${p.name}" está em masterização há ${daysStuck} dias. Que tal analisar com o Master Analyzer?`,
        project_id: p.id,
        source: "master_check",
        source_key: `master_stuck:${p.id}`,
      });
    } else if (p.streaming_ready === false) {
      await upsertTask(supabase, {
        user_id: userId,
        description: `A última análise de "${p.name}" apontou problemas de loudness (${Number(p.lufs).toFixed(1)} LUFS). Envie uma nova versão para verificação.`,
        project_id: p.id,
        source: "master_check",
        source_key: `master_issues:${p.id}`,
      });
    }
  }
}

async function ruleUpcomingReleases(supabase: ReturnType<typeof createClient>, userId: string, cfg: RuleParams["release"]) {
  if (!cfg.active) return;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, upload_date, master_done")
    .eq("user_id", userId)
    .eq("completed", false)
    .eq("master_done", true)
    .neq("upload_date", "");

  for (const p of projects ?? []) {
    if (!p.upload_date) continue;
    const releaseDate = parseDeadline(p.upload_date) ?? new Date(p.upload_date);
    if (isNaN(releaseDate.getTime())) continue;

    const diff = daysBetween(today, releaseDate);

    if (diff >= 0 && diff <= cfg.daysAhead) {
      const label = diff === 0 ? "hoje" : `em ${diff} dia${diff > 1 ? "s" : ""}`;
      await upsertTask(supabase, {
        user_id: userId,
        description: `"${p.name}" lança ${label}. Prepare o material de divulgação!`,
        project_id: p.id,
        due_date: releaseDate.toISOString().slice(0, 10),
        source: "release",
        source_key: `release_soon:${p.id}`,
      });
    }

    if (diff < 0) {
      await upsertTask(supabase, {
        user_id: userId,
        description: `O lançamento de "${p.name}" estava previsto para ${p.upload_date}. Já foi lançado? Atualize o status.`,
        project_id: p.id,
        source: "release",
        source_key: `release_overdue:${p.id}`,
      });
    }
  }
}

// ── Main handler ──────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate: process only the calling user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: __authUser }, error: claimsErr } = await supabase.auth.getUser(token);
  const claims = __authUser ? { claims: { sub: __authUser.id, email: __authUser.email } } : null;
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub as string;

    // Use service role client for writes (RLS bypass for upsert with partial index)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load user's rule config
    const ruleParams = await loadRuleParams(admin, userId);

    // Run all rules in parallel
    await Promise.all([
      ruleInactivity(admin, userId, ruleParams.inactivity),
      ruleBudget(admin, userId, ruleParams.budget),
      rulePendingInvites(admin, userId, ruleParams.invite_pending),
      ruleDeadlineApproaching(admin, userId, ruleParams.deadline),
      ruleMasterStage(admin, userId, ruleParams.master_check),
      ruleUpcomingReleases(admin, userId, ruleParams.release),
    ]);

    return new Response(
      JSON.stringify({ ok: true, userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("generate-daily-tasks error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "Erro interno. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
