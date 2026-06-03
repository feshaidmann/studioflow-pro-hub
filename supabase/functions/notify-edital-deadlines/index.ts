// Notifica candidatos quando o prazo está D-7 ou D-1
// Roda diariamente via pg_cron (ver README) ou pode ser invocado manualmente.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Cron-only function: not invoked from browser, no wildcard CORS needed.
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://app.jamsessionproject.com.br",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACTIVE_STATUSES = ["interesse", "preparando", "inscrito"];
const TARGET_DAYS = [7, 1];

function todayInSP(): Date {
  const now = new Date();
  // Truncar para meia-noite no fuso America/Sao_Paulo (UTC-3, sem DST atualmente)
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  });
  const [{ value: y }, , { value: m }, , { value: d }] = fmt.formatToParts(now);
  return new Date(`${y}-${m}-${d}T00:00:00-03:00`);
}

function diffDays(prazo: string, today: Date): number {
  const d = new Date(prazo + "T00:00:00-03:00");
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_ROLE);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  const { data: cronOk } = token
    ? await supabase.rpc("verify_cron_token", { p_token: token })
    : { data: false };
  if (cronOk !== true) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {

    const today = todayInSP();

    // Buscar candidaturas ativas
    const { data: apps, error } = await supabase
      .from("edital_applications")
      .select("id, user_id, opportunity_id, tipo, status")
      .in("status", ACTIVE_STATUSES);
    if (error) throw error;

    if (!apps || apps.length === 0) {
      return new Response(JSON.stringify({ checked: 0, created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolver prazos via duas queries (editais + palcos)
    const editalIds = apps.filter((a) => a.tipo === "fomento").map((a) => a.opportunity_id);
    const palcoIds  = apps.filter((a) => a.tipo === "palco").map((a) => a.opportunity_id);

    const [editaisRes, palcosRes] = await Promise.all([
      editalIds.length
        ? supabase.from("editais").select("id, titulo, prazo").in("id", editalIds)
        : Promise.resolve({ data: [], error: null }),
      palcoIds.length
        ? supabase.from("palcos_curados").select("id, nome, prazo").in("id", palcoIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const prazoMap = new Map<string, { prazo: string | null; titulo: string }>();
    for (const e of (editaisRes.data || [])) prazoMap.set(e.id, { prazo: e.prazo, titulo: e.titulo });
    for (const p of (palcosRes.data || []))  prazoMap.set(p.id, { prazo: p.prazo, titulo: p.nome });

    let created = 0;
    const errors: string[] = [];

    for (const app of apps) {
      const meta = prazoMap.get(app.opportunity_id);
      if (!meta?.prazo) continue;

      const days = diffDays(meta.prazo, today);
      if (!TARGET_DAYS.includes(days)) continue;

      const link = `/carreira?op=${app.tipo === "palco" ? "palco" : "edital"}:${app.opportunity_id}`;
      const title = days === 1 ? "Prazo amanhã!" : `Prazo em ${days} dias`;
      const message = `${meta.titulo} — fecha em ${days} ${days === 1 ? "dia" : "dias"}.`;

      // Insert; o índice único uniq_notif_carreira_deadline_per_day evita duplicatas no mesmo dia
      const { error: insErr } = await supabase.from("notifications").insert({
        user_id: app.user_id,
        type: "carreira_deadline",
        title,
        message,
        link,
      });
      if (insErr) {
        // Conflito = duplicata, ok
        if (!insErr.message.includes("uniq_notif_carreira_deadline_per_day")) {
          errors.push(`${app.id}: ${insErr.message}`);
        }
        continue;
      }
      created++;
    }

    return new Response(JSON.stringify({ checked: apps.length, created, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("notify-edital-deadlines error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
