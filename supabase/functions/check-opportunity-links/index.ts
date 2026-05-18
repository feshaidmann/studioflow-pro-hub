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

const okStatuses = new Set([200, 201, 202, 203, 204, 206, 301, 302, 303, 307, 308]);
// Status transitórios — não marcamos como broken, devolvemos "unknown" e o handler preserva o status anterior.
const transientStatuses = new Set([401, 408, 425, 429, 500, 502, 503, 504, 522, 524]);
const ua = "Mozilla/5.0 (compatible; StudioFlowLinkChecker/1.0; +https://app.jamsessionproject.com.br)";

// Padrões de soft-404 / página removida (HTML responde 200 mas conteúdo é "não encontrado").
const SOFT_404_PATTERNS: RegExp[] = [
  /p[áa]gina\s+n[ãa]o\s+encontrada/i,
  /conte[úu]do\s+(n[ãa]o\s+)?(encontrado|dispon[íi]vel|removido)/i,
  /esta\s+p[áa]gina\s+n[ãa]o\s+(existe|est[áa]\s+dispon[íi]vel)/i,
  /edital\s+(encerrado|expirado|finalizado|indispon[íi]vel)/i,
  /inscri[çc][õo]es\s+encerradas/i,
  /\b(page\s+not\s+found|not\s+found|page\s+(?:no\s+longer|isn't|is\s+not)\s+available)\b/i,
  /\b(content\s+(?:removed|unavailable|no\s+longer\s+available))\b/i,
  /\berror\s+404\b/i,
  // Cloudflare / hospedagem fora do ar
  /\bcloudflare\b.*\b(error\s+(1016|1001|521|522|523|524|525))\b/i,
  /this\s+site\s+can[''']t\s+be\s+reached/i,
  /sorry,\s+you\s+have\s+been\s+blocked/i,
  /web\s+server\s+is\s+returning\s+an\s+unknown\s+error/i,
  /origin\s+is\s+unreachable/i,
];

type CheckResult = "ok" | "broken" | "unknown";

interface FetchOutcome {
  status: number | "timeout" | "neterr";
  finalUrl?: string;
  contentType?: string;
  body?: string; // primeiros KB em texto
}

async function attempt(url: URL, method: "HEAD" | "GET"): Promise<FetchOutcome> {
  try {
    const resp = await fetch(url.toString(), {
      method,
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
      headers: method === "GET"
        ? { "User-Agent": ua, "Range": "bytes=0-32768", "Accept": "text/html,*/*;q=0.8", "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.5" }
        : { "User-Agent": ua, "Accept": "*/*" },
    });
    const contentType = resp.headers.get("content-type") || "";
    let body: string | undefined;
    if (method === "GET") {
      try {
        const buf = await resp.arrayBuffer();
        body = new TextDecoder("utf-8", { fatal: false }).decode(buf.slice(0, 32768));
      } catch { body = undefined; }
    } else {
      try { await resp.body?.cancel(); } catch { /* noop */ }
    }
    return { status: resp.status, finalUrl: resp.url, contentType, body };
  } catch (e: any) {
    if (e?.name === "TimeoutError" || e?.name === "AbortError") return { status: "timeout" };
    return { status: "neterr" };
  }
}

function isSoftDead(body: string | undefined): boolean {
  if (!body) return false;
  // Limita à parte visível razoável; ignora tags <script>/<style> de forma simples.
  const cleaned = body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return SOFT_404_PATTERNS.some((re) => re.test(cleaned));
}

function suspiciousRedirect(original: URL, finalUrl?: string): boolean {
  if (!finalUrl) return false;
  let f: URL;
  try { f = new URL(finalUrl); } catch { return false; }
  if (f.host !== original.host) return false;
  const origHasDeepPath = original.pathname.replace(/\/+$/, "").split("/").filter(Boolean).length >= 2;
  const finalIsRoot = f.pathname === "/" || f.pathname === "";
  return origHasDeepPath && finalIsRoot;
}

async function checkLinkAlive(rawUrl: string): Promise<CheckResult> {
  let url: URL;
  try { url = new URL(rawUrl.trim()); } catch { return "broken"; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "broken";

  // HEAD primeiro (rápido)
  const head = await attempt(url, "HEAD");
  if (head.status === "timeout") return "unknown";

  // Se HEAD não é confiável (método não suportado, bloqueado), tenta GET.
  const headNum = typeof head.status === "number" ? head.status : -1;
  const needGet = head.status === "neterr"
    || headNum === 0
    || headNum === 403
    || headNum === 405
    || headNum === 501
    || headNum >= 400; // sempre confirma com GET para inspecionar corpo

  let final: FetchOutcome = head;
  if (needGet) final = await attempt(url, "GET");

  const s = final.status;
  if (s === "timeout") return "unknown";
  if (s === "neterr") return "broken";

  if (transientStatuses.has(s)) return "unknown";
  if (!okStatuses.has(s)) return "broken"; // 404, 410, 403 persistente, etc.

  // 2xx/3xx: inspecionar conteúdo para soft-404.
  const isHtml = (final.contentType || "").toLowerCase().includes("text/html")
    || (final.body && /<html[\s>]/i.test(final.body));
  if (isHtml) {
    if (isSoftDead(final.body)) return "broken";
    if (suspiciousRedirect(url, final.finalUrl)) return "broken";
  }
  return "ok";
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

  const summary: Record<string, { ok: number; broken: number; unknown: number; skipped: number }> = {
    editais: { ok: 0, broken: 0, unknown: 0, skipped: 0 },
    palcos:  { ok: 0, broken: 0, unknown: 0, skipped: 0 },
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

    const rows = (data || []) as { id: string; link: string; link_status: string | null }[];
    const checked = await mapWithLimit(rows, 6, async (r) => ({
      id: r.id,
      prev: r.link_status,
      status: await checkLinkAlive(r.link),
    }));

    const now = new Date().toISOString();
    const key = table === "editais" ? "editais" : "palcos";
    for (const c of checked) {
      // Em "unknown" preservamos o link_status anterior (não rebaixa um link que estava ok),
      // apenas atualizamos o timestamp para evitar reprocessar imediatamente.
      const patch: Record<string, unknown> = { link_checked_at: now };
      if (c.status !== "unknown") patch.link_status = c.status;

      const { error: upErr } = await admin
        .from(table)
        .update(patch)
        .eq("id", c.id);
      if (upErr) { summary[key].skipped++; continue; }
      summary[key][c.status]++;
    }
  }

  return new Response(JSON.stringify({ ok: true, summary }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
