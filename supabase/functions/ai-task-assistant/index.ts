import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const AI_MODEL = "google/gemini-3-flash-preview";
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
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = data.claims.sub as string;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { messages, projectsContext } = await req.json();

    // Build context block
    let contextBlock = "";
    if (projectsContext) {
      const { projects = [], activeTasks = [], financials = {}, professionals = [], alerts = [] } = projectsContext;

      const projectLines = projects.map((p: any) => {
        const paid = p.amountPaid ?? 0;
        const total = p.totalContractValue ?? 0;
        const pending = total - paid;
        return [
          `- "${p.name}" (artista: ${p.artist || "—"})`,
          `  Estágio: ${p.stage} | Progresso: ${p.mixPercent ?? 0}%`,
          p.projectType ? `  Tipo: ${p.projectType}` : "",
          total > 0 ? `  Contrato: R$${total.toFixed(0)} | Pago: R$${paid.toFixed(0)} | Pendente: R$${pending.toFixed(0)}` : "",
          p.estimatedMonths ? `  Prazo estimado: ${p.estimatedMonths} meses` : "",
        ].filter(Boolean).join("\n");
      });

      const taskLines = activeTasks.slice(0, 20).map((t: any) => {
        const parts = [`- [${t.source}]${t.severity && t.severity !== "medium" ? ` [${t.severity}]` : ""} ${t.description}`];
        if (t.dueDate) parts[0] += ` (vence: ${t.dueDate})`;
        if (t.assignedTo) parts.push(`  → ${t.assignedTo}`);
        if (t.blocked) parts.push(`  ⚠ BLOQUEADA${t.blockedReason ? `: ${t.blockedReason}` : ""}`);
        return parts.join("\n");
      });

      const alertLines = alerts.slice(0, 10).map((a: any) =>
        `- [${a.severity}] ${a.title} (projeto: ${a.project}, categoria: ${a.category})`
      );

      const profLines = professionals.slice(0, 30).map((p: any) =>
        [
          `- ${p.name}${p.specialty ? ` (${p.specialty})` : ""}${p.active ? "" : " [inativo]"}`,
          p.bio ? `  Bio: ${p.bio}` : "",
          p.phone ? `  WhatsApp: ${p.phone}` : "",
        ].filter(Boolean).join("\n")
      );

      contextBlock = `
## Estado atual (${new Date().toLocaleDateString("pt-BR")}):

### Alertas ativos (${alerts.length}):
${alertLines.length > 0 ? alertLines.join("\n") : "Nenhum alerta."}

### Projetos (${projects.length}):
${projectLines.length > 0 ? projectLines.join("\n\n") : "Nenhum projeto."}

### Tarefas pendentes (${activeTasks.length}):
${taskLines.length > 0 ? taskLines.join("\n") : "Nenhuma tarefa."}

### Resumo financeiro:
- Receita: R$${(financials.totalIncome ?? 0).toFixed(0)}
- Despesas: R$${(financials.totalExpense ?? 0).toFixed(0)}
- Lucro: R$${(financials.profit ?? 0).toFixed(0)}

### Parceiros (${professionals.length}):
${profLines.length > 0 ? profLines.join("\n") : "Nenhum parceiro."}
`;
    }

    const systemPrompt = `Você é o Assistente Operacional do StudioFlow — um parceiro prático que ajuda artistas independentes a não perderem prazos, resolverem blockers e avançarem seus projetos musicais.

FOCO PRINCIPAL (priorize nesta ordem):
1. O que está TRAVANDO o projeto do usuário (tarefas bloqueadas, colaboradores sem resposta, arquivos faltando)
2. O que PRECISA ser feito HOJE (tarefas vencidas e do dia)
3. Pendências CRÍTICAS (orçamento em risco, lançamento com problemas)
4. PRÓXIMA MELHOR AÇÃO concreta e acionável

COMPORTAMENTO OPERACIONAL:
- Quando o usuário pedir orientação geral, analise os alertas e tarefas e diga EXATAMENTE o que fazer, em que ordem
- Identifique patterns: "Você tem 3 tarefas vencidas no projeto X — comece por Y porque Z"
- Se detectar riscos, avise proativamente: orçamento >90%, convite sem resposta >5 dias, projeto parado >14 dias
- Sugira desbloquear tarefas bloqueadas com ações específicas
- Nunca dê respostas vagas como "organize melhor" — diga "abra o projeto X, vá em Equipe e cobre o João pelo stem de guitarra"

ESCOPO:
Você responde sobre produção musical (mix, master, gravação, arranjo), gestão de projetos musicais (prazos, equipe, entregas), finanças de estúdio e tarefas operacionais.
Se o usuário perguntar algo fora desses temas: "Esse tema foge do meu campo! Estou aqui pra ajudar com sua produção musical 🎵"

ESTILO:
- Português brasileiro, tom direto e encorajador
- Seja CONCISO — priorize ação sobre explicação
- Use listas com "-" para múltiplos itens
- Emojis com moderação
- Formatação simples: sem ##, sem **, apenas texto e listas
- Use dados do contexto para personalizar cada resposta

SUGESTÕES DE TAREFAS:
Quando sugerir tarefas, inclua ao final:
<sugestoes>
[{"description":"Ação concreta","priority":"high","project_id":"id-opcional"},{"description":"Outra ação","priority":"medium"}]
</sugestoes>
Use priority: "high" (urgente/blocker), "medium" (importante), "low" (quando tiver tempo).
Máximo 4 sugestões. Cada uma deve ser uma ação específica, não genérica.

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
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
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
