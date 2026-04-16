import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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

    // Check AI usage quota (20 daily, 80 weekly)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();

    const { count: dailyCount } = await supabase
      .from("ai_invocations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", todayStart);

    if ((dailyCount ?? 0) >= 20) {
      return new Response(JSON.stringify({ error: "Limite diário de 20 gerações atingido. Tente novamente amanhã." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { count: weeklyCount } = await supabase
      .from("ai_invocations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", weekStart);

    if ((weeklyCount ?? 0) >= 80) {
      return new Response(JSON.stringify({ error: "Limite semanal de 80 gerações atingido. Tente novamente na próxima semana." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, style, format, width, height, editImageUrl, projectId, channelContext, mode, dnaContext, trackName, artistName, releaseDate } = await req.json();

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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      "Generate images based on the user's creative description below.",
      `Target format: ${format}. Aspect ratio suitable for ${width}x${height}.`,
      "All supporting text, labels, captions, and descriptions rendered in the image MUST be in Brazilian Portuguese (pt-BR). However, preserve proper names exactly as given — song titles, album titles, artist names, and band names must appear in their ORIGINAL language, never translated.",
    ];

    if (style) {
      systemParts.push(`Apply visual style: ${style}.`);
    }

    if (channelContext) {
      systemParts.push(`Adapt for this distribution channel: ${channelContext}.`);
    }

    if (trackName) {
      systemParts.push(`Song title: "${trackName}". Display this title prominently in the artwork.`);
    }
    if (artistName) {
      systemParts.push(`Artist name: "${artistName}". Include the artist name in the artwork.`);
    }
    if (releaseDate) {
      systemParts.push(`Release date: ${releaseDate}. Include this date in the artwork if appropriate.`);
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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-creative error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
