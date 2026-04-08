import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const AI_MODEL = "google/gemini-3-flash-preview";
// Custo estimado por chamada (input+output tokens médios do assistente)
const COST_PER_CALL_USD = 0.00035;

function getAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function logInvocation(userId: string | null, status: "success" | "error") {
  try {
    await getAdminClient().from("ai_invocations").insert({
      function_name: "ai-task-assistant",
      model: AI_MODEL,
      user_id: userId,
      cost_usd: COST_PER_CALL_USD,
      status,
    });
  } catch (_) { /* best-effort */ }
}

async function logError(fnName: string, message: string, details?: unknown) {
  try {
    await getAdminClient().from("function_logs").insert({
      function_name: fnName,
      level: "error",
      message: String(message),
      details: details ? JSON.parse(JSON.stringify(details, Object.getOwnPropertyNames(details))) : null,
    });
  } catch (_) { /* best-effort */ }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
  const { data, error: authError } = await supabase.auth.getClaims(token);
  if (authError || !data?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = data.claims.sub as string;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { messages, projectsContext } = await req.json();

    // Build context block from project data
    let contextBlock = "";
    if (projectsContext) {
      const { projects = [], activeTasks = [], financials = {}, professionals = [] } = projectsContext;

      const projectLines = projects.map((p: any) => {
        const paid = p.amountPaid ?? 0;
        const total = p.totalContractValue ?? 0;
        const pending = total - paid;
        const parts = [
          `- "${p.name}" (artista: ${p.artist || "—"})`,
          `  Estágio: ${p.stage} | Progresso: ${p.mixPercent ?? 0}%`,
          p.projectType ? `  Tipo: ${p.projectType}` : "",
          total > 0 ? `  Contrato: R$${total.toFixed(0)} | Pago: R$${paid.toFixed(0)} | Pendente: R$${pending.toFixed(0)}` : "",
          p.estimatedMonths ? `  Prazo estimado: ${p.estimatedMonths} meses` : "",
        ].filter(Boolean);
        return parts.join("\n");
      });

      const taskLines = activeTasks.slice(0, 15).map((t: any) =>
        `- [${t.source}] ${t.description}${t.dueDate ? ` (vence: ${t.dueDate})` : ""}`
      );

      const profLines = professionals.slice(0, 30).map((p: any) => {
        const parts = [
          `- ${p.name}${p.specialty ? ` (${p.specialty})` : ""}${p.active ? "" : " [inativo]"}`,
          p.bio ? `  Bio: ${p.bio}` : "",
          p.phone ? `  WhatsApp: ${p.phone}` : "",
        ].filter(Boolean);
        return parts.join("\n");
      });

      contextBlock = `
## Estado atual dos projetos (${new Date().toLocaleDateString("pt-BR")}):
${projectLines.length > 0 ? projectLines.join("\n\n") : "Nenhum projeto ativo."}

## Tarefas pendentes (${activeTasks.length} total):
${taskLines.length > 0 ? taskLines.join("\n") : "Nenhuma tarefa pendente."}

## Resumo financeiro:
- Receita total: R$${(financials.totalIncome ?? 0).toFixed(0)}
- Despesas: R$${(financials.totalExpense ?? 0).toFixed(0)}
- Lucro: R$${(financials.profit ?? 0).toFixed(0)}

## Parceiros / Contatos da agenda (${professionals.length}):
${profLines.length > 0 ? profLines.join("\n") : "Nenhum parceiro cadastrado."}
`;
    }

    const systemPrompt = `Você é o Assistente Técnico do JamSession — um parceiro de confiança para produtores e artistas que usam o StudioFlow. Seu jeito é amigável, próximo e animado, como um colega experiente de estúdio que fica feliz em ajudar.

Você domina mixagem, masterização e produção musical (rough mix → mix → master → release), além de contratos, pagamentos, prazos e gestão de profissionais.

ESCOPO E LIMITES:
Você SOMENTE responde perguntas relacionadas aos seguintes temas:
- Produção musical: mixagem, masterização, gravação, arranjo, composição, stages de projeto
- Gestão de projetos musicais: prazos, progresso, entrega, feedback de clientes
- Finanças de estúdio: receitas, despesas, contratos, pagamentos, inadimplência
- Agenda e colaboradores: profissionais, parceiros, convites, especialidades
- Tarefas e produtividade dentro do StudioFlow

Se o usuário perguntar algo fora desses temas, responda com simpatia e em uma linha: "Esse tema foge um pouco do meu campo! Estou aqui pra ajudar com tudo relacionado à sua produção musical e estúdio 🎵". Não elabore.

ESTILO DE RESPOSTA:
- Responda SEMPRE em português brasileiro
- Tom amigável, caloroso e encorajador — como um colega de estúdio, não um manual técnico
- Pode usar emojis com moderação para deixar as respostas mais leves 🎶
- Seja objetivo — vá ao ponto sem enrolação, mas sem ser frio
- Use listas quando houver 2 ou mais itens ou passos
- Formatação limpa: sem ##, sem **, sem markdown decorativo — apenas texto simples e listas com "-"
- Espaçamento entre parágrafos e listas para facilitar a leitura
- Evite repetir o que o usuário disse ou fazer elogios exagerados
- NÃO faça análise automática nem resumo não solicitado — responda APENAS ao que foi perguntado
- Use os dados de contexto para tornar a resposta mais personalizada e relevante

SUGESTÕES DE TAREFAS:
Quando quiser sugerir tarefas, inclua EXATAMENTE ao final da resposta (nunca no meio) um bloco neste formato:
<sugestoes>
[{"description":"Texto curto e acionável","priority":"high","project_id":"id-opcional"},{"description":"Outra tarefa","priority":"medium"}]
</sugestoes>

Use priority: "high" (urgente), "medium" (importante) ou "low" (quando tiver tempo).
Sugira apenas 1-4 tarefas mais relevantes. NUNCA use outros formatos como JSON solto, tool_code ou código.

${contextBlock}`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace Lovable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "Erro no gateway de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Register successful invocation for cost tracking (best-effort, async)
    logInvocation(userId, "success");

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-task-assistant error:", e);
    await Promise.all([
      logError("ai-task-assistant", e instanceof Error ? e.message : String(e), e),
      logInvocation(userId, "error"),
    ]);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
