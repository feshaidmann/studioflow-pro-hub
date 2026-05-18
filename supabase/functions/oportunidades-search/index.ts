import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Telemetria ──────────────────────────────────────────────────────────────
// function_logs: visível só p/ admin (RLS), guarda invocação/erro/duração.
// analytics_events: por usuário (quando autenticado), permite agregados de uso.
async function logFn(level: "info" | "warn" | "error", message: string, details: Record<string, unknown>) {
  try {
    await admin.from("function_logs").insert({
      function_name: "oportunidades-search",
      level,
      message,
      details,
    });
  } catch (e) {
    console.error("[telemetry] function_logs insert failed:", e);
  }
}

async function logEvent(userId: string | null, event_name: string, properties: Record<string, unknown>) {
  try {
    await admin.from("analytics_events").insert({
      event_name,
      user_id: userId,
      session_id: String(properties.run_id || ""),
      properties,
    });
  } catch (e) {
    console.error("[telemetry] analytics_events insert failed:", e);
  }
}

async function resolveUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return null;
    const { data } = await admin.auth.getUser(token);
    return data?.user?.id ?? null;
  } catch { return null; }
}

interface ClassifyResult {
  intent: "edital" | "palco" | "ambos";
  reason: string;
}

async function classifyIntent(query: string): Promise<ClassifyResult> {
  // Heurística rápida — economiza chamada IA quando a intenção é óbvia
  const q = query.toLowerCase();
  const editalHints = ["edital", "fomento", "bolsa", "prêmio", "premio", "aldir", "lei rouanet", "incentivo", "patroc"];
  const palcoHints  = ["palco", "festival", "showcase", "abertura", "residência", "residencia", "show", "circuito", "sesc apresent"];
  const hitEdital = editalHints.some((h) => q.includes(h));
  const hitPalco  = palcoHints.some((h) => q.includes(h));
  if (hitEdital && !hitPalco) return { intent: "edital", reason: "heurística" };
  if (hitPalco && !hitEdital) return { intent: "palco",  reason: "heurística" };
  if (hitEdital && hitPalco)  return { intent: "ambos",  reason: "heurística" };

  // Caso ambíguo → IA classifica
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "Classifique a intenção da busca de um artista musical em uma das três categorias: 'edital' (fomento financeiro, bolsas, prêmios, leis de incentivo), 'palco' (festivais, shows, showcases, residências, aberturas) ou 'ambos' (busca genérica que pode retornar os dois tipos). Responda apenas em JSON: {\"intent\":\"edital|palco|ambos\",\"reason\":\"...\"}.",
          },
          { role: "user", content: query },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    });
    if (!resp.ok) throw new Error(`gateway ${resp.status}`);
    const data = await resp.json();
    const txt = data?.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(txt);
    const intent = ["edital", "palco", "ambos"].includes(parsed.intent) ? parsed.intent : "ambos";
    return { intent, reason: parsed.reason || "ai" };
  } catch (e) {
    console.error("classify fallback:", e);
    return { intent: "ambos", reason: "fallback" };
  }
}

