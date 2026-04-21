import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-3-flash-preview";
const KEY_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const TOKEN_INPUT_USD_PER_M = 0.35;
const TOKEN_OUTPUT_USD_PER_M = 1.05;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function estimateCost(inputTokens = 0, outputTokens = 0) {
  return Number(((inputTokens / 1_000_000) * TOKEN_INPUT_USD_PER_M + (outputTokens / 1_000_000) * TOKEN_OUTPUT_USD_PER_M).toFixed(8));
}

function buildStructuredPrompt(prompt: string, payload: Record<string, unknown>, benchmark: unknown) {
  const features = payload.features ? JSON.stringify(payload.features, null, 2) : "{}";
  const benchmarkCtx = benchmark ? JSON.stringify(benchmark, null, 2) : "Sem benchmark público disponível para este gênero.";
  return `${prompt}\n\n════════════════════════════════════════════════\nATRIBUTOS ESTILO SPOTIFY — FONTE CONSOLIDADA\n════════════════════════════════════════════════\n${features}\n\nBenchmark do gênero:\n${benchmarkCtx}`;
}

async function logInvocation(adminClient: ReturnType<typeof createClient>, userId: string | null, status: "success" | "error", usage?: { prompt_tokens?: number; completion_tokens?: number }) {
  const input = usage?.prompt_tokens ?? 0;
  const output = usage?.completion_tokens ?? 0;
  await adminClient.from("ai_invocations").insert({
    function_name: "music-dna-analyze",
    model: MODEL,
    user_id: userId,
    tokens_input: input || null,
    tokens_output: output || null,
    cost_usd: estimateCost(input, output),
    status,
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !data?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { prompt } = await req.json();
    if (!prompt?.trim()) {
      return new Response(
        JSON.stringify({ error: "prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        max_tokens: 2500,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "Você é um produtor musical e engenheiro de áudio experiente. " +
              "Use linguagem técnica profissional com valores e termos de engenharia em todos os campos, " +
              "exceto no campo diagnostico_resumo onde adota tom de crítico musical acolhedor com toques técnicos. " +
              "Responda sempre em JSON válido, sem markdown e sem texto externo ao JSON.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("[music-dna-analyze] AI error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content ?? "";

    return new Response(
      JSON.stringify({ content }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[music-dna-analyze] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
