import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { url, titulo } = body;

    if (!url && !titulo) {
      return new Response(JSON.stringify({ error: "URL ou título é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!PERPLEXITY_API_KEY) {
      return new Response(JSON.stringify({ error: "API key não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = url
      ? `Acesse o edital cultural neste link: ${url}

Extraia TODOS os campos obrigatórios do formulário de inscrição deste edital. Para cada campo, retorne:
- "nome": nome do campo (ex: "Nome do proponente")
- "tipo": tipo do campo (text, textarea, number, date, file, select)
- "obrigatorio": boolean
- "descricao": breve descrição ou instrução do campo
- "opcoes": array de opções se for select (senão null)

Retorne APENAS um JSON válido no formato: { "campos": [...], "resumo_edital": "breve resumo do edital", "documentos_exigidos": ["lista de documentos"] }`
      : `Busque informações sobre o edital cultural "${titulo}".

Identifique os campos típicos obrigatórios para inscrição neste tipo de edital. Para cada campo, retorne:
- "nome": nome do campo
- "tipo": tipo do campo (text, textarea, number, date, file, select)
- "obrigatorio": boolean
- "descricao": breve descrição
- "opcoes": array de opções se for select (senão null)

Retorne APENAS um JSON válido no formato: { "campos": [...], "resumo_edital": "breve resumo", "documentos_exigidos": ["lista de documentos"] }`;

    const perplexityRes = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: "Você é um assistente especialista em editais culturais brasileiros. Extraia campos de formulários de inscrição e retorne JSON válido.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 2000,
        search_recency_filter: "month",
      }),
    });

    if (!perplexityRes.ok) {
      const errText = await perplexityRes.text();
      console.error("Perplexity error:", errText);
      throw new Error("Erro ao consultar IA");
    }

    const perplexityData = await perplexityRes.json();
    const rawContent = perplexityData.choices?.[0]?.message?.content || "";

    // Try to extract JSON from the response
    let parsed;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { campos: [], resumo_edital: rawContent, documentos_exigidos: [] };
    } catch {
      parsed = { campos: [], resumo_edital: rawContent, documentos_exigidos: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("extract-edital-fields error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
