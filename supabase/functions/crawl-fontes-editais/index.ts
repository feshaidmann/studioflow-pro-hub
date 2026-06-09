// Crawler agendado de fontes de editais.
// - Lê fontes_editais ativas (com ultima_busca expirada OU fonte_id explícito)
// - Usa Firecrawl (FIRECRAWL_API_KEY) para descobrir páginas candidatas
// - Para cada candidato extraído como markdown, chama analyze-edital internamente
// - Cria entrada em `editais` com inferido=true e status='pendente_revisao'
//
// Body opcional:
//   { fonte_id?: string }  -> roda apenas essa fonte (modo manual)
//   { all?: true }         -> roda todas as ativas elegíveis (modo cron)
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIRECRAWL_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");

const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function firecrawlMap(url: string, limit = 30): Promise<string[]> {
  const r = await fetch(`${FIRECRAWL_V2}/map`, {
    method: "POST",
    headers: { Authorization: `Bearer ${FIRECRAWL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, limit, includeSubdomains: false }),
  });
  if (!r.ok) throw new Error(`Firecrawl map ${r.status}: ${await r.text()}`);
  const d = await r.json();
  const links: string[] = d?.links || d?.data?.links || [];
  return links.filter((l) => /edital|inscri|selec|chamada|concurso|fomento|premio/i.test(l));
}

async function firecrawlScrape(url: string): Promise<{ markdown: string; title?: string }> {
  const r = await fetch(`${FIRECRAWL_V2}/scrape`, {
    method: "POST",
    headers: { Authorization: `Bearer ${FIRECRAWL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, waitFor: 1500 }),
  });
  if (!r.ok) throw new Error(`Firecrawl scrape ${r.status}`);
  const d = await r.json();
  const markdown: string = d?.markdown || d?.data?.markdown || "";
  const title: string | undefined = d?.metadata?.title || d?.data?.metadata?.title;
  return { markdown, title };
}

// Chama a edge function analyze-edital via gateway interno (service role).
async function callAnalyzeEdital(text: string, title?: string, ownerId?: string) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/analyze-edital`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
    },
    body: JSON.stringify({ text: text.slice(0, 60_000), edital_title: title, dry_run: true, _internal_user: ownerId }),
  });
  if (!r.ok) return null;
  const d = await r.json().catch(() => null);
  return d?.analise ?? null;
}

async function processFonte(fonte: any): Promise<{ created: number; skipped: number; errors: number }> {
  let created = 0, skipped = 0, errors = 0;
  try {
    const links = await firecrawlMap(fonte.url_base, fonte.parametros?.limit || 20);
    for (const link of links.slice(0, 10)) {
      try {
        // Dedup por link
        const { data: existing } = await supa
          .from("editais")
          .select("id")
          .eq("link", link)
          .is("archived_at", null)
          .limit(1);
        if (existing && existing.length > 0) { skipped++; continue; }

        const { markdown, title } = await firecrawlScrape(link);
        if (!markdown || markdown.length < 300) { skipped++; continue; }

        const analise = await callAnalyzeEdital(markdown, title, fonte.user_id);

        // Extrai prazo
        let prazoIso: string | null = null;
        const firstPrazo = Array.isArray(analise?.prazos) ? analise.prazos[0] : null;
        const raw = firstPrazo?.data;
        if (raw && /^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
          const [d, m, y] = raw.split("/");
          prazoIso = `${y}-${m}-${d}`;
        }

        const { error: insErr } = await supa.from("editais").insert({
          user_id: fonte.user_id,
          titulo: title || analise?.titulo || link.split("/").pop()?.slice(0, 80) || "Edital sem título",
          orgao: fonte.nome,
          link,
          link_status: "ok",
          link_checked_at: new Date().toISOString(),
          status: "pendente_revisao",
          tipo: "fomento",
          inferido: true,
          origem_url: fonte.url_base,
          resumo: analise?.resumo ?? null,
          valor: analise?.valor ?? null,
          publico_alvo: analise?.publico_alvo ?? null,
          prazo: prazoIso,
        });
        if (insErr) { console.error("insert edital", insErr); errors++; } else { created++; }
      } catch (e) {
        console.error("processing link", link, e);
        errors++;
      }
    }
    await supa.from("fontes_editais").update({ ultima_busca: new Date().toISOString() }).eq("id", fonte.id);
  } catch (e) {
    console.error("processFonte error", e);
    errors++;
  }
  return { created, skipped, errors };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!FIRECRAWL_KEY) {
    return jsonResponse(500, { error: "FIRECRAWL_API_KEY não configurado. Conecte o Firecrawl em Connectors." });
  }
  if (!LOVABLE_KEY) {
    return jsonResponse(500, { error: "LOVABLE_API_KEY não configurado." });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { fonte_id, all } = body ?? {};

    let fontes: any[] = [];
    if (fonte_id) {
      const { data } = await supa.from("fontes_editais").select("*").eq("id", fonte_id).limit(1);
      fontes = data || [];
    } else if (all) {
      const { data } = await supa
        .from("fontes_editais")
        .select("*")
        .eq("ativo", true);
      // Filtra elegíveis (ultima_busca vazia ou expirada)
      const now = Date.now();
      fontes = (data || []).filter((f: any) => {
        if (!f.ultima_busca) return true;
        const ageH = (now - new Date(f.ultima_busca).getTime()) / 3600_000;
        return ageH >= (f.frequencia_horas || 168);
      });
    } else {
      return jsonResponse(400, { error: "Forneça fonte_id ou all=true" });
    }

    if (fontes.length === 0) {
      return jsonResponse(200, { ok: true, message: "Nenhuma fonte elegível", created: 0, skipped: 0 });
    }

    let totalCreated = 0, totalSkipped = 0, totalErrors = 0;
    const perFonte: any[] = [];
    for (const f of fontes) {
      const r = await processFonte(f);
      perFonte.push({ fonte: f.nome, ...r });
      totalCreated += r.created;
      totalSkipped += r.skipped;
      totalErrors += r.errors;
    }

    return jsonResponse(200, {
      ok: true,
      fontes_processadas: fontes.length,
      created: totalCreated,
      skipped: totalSkipped,
      errors: totalErrors,
      detail: perFonte,
    });
  } catch (e: any) {
    console.error("crawl-fontes-editais error", e);
    return jsonResponse(500, { error: e?.message ?? "Erro interno" });
  }
});
