import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Check AI usage quota (20 daily, 80 weekly) — counted in BRT (UTC-3)
    const DAILY_LIMIT = 20;
    const WEEKLY_LIMIT = 80;
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

    const { prompt, style, format, width, height, editImageUrl, projectId, channelContext, mode, dnaContext, trackName, artistName, releaseDate, additionalText, noText } = await req.json();

    // TEXT MODE — generate social media copy
    if (mode === "text") {
      if (!prompt) {
        return new Response(JSON.stringify({ error: "Missing prompt for text mode" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const textSystemPrompt = [
        "Você é um copywriter especializado em música e redes sociais no Brasil.",
        "Gere uma legenda criativa e engajante para Instagram/Spotify baseada na descrição do DNA musical abaixo.",
        "A legenda deve ter no máximo 280 caracteres, incluir 3-5 hashtags relevantes, e ter tom autêntico e artístico.",
        "Responda APENAS com a legenda, sem explicações adicionais.",
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
        systemParts.push(`Song title: "${trackName}". If appropriate for this format and composition, you may include it as readable typography. A minimalist composition may omit it.`);
      }
      if (artistName) {
        systemParts.push(`Artist name: "${artistName}". If appropriate, include it as readable text.`);
      }
      if (releaseDate) {
        systemParts.push(`Release date: ${releaseDate}. Include only if it fits the composition.`);
      }
      if (additionalText) {
        systemParts.push(`Additional text to render in the artwork (if appropriate): "${additionalText}". This is short supporting copy such as a tagline, edition number, or featured artist mention. Render it as legible typography only when it suits the composition.`);
      }
    }

    if (editImageUrl) {
      systemParts.push("IMPORTANT: If there are human faces in the reference image, preserve them exactly — do not alter, distort or replace any facial features. Keep the person's identity intact.");
      systemParts.push("Use the provided reference image as a base, adapting composition and layout while keeping the visual identity.");
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

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages,
        modalities: ["image", "text"],
      }),
    });

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

    const aiData = await aiResp.json();
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageData) throw new Error("No image returned from AI");

    // Log AI usage
    await supabase.from("ai_invocations").insert({
      user_id: user.id,
      function_name: "generate-creative",
      model: "google/gemini-3.1-flash-image-preview",
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
