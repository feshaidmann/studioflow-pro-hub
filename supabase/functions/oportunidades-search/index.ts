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

  try {
    const { query, project_id } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Query muito curta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    const cls = await classifyIntent(query);

    // Dispara em paralelo conforme classificação
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

    const results = await Promise.all(tasks);

    let editais: any[] = [];
    let palcos: any[] = [];
    const errors: Record<string, string> = {};
    for (const r of results) {
      if ("error" in r) { errors[r.kind] = r.error; continue; }
      if (r.kind === "edital") editais = r.data?.editais || [];
      else palcos = r.data?.palcos || [];
    }

    // Enriquecimento IA: gera resumo da busca + match_reason por item.
    // Falha silenciosa — se o LLM falhar, mantém os resultados sem enriquecimento.
    let summary = "";
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
              {
                role: "user",
                content: JSON.stringify({ query, items }),
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
          }),
        });
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
        }
      }
    } catch (e) {
      console.error("enrichment failed:", e);
    }

    return new Response(
      JSON.stringify({
        classification: cls.intent,
        reason: cls.reason,
        summary,
        editais,
        palcos,
        errors: Object.keys(errors).length ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("oportunidades-search error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
