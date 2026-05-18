import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const token = authHeader.replace("Bearer ", "");

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !user) throw new Error("Invalid token");
    const userId = user.id;

    const { action, palco, project_id, proposal_data } = await req.json();
    if (!action || !palco) throw new Error("action and palco are required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, full_name, city, state, bio, specialties, primary_genre, work_links, youtube_url, public_email, whatsapp")
      .eq("id", userId)
      .single();

    let project: any = null;
    if (project_id) {
      const { data } = await admin
        .from("projects")
        .select("name, artist, notes, project_type, stage")
        .eq("id", project_id)
        .eq("user_id", userId)
        .single();
      project = data;
    }

    const artistName = profile?.full_name || profile?.display_name || "Artista";
    const location = [profile?.city, profile?.state].filter(Boolean).join("/") || "Brasil";
    const genres = profile?.primary_genre || (profile?.specialties || []).join(", ") || "música autoral";
    const workLinks = Array.isArray(profile?.work_links)
      ? profile!.work_links.map((l: any) => l?.url || l).filter(Boolean).slice(0, 5)
      : [];
    if (profile?.youtube_url) workLinks.unshift(profile.youtube_url);

    const palcoCtx = `Nome: ${palco.titulo || palco.nome}
Organizador: ${palco.organizador || "-"}
Tipo: ${palco.porteOuTipo || palco.tipo_palco || "palco"}
Local: ${palco.estado || "-"}
Resumo: ${palco.resumo || "-"}`;

    const artistCtx = `Nome artístico: ${artistName}
Cidade: ${location}
Gênero: ${genres}
Bio atual: ${profile?.bio || "(sem bio)"}
${project ? `Projeto em foco: ${project.name} — ${project.notes || ""}` : ""}
Links: ${workLinks.join(" | ") || "(nenhum)"}`;

    let systemPrompt = "";
    let userMessage = "";

    if (action === "generate_epk") {
      systemPrompt = `Você é um(a) booker e produtor(a) musical brasileiro(a). Escreva um EPK (Electronic Press Kit) enxuto, profissional e em português do Brasil, em Markdown. Estrutura: ## Sobre, ## Releases & Trabalhos, ## Ficha técnica básica, ## Contato. Não invente prêmios, datas ou números. Use somente o que está nos dados. Tom: confiante, direto, sem clichês. Máx. 350 palavras.`;
      userMessage = `Gere o EPK para apresentação ao seguinte palco:\n\n=== PALCO ===\n${palcoCtx}\n\n=== ARTISTA ===\n${artistCtx}`;
    } else if (action === "generate_pitches") {
      systemPrompt = `Você é um(a) booker brasileiro(a) escrevendo cartas curtas para curadores e produtores de palcos/festivais. Devolva APENAS um JSON válido (sem markdown, sem comentários) no formato:
{
  "subject_suggestions": ["...", "...", "..."],
  "variations": {
    "formal": "texto completo do e-mail",
    "cordial": "texto completo do e-mail",
    "direto": "texto completo do e-mail"
  }
}
Cada variação deve ter saudação personalizada ao organizador, gancho de 1 linha mostrando que o artista pesquisou o palco, 3–5 linhas de proposta (quem é, por que cabe, o que entrega), CTA claro pedindo próximos passos, assinatura com nome e contato. Não invente dados.`;
      userMessage = `Gere as 3 variações de pitch + 3 sugestões de assunto.\n\n=== PALCO ===\n${palcoCtx}\n\n=== ARTISTA ===\n${artistCtx}\n\nContato do artista: ${profile?.public_email || ""} ${profile?.whatsapp ? "| WhatsApp: " + profile.whatsapp : ""}`;
    }

    // ── Novas ações: proposta comercial e rider técnico ────────────────────
    if (action === "generate_commercial_proposal") {
      const pd = proposal_data || {};
      systemPrompt = `Você é um(a) booker brasileiro(a) experiente. Escreva uma CARTA-PROPOSTA COMERCIAL formal, em português do Brasil, em Markdown. Estrutura: cabeçalho com nome do palco/organizador, parágrafo de apresentação do artista (2-3 linhas), seção "Proposta artística" (set + número de músicos + duração), seção "Condições comerciais" (cachê, deslocamento, hospedagem, alimentação, equipamento) bem clara, seção "Forma de pagamento e validade", encerramento cordial com assinatura. Tom profissional, objetivo e cordial. Use os números EXATAMENTE como informados — não arredonde, não invente. Máx. 450 palavras.`;
      userMessage = `Gere a carta-proposta comercial.

=== PALCO ===
${palcoCtx}

=== ARTISTA ===
${artistCtx}

=== CONDIÇÕES COMERCIAIS INFORMADAS ===
Cachê bruto: R$ ${Number(pd.cache_bruto || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
Número de músicos: ${pd.num_musicos || "—"}
Duração do set: ${pd.duracao_min ? pd.duracao_min + " minutos" : "—"}
Deslocamento incluso: ${pd.deslocamento ? "sim" : "por conta do contratante"}
Hospedagem inclusa: ${pd.hospedagem ? "sim" : "por conta do contratante"}
Alimentação inclusa: ${pd.alimentacao ? "sim" : "por conta do contratante"}
Equipamento próprio: ${pd.equipamento_proprio ? "sim" : "P.A. e backline por conta do palco"}
Forma de pagamento: ${pd.forma_pagamento || "50% na confirmação, 50% até o dia do show"}
Validade da proposta: ${pd.validade_dias || 15} dias`;
    } else if (action === "generate_rider_template") {
      systemPrompt = `Você é um(a) técnico(a) de áudio brasileiro(a). Gere um RIDER DE ÁUDIO básico para a formação informada. Devolva APENAS um JSON válido (sem markdown) no formato:
{
  "channels": [{"n": 1, "fonte": "...", "mic_di": "...", "obs": ""}],
  "monitors": "texto curto descrevendo monitores necessários",
  "pa_min": "P.A. mínimo recomendado",
  "obs": "observações gerais (passagem de som, equipe técnica esperada, etc.)"
}
Sugira microfones/DIs padrão de mercado (SM57, SM58, DI ativa, e609, beta52, c414…). Numere os canais sequencialmente começando em 1. Seja realista para o porte/gênero do artista.`;
      userMessage = `Gere o rider para:

=== ARTISTA ===
${artistCtx}

=== FORMAÇÃO ===
${(proposal_data?.formacao_descricao) || "Formação não detalhada — use o gênero do artista como referência"}
Número de músicos: ${proposal_data?.num_musicos || 1}`;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 2000,
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      throw new Error("AI gateway error");
    }

    const aiData = await aiRes.json();
    const raw: string = aiData.choices?.[0]?.message?.content || "";

    let result: any = { raw };
    if (action === "generate_epk") {
      result = { epk: raw.trim() };
    } else if (action === "generate_pitches") {
      const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      try {
        result = JSON.parse(cleaned);
      } catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          try { result = JSON.parse(match[0]); } catch { result = { raw: cleaned }; }
        } else {
          result = { raw: cleaned };
        }
      }
    }

    await admin.from("ai_invocations").insert({
      function_name: "palco-pitch-generate",
      model: "google/gemini-2.5-flash",
      tokens_input: aiData.usage?.prompt_tokens || 0,
      tokens_output: aiData.usage?.completion_tokens || 0,
      cost_usd: 0,
      status: "success",
      user_id: userId,
    });

    return new Response(JSON.stringify({ success: true, action, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("palco-pitch-generate error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
