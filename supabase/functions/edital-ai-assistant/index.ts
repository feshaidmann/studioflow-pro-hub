import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function buildFillFieldPrompt(
  campo: { field_name: string; field_description?: string; max_words?: number },
  edital: { title?: string; summary?: string },
  profile: { display_name?: string; city?: string; specialties?: string[] } | null,
  project: { name?: string; project_type?: string; notes?: string; artist?: string; stage?: string } | null
) {
  const systemPrompt = `Você é especialista em elaboração de projetos culturais para editais públicos brasileiros.
Preencha o campo solicitado de um formulário de inscrição em edital cultural.
Use linguagem técnica, clara e convincente, adequada a editais.
Inclua termos como impacto social, contrapartidas, diversidade, acessibilidade quando pertinentes.
Retorne APENAS o texto do campo, sem explicações, títulos ou markdown.`;

  const userMessage = `Preencha o campo "${campo.field_name}" de um formulário de inscrição em edital.

${campo.field_description ? `DESCRIÇÃO DO CAMPO: ${campo.field_description}` : ""}
LIMITE: ${campo.max_words || 500} palavras

EDITAL: ${edital.title || "Edital cultural"}
${edital.summary ? `RESUMO DO EDITAL: ${edital.summary}` : ""}

ARTISTA: ${profile?.display_name || "Artista independente"}
CIDADE: ${profile?.city || "Brasil"}
${profile?.specialties?.length ? `ESPECIALIDADES: ${profile.specialties.join(", ")}` : ""}

${project ? `PROJETO: ${project.name || "Projeto musical"}
TIPO: ${project.project_type || "single"}
DESCRIÇÃO: ${project.notes || "Projeto musical independente"}
ARTISTA: ${project.artist || ""}` : ""}`;

  return { systemPrompt, userMessage };
}

