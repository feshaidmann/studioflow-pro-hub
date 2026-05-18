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
    } else {
      throw new Error(`Unknown action: ${action}`);
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