async function callInternal(name: string, body: unknown, authHeader: string | null) {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authHeader || `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`${name} ${resp.status}: ${txt.slice(0, 200)}`);
  }
  return await resp.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const run_id = crypto.randomUUID();
  const t0 = performance.now();
  const authHeader = req.headers.get("Authorization");
  const source = req.headers.get("x-invocation-source") || (req.headers.get("user-agent") || "").slice(0, 120);
  const userId = await resolveUserId(authHeader);

  await logEvent(userId, "oportunidades_search_invoked", { run_id, source });

  let classification: string | undefined;
  let editaisCount = 0;
  let palcosCount = 0;
  const subErrors: Record<string, string> = {};

  try {
    const { query, project_id } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 3) {
      const duration_ms = Math.round(performance.now() - t0);
      await logFn("warn", "Query muito curta", { run_id, duration_ms, user_id: userId, source });
      await logEvent(userId, "oportunidades_search_failed", {
        run_id, duration_ms, cause: "query_too_short", source,
      });
      return new Response(JSON.stringify({ error: "Query muito curta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tClassify0 = performance.now();
    const cls = await classifyIntent(query);
    const classify_ms = Math.round(performance.now() - tClassify0);
    classification = cls.intent;

    const tasks: Promise<{ kind: "edital" | "palco"; data: any } | { kind: "edital" | "palco"; error: string }>[] = [];

    if (cls.intent === "edital" || cls.intent === "ambos") {
      tasks.push(
        callInternal("edital-search", { query, project_id: project_id || null }, authHeader)
          .then((data) => ({ kind: "edital" as const, data }))
          .catch((e) => ({ kind: "edital" as const, error: String(e?.message || e) })),
      );
    }
    if (cls.intent === "palco" || cls.intent === "ambos") {
      tasks.push(
        callInternal("palco-search", { query, project_id: project_id || null }, authHeader)
          .then((data) => ({ kind: "palco" as const, data }))
          .catch((e) => ({ kind: "palco" as const, error: String(e?.message || e) })),
      );
    }

    const tSearch0 = performance.now();
    const results = await Promise.all(tasks);
    const search_ms = Math.round(performance.now() - tSearch0);

    let editais: any[] = [];
    let palcos: any[] = [];
    for (const r of results) {
      if ("error" in r) { subErrors[r.kind] = r.error; continue; }
      if (r.kind === "edital") editais = r.data?.editais || [];
      else palcos = r.data?.palcos || [];
    }
    editaisCount = editais.length;
    palcosCount = palcos.length;

    // Enriquecimento IA: gera resumo da busca + match_reason por item.
    // Falha silenciosa — se o LLM falhar, mantém os resultados sem enriquecimento.
    let summary = "";
    let enrich_ms = 0;
    let enrich_status: "ok" | "skipped" | "failed" = "skipped";
    try {
      const items = [
        ...editais.map((e: any, i: number) => ({
          ref: `e${i}`, tipo: "edital",
          titulo: e.titulo, org: e.orgao, estado: e.estado, prazo: e.prazo, area: e.area,
        })),
        ...palcos.map((p: any, i: number) => ({
          ref: `p${i}`, tipo: "palco",
          titulo: p.nome, org: p.organizador, estado: p.estado, prazo: p.prazo,
          generos: p.generos, porte: p.tipo_palco,
        })),
      ];
      if (items.length > 0) {
        const tEnrich0 = performance.now();
        const enrichResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content:
                  "Você ajuda artistas musicais a entender por que um edital ou palco combina (ou não) com a busca deles. Responda APENAS em JSON válido com a forma {\"summary\":\"frase única em pt-BR, máx 140 chars, descrevendo o que foi encontrado\",\"reasons\":{\"<ref>\":\"frase única em pt-BR, máx 90 chars, dizendo por que esta oportunidade aparece para esta busca\"}}. Use linguagem direta, sem marketing, sem emoji.",
              },
              { role: "user", content: JSON.stringify({ query, items }) },
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
          }),
        });
        enrich_ms = Math.round(performance.now() - tEnrich0);
        if (enrichResp.ok) {
          const enrichData = await enrichResp.json();
          const txt = enrichData?.choices?.[0]?.message?.content || "{}";
          const parsed = JSON.parse(txt);
          summary = String(parsed.summary || "").slice(0, 200);
          const reasons: Record<string, string> = parsed.reasons || {};
          editais.forEach((e: any, i: number) => {
            const r = reasons[`e${i}`];
            if (r) e.match_reason = String(r).slice(0, 140);
          });
          palcos.forEach((p: any, i: number) => {
            const r = reasons[`p${i}`];
            if (r) p.match_reason = String(r).slice(0, 140);
          });
          enrich_status = "ok";
        } else {
          enrich_status = "failed";
          subErrors.enrich = `gateway ${enrichResp.status}`;
        }
      }
    } catch (e: any) {
      enrich_status = "failed";
      subErrors.enrich = String(e?.message || e);
      console.error("enrichment failed:", e);
    }

    const duration_ms = Math.round(performance.now() - t0);
    const hasSubError = Object.keys(subErrors).length > 0;

    await logFn(hasSubError ? "warn" : "info", hasSubError ? "Concluído com erros parciais" : "Concluído", {
      run_id, duration_ms, classify_ms, search_ms, enrich_ms, enrich_status,
      classification, editais: editaisCount, palcos: palcosCount,
      user_id: userId, source, sub_errors: hasSubError ? subErrors : undefined,
    });
    await logEvent(userId, "oportunidades_search_succeeded", {
      run_id, duration_ms, classification, editais: editaisCount, palcos: palcosCount,
      enrich_status, source, sub_errors: hasSubError ? subErrors : undefined,
    });

    return new Response(
      JSON.stringify({
        run_id,
        classification: cls.intent,
        reason: cls.reason,
        summary,
        editais,
        palcos,
        errors: hasSubError ? subErrors : undefined,
        telemetry: { duration_ms, classify_ms, search_ms, enrich_ms, enrich_status },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    const duration_ms = Math.round(performance.now() - t0);
    const message = err?.message || String(err) || "erro";
    console.error("oportunidades-search error:", err);
    await logFn("error", message, {
      run_id, duration_ms, classification, user_id: userId, source,
      stack: typeof err?.stack === "string" ? err.stack.slice(0, 2000) : undefined,
      editais: editaisCount, palcos: palcosCount, sub_errors: subErrors,
    });
    await logEvent(userId, "oportunidades_search_failed", {
      run_id, duration_ms, classification, cause: message, source,
    });
    return new Response(
      JSON.stringify({ error: message, run_id }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
