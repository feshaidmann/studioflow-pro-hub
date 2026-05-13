// Cron diário: revalida links oficiais de editais e palcos curados.
// Chamado por pg_cron (sem auth). Atualiza link_status / link_checked_at.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const goodStatuses = new Set([200, 201, 202, 203, 204, 206, 301, 302, 303, 307, 308]);
const ua = "Mozilla/5.0 (compatible; StudioFlowLinkChecker/1.0; +https://app.jamsessionproject.com.br)";

async function checkLinkAlive(rawUrl: string): Promise<"ok" | "broken"> {
  let url: URL;
  try { url = new URL(rawUrl.trim()); } catch { return "broken"; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "broken";

  async function attempt(method: "HEAD" | "GET"): Promise<number | "timeout"> {
    try {
      const resp = await fetch(url.toString(), {
        method,
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
        headers: method === "GET"
          ? { "User-Agent": ua, "Range": "bytes=0-1024", "Accept": "*/*" }
          : { "User-Agent": ua, "Accept": "*/*" },
      });
      try { await resp.body?.cancel(); } catch { /* noop */ }
      return resp.status;
    } catch (e: any) {
      if (e?.name === "TimeoutError" || e?.name === "AbortError") return "timeout";
      return 0;
    }
  }

  let s = await attempt("HEAD");
  if (s === 405 || s === 501 || s === 0 || s === 403) s = await attempt("GET");
  if (s === "timeout") return "broken";
  return goodStatuses.has(s as number) ? "ok" : "broken";
}

// Limita concorrência via fila simples
async function mapWithLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const summary: Record<string, { ok: number; broken: number; skipped: number }> = {
    editais: { ok: 0, broken: 0, skipped: 0 },
    palcos:  { ok: 0, broken: 0, skipped: 0 },
  };

  for (const table of ["editais", "palcos_curados"] as const) {
    const { data, error } = await admin
      .from(table)
      .select("id, link, link_checked_at, link_status")
      .not("link", "is", null)
      .neq("link", "")
      .or(`link_checked_at.is.null,link_checked_at.lt.${sevenDaysAgo}`)
      .limit(200);

    if (error) {
      console.error(`[check-links] select ${table}:`, error);
      continue;
    }

    const rows = (data || []) as { id: string; link: string }[];
    const checked = await mapWithLimit(rows, 8, async (r) => ({
      id: r.id,
      status: await checkLinkAlive(r.link),
    }));

    const now = new Date().toISOString();
    const key = table === "editais" ? "editais" : "palcos";
    for (const c of checked) {
      const { error: upErr } = await admin
        .from(table)
        .update({ link_status: c.status, link_checked_at: now })
        .eq("id", c.id);
      if (upErr) { summary[key].skipped++; continue; }
      summary[key][c.status]++;
    }
  }

  return new Response(JSON.stringify({ ok: true, summary }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