function buildRefineFieldPrompt(
  campo: { field_name: string; current_text: string; instruction: string }
) {
  const systemPrompt = `Você é especialista em elaboração de projetos culturais para editais públicos brasileiros.
Reescreva o texto conforme a instrução de refinamento. Mantenha a linguagem técnica de editais.
Retorne APENAS o texto refinado, sem explicações ou markdown.`;

  const userMessage = `Refine o campo "${campo.field_name}":

TEXTO ATUAL:
${campo.current_text}

INSTRUÇÃO: ${campo.instruction}`;

  return { systemPrompt, userMessage };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const token = authHeader.replace("Bearer ", "");

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const { data: claimsData, error: claimsError } =
      await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub)
      throw new Error("Invalid token");
    const userId = claimsData.claims.sub;

    const { action, payload } = await req.json();

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profileData } = await adminClient
      .from("profiles")
      .select("display_name, city, specialties")
      .eq("id", userId)
      .single();

    // Fetch recent lessons learned for context enrichment
    const { data: recentLessons } = await adminClient
      .from("edital_applications")
      .select("licoes_aprendidas, resultado, motivo_recusa")
      .eq("user_id", userId)
      .not("licoes_aprendidas", "eq", "")
      .order("updated_at", { ascending: false })
      .limit(5);
    
    const lessonsContext = recentLessons?.length
      ? `\n\nLIÇÕES DE CANDIDATURAS ANTERIORES:\n${recentLessons.map((l: any) => 
          `- ${l.resultado === "aprovado" ? "✅" : "❌"} ${l.licoes_aprendidas}${l.motivo_recusa ? ` (Motivo recusa: ${l.motivo_recusa})` : ""}`
        ).join("\n")}`
      : "";

    let systemPrompt = "";
    let userMessage = "";

    if (action === "fill_field") {
      let projectData = null;
      if (payload.project_id) {
        const { data } = await adminClient
          .from("projects")
          .select("name, artist, notes, project_type, stage")
          .eq("id", payload.project_id)
          .eq("user_id", userId)
          .single();
        projectData = data;
      }

      const prompts = buildFillFieldPrompt(
        {
          field_name: payload.field_name,
          field_description: payload.field_description,
          max_words: payload.max_words,
        },
        { title: payload.edital_title, summary: payload.edital_summary },
        profileData,
        projectData
      );
      systemPrompt = prompts.systemPrompt;
      userMessage = prompts.userMessage + lessonsContext;

    } else if (action === "refine_field") {
      const prompts = buildRefineFieldPrompt({
        field_name: payload.field_name,
        current_text: payload.current_text,
        instruction: payload.instruction,
      });
      systemPrompt = prompts.systemPrompt;
      userMessage = prompts.userMessage;

    } else if (action === "generate_memorial") {
      const { data: projectData } = payload.project_id
        ? await adminClient
            .from("projects")
            .select("name, artist, notes, project_type, stage")
            .eq("id", payload.project_id)
            .eq("user_id", userId)
            .single()
        : { data: null };

      systemPrompt = `Você é especialista em elaboração de projetos culturais para editais públicos e privados brasileiros.
Escreva memoriais descritivos com linguagem técnica, clara e convincente.
Sempre inclua: contexto artístico, objetivos, justificativa, metodologia, impacto esperado e contrapartidas.
Adapte o tom ao tipo de edital (municipal, estadual, federal, privado).
Retorne APENAS o texto do memorial, sem explicações ou markdown além de parágrafos.`;

      userMessage = `Elabore um memorial descritivo:

ARTISTA: ${profileData?.display_name || "Artista independente"}
CIDADE: ${profileData?.city || "Brasil"}
PROJETO: ${projectData?.name || payload.project_name || "Projeto musical"}
TIPO: ${projectData?.project_type || payload.project_type || "single"}
ESTÁGIO: ${projectData?.stage || ""}
DESCRIÇÃO: ${projectData?.notes || payload.project_description || "Projeto musical independente"}

EDITAL: ${payload.edital_title || "Edital cultural"}
CRITÉRIOS: ${payload.edital_criteria || "Não especificado"}
LIMITE DE PALAVRAS: ${payload.max_words || 1000}
${payload.additional_context ? "CONTEXTO ADICIONAL: " + payload.additional_context : ""}`;

    } else if (action === "adapt_language") {
      systemPrompt = `Você é especialista em linguagem de editais culturais brasileiros.
Reescreva textos artísticos com a linguagem técnica exigida por editais, mantendo a essência.
Inclua termos como: impacto social, contrapartidas, abrangência territorial, fomento cultural, diversidade, inclusão, acessibilidade — quando pertinentes.
Retorne APENAS o texto adaptado.`;

      userMessage = `Adapte o seguinte texto para a linguagem de edital:

TEXTO ORIGINAL: ${payload.original_text}
TIPO DE EDITAL: ${payload.edital_type || "público federal"}
PALAVRAS-CHAVE: ${payload.target_keywords?.join(", ") || "impacto social, diversidade cultural"}
LIMITE: ${payload.max_words || 500} palavras`;

    } else if (action === "review_budget") {
      const { data: transactions } = await adminClient
        .from("transactions")
        .select("description, amount, type, category")
        .eq("project_id", payload.project_id)
        .eq("user_id", userId);

      const totalExpenses =
        transactions
          ?.filter((t: any) => t.type === "despesa")
          .reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;

      systemPrompt = `Você é consultor de orçamentos para projetos culturais brasileiros.
Analise orçamentos de projetos e identifique inconsistências, itens faltantes e como adequar ao teto do edital.
Retorne uma análise objetiva com pontos de atenção e sugestões de ajuste.`;

      userMessage = `Revise o orçamento deste projeto para adequação ao edital:

ORÇAMENTO ATUAL:
Total de despesas: R$ ${totalExpenses.toFixed(2)}
Itens: ${JSON.stringify(transactions?.filter((t: any) => t.type === "despesa").slice(0, 20))}

TETO DO EDITAL: R$ ${payload.edital_budget_limit || "Não informado"}
CATEGORIAS ACEITAS: ${payload.edital_categories?.join(", ") || "Todas"}

Identifique: itens não aceitos, valores fora da realidade, itens obrigatórios faltantes.`;

    } else if (action === "generate_checklist") {
      systemPrompt = `Você é especialista em processos de inscrição em editais culturais brasileiros.
Extraia a lista completa de documentos obrigatórios e opcionais de um edital.
Retorne APENAS um JSON válido com este formato:
{
  "required": [{"label": "...", "doc_type": "...", "notes": "..."}],
  "optional": [{"label": "...", "doc_type": "...", "notes": "..."}]
}
doc_type deve ser um de: curriculo, bio_curta, bio_media, bio_longa, memorial, plano_execucao, orcamento_base, portfolio_links, declaracao, outro`;

      userMessage = `Extraia os documentos necessários para inscrição neste edital:

TÍTULO: ${payload.edital_title}
TIPO: ${payload.edital_type || "público"}
TRECHO DO EDITAL: ${payload.edital_text_excerpt || "Não fornecido — use documentos padrão para editais " + (payload.edital_type || "públicos")}`;

    } else if (action === "suggest_project_fit") {
      const { data: projects } = await adminClient
        .from("projects")
        .select("id, name, project_type, stage, artist, notes")
        .eq("user_id", userId)
        .eq("completed", false)
        .limit(10);

      systemPrompt = `Você é consultor de projetos culturais. Analise projetos e editais e determine o fit.
Retorne APENAS JSON: {"ranked": [{"project_id": "...", "project_name": "...", "fit_score": 0-100, "justification": "..."}]}
Ordene do maior para o menor fit_score.`;

      userMessage = `Qual projeto tem maior fit com este edital?

EDITAL: ${payload.edital_title}
CRITÉRIOS: ${payload.edital_criteria || "Projetos musicais independentes"}
TIPO: ${payload.edital_type || "público"}

PROJETOS DO ARTISTA:
${JSON.stringify(projects || [])}`;

    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          max_tokens: 2500,
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, t);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const responseText =
      aiData.choices?.[0]?.message?.content || "Sem resposta da IA";
    const tokens_input = aiData.usage?.prompt_tokens || 0;
    const tokens_output = aiData.usage?.completion_tokens || 0;

    await adminClient.from("ai_invocations").insert({
      function_name: "edital-ai-assistant",
      model: "google/gemini-3-flash-preview",
      tokens_input,
      tokens_output,
      cost_usd: tokens_input * 0.000000075 + tokens_output * 0.0000003,
      status: "success",
      user_id: userId,
    });

    return new Response(
      JSON.stringify({ success: true, action, response: responseText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("edital-ai-assistant error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
