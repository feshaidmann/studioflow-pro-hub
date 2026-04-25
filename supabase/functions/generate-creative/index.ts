import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers":
    "x-quota-daily-limit, x-quota-daily-used, x-quota-weekly-limit, x-quota-weekly-used, x-quota-daily-resets-at",
};

const IMAGE_MODEL = "google/gemini-3.1-flash-image-preview";

async function requestImage(messages: any[], lovableKey: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      messages,
      modalities: ["image", "text"],
    }),
  });

  return response;
}

function extractImageData(aiData: any): string | null {
  return aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Unauthorized");

    // Check if user is admin — admins têm tokens ilimitados na fase de testes
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!adminRole;

    // Check AI usage quota (20 daily, 80 weekly) — counted in BRT (UTC-3)
    // Admins bypass quotas (effectively unlimited)
    const DAILY_LIMIT = isAdmin ? Number.MAX_SAFE_INTEGER : 20;
    const WEEKLY_LIMIT = isAdmin ? Number.MAX_SAFE_INTEGER : 80;
    const BRT_OFFSET_MS = -3 * 60 * 60 * 1000; // BRT = UTC-3

    const now = new Date();
    // Convert "now" to BRT, then take start of day, then convert back to UTC instant
    const nowBRT = new Date(now.getTime() + BRT_OFFSET_MS);
    const todayStartBRT = new Date(Date.UTC(nowBRT.getUTCFullYear(), nowBRT.getUTCMonth(), nowBRT.getUTCDate()));
    const todayStartUTC = new Date(todayStartBRT.getTime() - BRT_OFFSET_MS);
    // Week starts on Sunday (BRT)
    const dayOfWeek = nowBRT.getUTCDay();
    const weekStartBRT = new Date(Date.UTC(nowBRT.getUTCFullYear(), nowBRT.getUTCMonth(), nowBRT.getUTCDate() - dayOfWeek));
    const weekStartUTC = new Date(weekStartBRT.getTime() - BRT_OFFSET_MS);
    // Reset times: tomorrow 00:00 BRT and next Sunday 00:00 BRT
    const tomorrowResetUTC = new Date(todayStartUTC.getTime() + 24 * 60 * 60 * 1000);
    const nextWeekResetUTC = new Date(weekStartUTC.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { count: dailyCount } = await supabase
      .from("ai_invocations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", todayStartUTC.toISOString());

    if ((dailyCount ?? 0) >= DAILY_LIMIT) {
      return new Response(JSON.stringify({
        error: "rate_limit",
        limit_type: "daily",
        limit: DAILY_LIMIT,
        used: dailyCount ?? DAILY_LIMIT,
        resets_at: tomorrowResetUTC.toISOString(),
        message: `Você usou todas as ${DAILY_LIMIT} gerações de hoje.`,
      }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { count: weeklyCount } = await supabase
      .from("ai_invocations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", weekStartUTC.toISOString());

    if ((weeklyCount ?? 0) >= WEEKLY_LIMIT) {
      return new Response(JSON.stringify({
        error: "rate_limit",
        limit_type: "weekly",
        limit: WEEKLY_LIMIT,
        used: weeklyCount ?? WEEKLY_LIMIT,
        resets_at: nextWeekResetUTC.toISOString(),
        message: `Você usou todas as ${WEEKLY_LIMIT} gerações desta semana.`,
      }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Quota headers (so frontend can show "X restantes" without an extra call)
    const quotaHeaders = {
      "X-Quota-Daily-Limit": String(DAILY_LIMIT),
      "X-Quota-Daily-Used": String((dailyCount ?? 0) + 1), // +1 because this call will count
      "X-Quota-Weekly-Limit": String(WEEKLY_LIMIT),
      "X-Quota-Weekly-Used": String((weeklyCount ?? 0) + 1),
      "X-Quota-Daily-Resets-At": tomorrowResetUTC.toISOString(),
    };

    const { prompt, style, format, width, height, editImageUrl, referenceMode, projectId, channelContext, mode, dnaContext, trackName, artistName, releaseDate, additionalText, noText, platform, objective, tone, campaignPhase, length, hashtagsMode } = await req.json();

    // TEXT MODE — generate social media copy
    if (mode === "text") {
      if (!prompt) {
        return new Response(JSON.stringify({ error: "Missing prompt for text mode" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const textSystemPrompt = [
        "Você é um copywriter de lançamento musical para artistas independentes no Brasil.",
        "A legenda deve vender/divulgar a música primeiro: destacar faixa, artista, momento de campanha, convite para ouvir/salvar/compartilhar e conexão emocional com o público.",
        "Use estética e DNA Musical apenas para vocabulário, clima e sensibilidade cultural; nunca transforme a legenda em descrição da capa ou análise técnica.",
        "Adapte estrutura e tamanho ao canal: TikTok/Reels/Shorts pedem gancho forte na primeira linha e CTA curto; Instagram aceita storytelling breve; Spotify/streaming pede chamada direta para ouvir/salvar; WhatsApp pede tom comunitário e íntimo.",
        "Adapte o CTA ao objetivo informado. Se for pré-save/salvar, o pedido principal deve ser salvar/ativar lembrete; se for comentário, faça uma pergunta; se for show, direcione para agenda/contratação.",
        "Tamanho: curto = até 220 caracteres; médio = 1-2 parágrafos curtos; storytelling = até 4 parágrafos curtos com arco emocional.",
        "Hashtags: sem hashtags = nenhuma; poucas = 2-3; moderadas = 5-8. Use hashtags relevantes, não genéricas demais.",
        "Sempre escreva em pt-BR natural, sem explicar decisões e sem aspas envolvendo a legenda.",
        "Responda APENAS com a legenda, sem explicações adicionais.",
        trackName ? `Música: ${trackName}` : "",
        artistName ? `Artista: ${artistName}` : "",
        releaseDate ? `Data de lançamento: ${releaseDate}` : "",
        platform ? `Canal principal: ${platform}` : "",
        campaignPhase ? `Fase da campanha: ${campaignPhase}` : "",
        objective ? `Objetivo da legenda: ${objective}` : "",
        tone ? `Tom de voz: ${tone}` : "",
        length ? `Tamanho desejado: ${length}` : "",
        hashtagsMode ? `Uso de hashtags: ${hashtagsMode}` : "",
        format ? `Formato criativo relacionado: ${format}` : "",
        dnaContext ? `Contexto do DNA Musical: ${dnaContext}` : "",
      ].filter(Boolean).join("\n");

      const textResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: textSystemPrompt },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!textResp.ok) {
        const status = textResp.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI text generation failed");
      }

      const textData = await textResp.json();
      const text = textData.choices?.[0]?.message?.content || "";

      // Log AI usage
      await supabase.from("ai_invocations").insert({
        user_id: user.id,
        function_name: "generate-creative-text",
        model: "google/gemini-3-flash-preview",
        status: "success",
      });

      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, ...quotaHeaders, "Content-Type": "application/json" },
      });
    }

    // IMAGE MODE (default)
    if (!prompt || !format || !width || !height) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build system instructions (separate from user content)
    const systemParts: string[] = [
      "You are a visual art generator for musicians and artists.",
      "CRITICAL TEXT RULE: The user's creative description (user message) is COMPOSITION GUIDANCE ONLY — it describes mood, style, scenery, colors, elements. You MUST NOT render any of its words, phrases or sentences as visible text, captions, labels or typography in the image. Treat the description purely as visual direction.",
      "If the creative description comes from Music DNA, interpret it as visual direction only: composition structure, subject, scene components, ambience, camera lens, lighting, color palette, depth and texture.",
      "When a song title is provided, use its meaning and emotional associations as conceptual inspiration for visual metaphors, setting, props, composition and palette — but do not render the title as visible text unless it is explicitly listed below as allowed/mandatory text.",
      "Do NOT include or depict music theory, chords, chord names, sheet music, tablature, instrument lines, DAW waveforms, technical audio diagrams, BPM/LUFS/readouts, or literal instrument-arrangement references unless the user explicitly asks for a visible instrument as an object.",
      "The ONLY text allowed in the image comes from the dedicated text fields listed below in this system prompt (track title, artist name, release date, additional text). If no such fields are provided, render NO text at all.",
      `Target format: ${format}. Aspect ratio suitable for ${width}x${height}.`,
      "Any allowed text rendered in the image MUST be in Brazilian Portuguese (pt-BR) for generic words. Proper names (song titles, album titles, artist names, band names) must appear in their ORIGINAL language exactly as given — never translated.",
    ];

    if (style) {
      systemParts.push(`Apply visual style: ${style}.`);
    }

    if (channelContext) {
      systemParts.push(`Adapt for this distribution channel: ${channelContext}.`);
    }

    if (noText) {
      systemParts.push("ABSOLUTE TEXT BAN: Do NOT render ANY text, letters, numbers, words, logos, watermarks or typography in the image. Pure visual composition only. Ignore any track title, artist name, release date or additional text fields — render none of them.");
    } else {
      if (trackName) {
        systemParts.push(`MANDATORY TEXT — SONG TITLE: You MUST render the exact string "${trackName}" as the most prominent, clearly legible typography in the image. This is the song title and is REQUIRED — do not omit it, do not paraphrase it, do not translate it, do not abbreviate it. Spell it character-for-character exactly as written. Choose typography, size and placement that make it the dominant text element of the composition.`);
      }
      if (artistName) {
        systemParts.push(`MANDATORY TEXT — ARTIST NAME: You MUST render the exact string "${artistName}" as clearly legible secondary typography in the image (smaller than the song title but still prominent). Required — do not omit, paraphrase, translate or abbreviate. Spell it character-for-character exactly as written.`);
      }
      if (releaseDate) {
        systemParts.push(`Release date: ${releaseDate}. Include as small supporting text if it fits the composition.`);
      }
      if (additionalText) {
        systemParts.push(`Additional text to render in the artwork (if appropriate): "${additionalText}". This is short supporting copy such as a tagline, edition number, or featured artist mention. Render it as legible typography only when it suits the composition.`);
      }
      if (trackName || artistName) {
        systemParts.push("CRITICAL: Verify before finalizing that every mandatory text string above appears spelled exactly as given. Misspellings, omissions, or substitutions are not acceptable.");
      }
    }

    if (editImageUrl) {
      systemParts.push("AUTHORIZED REFERENCE CONTEXT: The uploaded reference image is treated as authorized source material; assume the user holds the necessary image, likeness and related rights for promotional/artistic use.");
      systemParts.push("STRICT IDENTITY PRESERVATION: If a human face or artist appears in the reference image, preserve the artist's facial identity exactly. Do NOT modify, replace, beautify, age, de-age, distort, reconstruct or reinterpret the face.");
      systemParts.push("Do NOT change facial features, face shape, skin tone, apparent age, expression essence, distinctive marks, hairline, eye shape, nose, mouth, jawline or any identity-defining characteristic.");
      systemParts.push("Use the reference image as the identity base, not merely as style inspiration. Only adapt non-identity elements such as composition, crop, background, scenery, lighting, color palette, clothing styling, typography, format and promotional layout.");
      systemParts.push("If preserving identity conflicts with any requested visual style, prioritize identity preservation over style transformation.");
    }

    const messages: any[] = [
      { role: "system", content: systemParts.join("\n") },
    ];

    // User message is purely the creative description
    if (editImageUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: editImageUrl } },
        ],
      });
    } else {
      messages.push({ role: "user", content: prompt });
    }

    let aiResp = await requestImage(messages, lovableKey);

    if (!aiResp.ok) {
      const status = aiResp.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes. Adicione créditos na sua conta." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const txt = await aiResp.text();
      console.error("AI error:", status, txt);
      throw new Error("AI generation failed");
    }

    let aiData = await aiResp.json();
    let imageData = extractImageData(aiData);

    if (!imageData) {
      console.warn("AI returned no image; retrying with stricter image-only instruction", {
        finishReason: aiData?.choices?.[0]?.finish_reason,
        contentPreview: String(aiData?.choices?.[0]?.message?.content ?? "").slice(0, 240),
      });

      const retryMessages = [
        ...messages,
        {
          role: "user",
          content: "Gere a imagem agora. Responda obrigatoriamente com uma imagem renderizada no campo images; não responda apenas com texto.",
        },
      ];
      aiResp = await requestImage(retryMessages, lovableKey);

      if (!aiResp.ok) {
        const txt = await aiResp.text();
        console.error("AI retry error:", aiResp.status, txt);
        return new Response(JSON.stringify({ error: "Não foi possível gerar a imagem agora. Tente novamente em instantes.", code: "image_generation_failed", fallback: true }), {
          status: 200, headers: { ...corsHeaders, ...quotaHeaders, "Content-Type": "application/json" },
        });
      }

      aiData = await aiResp.json();
      imageData = extractImageData(aiData);
    }

    if (!imageData) {
      return new Response(JSON.stringify({ error: "A IA respondeu sem uma imagem. Ajuste o prompt ou tente gerar novamente.", code: "no_image_returned", fallback: true }), {
        status: 200, headers: { ...corsHeaders, ...quotaHeaders, "Content-Type": "application/json" },
      });
    }

    // Log AI usage
    await supabase.from("ai_invocations").insert({
      user_id: user.id,
      function_name: "generate-creative",
        model: IMAGE_MODEL,
      status: "success",
    });

    // Return base64 only — user saves explicitly
    return new Response(JSON.stringify({
      imageBase64: imageData,
    }), {
      headers: { ...corsHeaders, ...quotaHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-creative error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
