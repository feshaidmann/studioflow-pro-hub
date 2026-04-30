import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

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

function buildStructuredPrompt(
  prompt: string,
  payload: Record<string, unknown>,
  benchmark: unknown,
  genreExamples: unknown,
  nearestNeighbors: unknown,
) {
  const features = payload.features ? JSON.stringify(payload.features, null, 2) : "{}";
  const benchmarkCtx = benchmark ? JSON.stringify(benchmark, null, 2) : "Sem benchmark público disponível para este gênero.";
  const genreCtx = Array.isArray(genreExamples) && genreExamples.length
    ? JSON.stringify(genreExamples, null, 2)
    : "Sem faixas de referência cadastradas para este gênero.";
  const neighborsCtx = Array.isArray(nearestNeighbors) && nearestNeighbors.length
    ? JSON.stringify(nearestNeighbors, null, 2)
    : "Catálogo de referências vazio — sem vizinhos próximos.";
  return `${prompt}

════════════════════════════════════════════════
ATRIBUTOS ESTILO SPOTIFY — FONTE CONSOLIDADA
════════════════════════════════════════════════
${features}

Benchmark estatístico do gênero (médias):
${benchmarkCtx}

Faixas de referência típicas do gênero (medianas — ground truth):
${genreCtx}

VIZINHOS MAIS PRÓXIMOS NO CATÁLOGO REAL (faixas analisadas tecnicamente mais semelhantes à do usuário, ordenadas por similarity_score 0–1):
${neighborsCtx}

INSTRUÇÃO ADICIONAL: Use os "vizinhos mais próximos" acima para fundamentar o campo "referencias_proximas" do JSON, citando band+filename reais quando fizer sentido, e explicando QUAL nuance técnica (BPM, LUFS, energia, range dinâmico, centroide espectral, dançabilidade) aproxima a faixa do usuário de cada referência. Não invente artistas que não estejam nesta lista ou no pool de comparação fornecido pelo usuário.`;
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
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: __u }, error: authError } = await supabase.auth.getUser(token);
  const data = __u ? { claims: { sub: __u.id, email: __u.email } } : null;
    if (authError || !data?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const action = body.action ?? "generate_diagnosis";
    const payload = body.payload ?? body;
    const prompt = payload.prompt ?? body.prompt;

    if (action === "save_features") {
      const p = payload ?? {};
      const keyNumber = typeof p.key === "number" ? p.key : 0;
      const modeNumber = typeof p.mode === "number" ? p.mode : null;
      const { data: analysis, error: insertError } = await adminClient
        .from("music_dna_analyses")
        .insert({
          user_id: data.claims.sub,
          track_name: p.track_name ?? p.arquivo ?? "manual",
          genre: p.genero ?? p.genre ?? "",
          input_metadata: p.input_metadata ?? {},
          diagnosis: p.diagnosis ?? {},
          fonte_analise: p.fonte_analise ?? "local",
          danceability: p.danceability ?? null,
          energy: p.energy ?? null,
          key_number: keyNumber,
          key_name: KEY_NAMES[keyNumber] ?? null,
          loudness_db: p.loudness ?? p.loudness_db ?? null,
          mode_number: modeNumber,
          mode_name: modeNumber === 1 ? "major" : modeNumber === 0 ? "minor" : null,
          speechiness: p.speechiness ?? null,
          acousticness: p.acousticness ?? null,
          instrumentalness: p.instrumentalness ?? null,
          liveness: p.liveness ?? null,
          valence: p.valence ?? null,
          tempo_bpm: p.tempo ?? p.tempo_bpm ?? null,
          duration_ms: p.duration_ms ?? null,
          time_signature: p.time_signature ?? null,
          lufs_integrated: p.lufs_integrated ?? null,
          dynamic_range_db: p.dynamic_range_db ?? null,
          mbid: p.mbid ?? null,
          isrc: p.isrc ?? null,
          deezer_id: p.deezer_id ?? p.deezerId ?? null,
          spotify_id: p.spotify_id ?? null,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      const genre = p.genero ?? p.genre;
      if (genre) adminClient.rpc("recalcular_benchmark_genero", { p_genero: genre }).catch(() => undefined);
      return jsonResponse({ success: true, analysis });
    }

    if (!prompt?.trim()) {
      return jsonResponse({ error: "prompt is required" }, 400);
    }

    let benchmark: unknown = null;
    let referenceExamples: unknown = null;
    let nearestNeighbors: unknown = null;
    const targetGenre = (payload.genero ?? payload.genre) as string | undefined;
    const trackFeatures = (payload.track_features ?? payload.features ?? {}) as Record<string, unknown>;

    if (targetGenre) {
      const { data: bm } = await adminClient
        .from("music_dna_benchmarks")
        .select("*")
        .eq("genero", targetGenre)
        .maybeSingle();
      benchmark = bm;

      const { data: refs } = await adminClient.rpc("get_genre_reference_examples", {
        p_genero: targetGenre,
        p_limit: 5,
      });
      referenceExamples = refs;
    }

    // Always look for nearest neighbors in the full reference catalog using the user's actual track features
    const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const { data: neighbors, error: nnError } = await adminClient.rpc("find_nearest_reference_tracks", {
      p_tempo_bpm: num(trackFeatures.tempo) ?? num(trackFeatures.tempo_bpm) ?? num(trackFeatures.bpm),
      p_lufs_integrated: num(trackFeatures.lufs_integrated) ?? num(trackFeatures.lufs),
      p_energy: num(trackFeatures.energy),
      p_danceability: num(trackFeatures.danceability),
      p_valence: num(trackFeatures.valence),
      p_acousticness: num(trackFeatures.acousticness),
      p_instrumentalness: num(trackFeatures.instrumentalness),
      p_dynamic_range_db: num(trackFeatures.dynamic_range_db) ?? num(trackFeatures.dynamic_range_lu),
      p_spectral_centroid: num(trackFeatures.spectral_centroid_hz) ?? num(trackFeatures.spectral_centroid),
      p_genre: targetGenre ?? null,
      p_limit: 6,
      p_strict_genre: false,
    });
    if (nnError) console.error("[music-dna-analyze] nearest neighbors error:", nnError);
    nearestNeighbors = neighbors;

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
        model: MODEL,
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
          { role: "user", content: action === "generate_diagnosis" ? buildStructuredPrompt(prompt, payload, benchmark, referenceExamples, nearestNeighbors) : prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        await logInvocation(adminClient, data.claims.sub, "error").catch(() => undefined);
        return jsonResponse({ error: "Rate limit exceeded. Please try again later." }, 429);
      }
      if (aiResponse.status === 402) {
        await logInvocation(adminClient, data.claims.sub, "error").catch(() => undefined);
        return jsonResponse({ error: "Payment required. Please add credits." }, 402);
      }
      const errText = await aiResponse.text();
      console.error("[music-dna-analyze] AI error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content ?? "";
    await logInvocation(adminClient, data.claims.sub, "success", aiData.usage).catch((err) => console.error("[music-dna-analyze] invocation log error:", err));

    return jsonResponse({ content });
  } catch (error) {
    console.error("[music-dna-analyze] Error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
