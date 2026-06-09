import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { resolveGenre } from "./genre-map.ts";

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

type Confidence = "high" | "medium" | "low";

/**
 * Classifica a confiança de cada métrica com base na origem da extração e
 * na cobertura temporal. Métricas perceptuais (valence, danceability...)
 * sempre são baixas em extração preview pois usam heurística linear sem modelo treinado.
 */
function buildConfidenceBlock(features: Record<string, unknown> | null | undefined): string {
  if (!features || typeof features !== "object") return "";
  const source = String((features as Record<string, unknown>).extraction_confidence ?? "preview");
  const analyzedSec = Number((features as Record<string, unknown>).analyzed_duration_sec ?? 0);
  const isExternal = source === "external";
  const isFull = source === "full";
  const hasCoverage = analyzedSec >= 30;

  // Mapeamento por categoria de métrica
  const physical: Confidence = isExternal || isFull ? "high" : hasCoverage ? "medium" : "low";
  const rhythm: Confidence = isExternal || isFull ? "high" : "medium";
  const spectral: Confidence = isFull ? "high" : "medium";
  const perceptual: Confidence = isExternal ? "high" : isFull ? "medium" : "low";

  const lines = [
    `- lufs_integrated, true_peak_dbtp, dynamic_range_lu, rms_dbfs: confidence=${physical}`,
    `- bpm, key: confidence=${rhythm}`,
    `- spectral_centroid_hz, spectral_rolloff_hz, spectral_flatness: confidence=${spectral}`,
    `- energy, valence, danceability, acousticness, instrumentalness, liveness, speechiness: confidence=${perceptual}`,
  ];

  return `

════════════════════════════════════════════════
CONFIANÇA POR MÉTRICA (origem da extração: ${source}; cobertura analisada: ${analyzedSec || "?"}s)
════════════════════════════════════════════════
${lines.join("\n")}

REGRAS OBRIGATÓRIAS sobre confiança:
- Para métricas com confidence=high, você pode afirmar com segurança no diagnóstico.
- Para confidence=medium, use linguagem de "tendência" ou "aparente" e evite cravar números (ex.: "uma sonoridade brilhante" em vez de "centroide alto").
- Para confidence=low, NÃO construa narrativas sobre o valor. Mencione apenas como impressão geral ou OMITA. Especificamente, NÃO afirme que a faixa é "dançante", "feliz", "triste", "energética", "acústica" baseando-se apenas nesses campos quando confidence=low — esses valores vêm de heurísticas sem modelo treinado e podem estar errados.
- Quando o usuário pedir "Análise completa" e a extração ainda for preview, registre uma linha sutil ao final do diagnostico_resumo: "Análise inicial baseada em amostra rápida — recalcule com a faixa completa para diagnóstico definitivo." Sem citar termos técnicos como "preview" ou "confidence".`;
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

  const hint = payload.classifier_hint as
    | { detected?: string; score?: number; runnerUp?: { genre?: string; score?: number } | null; top3?: Array<{ genre: string; score: number }> }
    | null
    | undefined;
  const declared = (payload.genero ?? payload.genre) as string | undefined;
  const classifierBlock = hint?.detected
    ? `

CLASSIFICADOR INTERNO (cosine similarity sobre features acústicas vs. perfis médios de gêneros do catálogo):
- top1: ${hint.detected} (${Math.round((hint.score ?? 0) * 100)}%)
${hint.runnerUp ? `- top2: ${hint.runnerUp.genre} (${Math.round((hint.runnerUp.score ?? 0) * 100)}%)` : ""}
- declarado pelo usuário: ${declared || "não informado"}

Use isso APENAS para enriquecer a análise. Se o classificador divergir do declarado com confiança alta (≥75%), você pode mencionar a proximidade técnica com ${hint.detected} no diagnostico_resumo, mas NÃO contradiga o gênero declarado pelo usuário no campo genero_classificado.`
    : "";

  // Aceita tanto a forma versionada ("A.v2") quanto a base ("A"/"B") para escolher o bloco de estilo.
  const rawVariant = typeof payload.summary_variant === "string" ? payload.summary_variant : "A";
  const variant = (rawVariant.startsWith("B") ? "B" : "A") as "A" | "B";
  const variantBlock = variant === "B"
    ? `

════════════════════════════════════════════════
ESTILO DO CAMPO "diagnostico_resumo" — VARIANTE B (storytelling / contexto de escuta)
════════════════════════════════════════════════
Sobrescreva quaisquer instruções anteriores SOMENTE para o campo "diagnostico_resumo".
Mantenha 4–6 frases, linguagem 100% acessível, SEM siglas técnicas (LUFS, dBTP, LU, dBFS, Hz, dB),
SEM valores numéricos medidos e SEM nomes de plugins. Em vez de focar primeiro em sonoridade/instrumentos:
1) Abra pela SENSAÇÃO/EMOÇÃO que a faixa provoca no primeiro minuto (tensão, abraço, nostalgia, euforia, urgência, intimidade).
2) Descreva o CONTEXTO/MOMENTO do ouvinte em que a música se encaixa (manhã acordando, foco no trabalho, deslocamento de carro, festa em casa, fim de noite, escuta atenta de fone).
3) Construa uma micro-narrativa de atmosfera: que história ou cenário interno a faixa cria, como ela evolui ao longo do tempo (calma → tensão, abertura → recolhimento etc.).
4) Conecte esse "encaixe emocional" às playlists do Spotify que vivem desse tipo de sensação (editoriais de mood como Chill, Foco, Sad Hour, Festa em Casa; algorítmicas como Radar de Lançamentos / Release Radar; playlists temáticas de contexto).
5) Feche com um único ajuste — não técnico — que tornaria esse encaixe emocional ainda mais nítido.
Tom de crítico-parceiro acolhedor, sem promessas de sucesso e sem alarmismo.`
    : `

════════════════════════════════════════════════
ESTILO DO CAMPO "diagnostico_resumo" — VARIANTE A (sonoridade / instrumentação)
════════════════════════════════════════════════
Siga as instruções já dadas: 4–6 frases acessíveis, foco em SONORIDADE (peso, brilho, espaço, textura, intimidade ou abertura)
e em INSTRUMENTOS PROTAGONISTAS (quem conduz, quem sustenta, papel do vocal),
enquadrando no que o Spotify valoriza para destacar uma faixa.`;

  const confidenceBlock = buildConfidenceBlock(payload.features as Record<string, unknown> | null | undefined);

  const stage = String(payload.stage ?? "master").toLowerCase();
  const stageBlock = stage === "demo"
    ? `\n\n════════════════════════════════════════════════\nESTÁGIO: DEMO — o artista declarou que esta gravação é uma DEMO (ideia/arranjo).\n════════════════════════════════════════════════\n- NÃO cobre LUFS, True Peak ou competitividade de streaming. Mencione isso apenas como referência futura, nunca como problema atual.\n- Foque em: identidade artística, contraste verso/refrão, escolhas de arranjo, intenção do vocal, presença de elementos que vão sustentar a faixa quando for mixada/masterizada.\n- Em "proximos_passos", priorize ações de COMPOSIÇÃO/ARRANJO/CAPTAÇÃO. Evite passos de mix/master final.\n- diagnostico_resumo termina com o próximo passo CRIATIVO mais valioso antes de levar pra mix.`
    : stage === "mix"
    ? `\n\n════════════════════════════════════════════════\nESTÁGIO: MIX — o artista declarou que esta versão está em MIXAGEM (arranjo fechado, ainda sem master final).\n════════════════════════════════════════════════\n- NÃO cobre LUFS de streaming (será decidido no master). Pode mencionar como referência ("seu mix está em X LUFS; o master vai chegar perto de −14").\n- COBRE True Peak (proteger o sinal antes do master) e Dynamic Range mínimo (não destruir a dinâmica antes da hora).\n- Foque em: balanço entre elementos, espaço estéreo, headroom, dinâmica preservada, contraste verso/refrão.\n- Em "proximos_passos", priorize ajustes de MIX DIY. Master fica para a etapa seguinte.`
    : `\n\n════════════════════════════════════════════════\nESTÁGIO: MASTER — o artista declarou que esta é a versão final pronta para distribuição.\n════════════════════════════════════════════════\n- COBRE integralmente LUFS (alvo −14 para streaming), True Peak (≤ −1 dBTP) e Dynamic Range.\n- Pode falar de pitch para playlists editoriais e algorítmicas; competitividade de streaming é tema válido aqui.`;

  return `${prompt}${variantBlock}${stageBlock}

════════════════════════════════════════════════
ATRIBUTOS ESTILO SPOTIFY — FONTE CONSOLIDADA
════════════════════════════════════════════════
${features}${confidenceBlock}

Benchmark estatístico do gênero (médias):
${benchmarkCtx}

Contexto estatístico do gênero (medianas do catálogo — referência de distribuição típica do estilo, NÃO comparação direta com a faixa do usuário):
${genreCtx}

VIZINHOS MAIS PRÓXIMOS NO CATÁLOGO REAL — comparativo TÉCNICO calibrado por atributos extraídos da faixa do usuário (LUFS, dinâmica, espectro, ritmo, perceptivos). similarity_score 0–1 reflete proximidade ponderada. Faixas ≥ 0,80 = alta; 0,55–0,80 = moderada; < 0,55 = apenas referência aproximada. A lista já vem ordenada por proximidade técnica decrescente (NÃO está em ordem alfabética):
${neighborsCtx}

INSTRUÇÃO ADICIONAL OBRIGATÓRIA para "referencias_proximas":
1) Use EXCLUSIVAMENTE os vizinhos desta lista, citando band+filename reais. NÃO use a lista de vocabulário semântico de artistas para esse campo. NÃO invente.
2) ORDENE estritamente por similarity_score DESCRESCENTE. Proibido ordenar por nome de banda, filename ou qualquer critério alfabético.
3) CITE SOMENTE vizinhos com similarity_score >= 0.70. Vizinhos abaixo desse piso devem ser OMITIDOS.
4) Se nenhum vizinho atingir 0.70, devolva "referencias_proximas": [] e, no diagnostico_resumo, registre em linguagem acessível (sem números) que a faixa apresenta identidade própria sem correspondência forte no catálogo atual.
5) Para cada referência citada, descreva a nuance técnica que aproxima (BPM, LUFS, range dinâmico, centroide espectral). NÃO afirme que a faixa "é" de algum artista nem use linguagem de probabilidade de identidade. Trate sempre como comparativo técnico aproximado.${classifierBlock}`;
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

function structuredLog(level: "info" | "error", event: string, payload: Record<string, unknown>) {
  const entry = { timestamp: new Date().toISOString(), function: "music-dna-analyze", level, event, ...payload };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
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

    structuredLog("info", "request_received", {
      action,
      prompt_length: prompt?.length ?? 0,
      payload_keys: Object.keys(payload),
      claims_sub: data.claims.sub,
      claims_email: data.claims.email,
    });

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
      // Benchmarks agora são uma VIEW agregada em tempo real — nada para recalcular.
      return jsonResponse({ success: true, analysis });
    }

    const todayUtc = new Date().toISOString().slice(0, 10);
    const { count: todayCount } = await adminClient
      .from("ai_invocations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", data.claims.sub)
      .eq("function_name", "music-dna-analyze")
      .gte("created_at", todayUtc + "T00:00:00Z");
    if ((todayCount ?? 0) >= 20) {
      return jsonResponse({
        error: "rate_limit",
        limit_type: "daily",
        limit: 20,
        used: todayCount,
        resets_at: todayUtc + "T23:59:59Z",
        message: "Limite diário de uso da IA atingido. Tente amanhã.",
      }, 429);
    }

    if (!prompt?.trim()) {
      return jsonResponse({ error: "prompt is required" }, 400);
    }

    // A/B do `diagnostico_resumo`: 50/50 aleatório por chamada.
    // Persistido junto da análise quando o usuário salvar, para reanálises
    // (visualização posterior) usarem sempre a mesma variante.
    const summaryVariant: "A" | "B" = Math.random() < 0.5 ? "A" : "B";
    const enrichedPayload = { ...payload, summary_variant: summaryVariant };

    let benchmark: unknown = null;
    let referenceExamples: unknown = null;
    let nearestNeighbors: unknown = null;
    const targetGenre = (payload.genero ?? payload.genre) as string | undefined;
    const trackFeatures = (payload.track_features ?? payload.features ?? {}) as Record<string, unknown>;

    if (targetGenre) {
      // RPC unificada com fallback automático por gênero pai
      const { data: bmRows } = await adminClient.rpc("get_benchmark_for_genre", { p_genero: targetGenre });
      benchmark = Array.isArray(bmRows) ? bmRows[0] ?? null : bmRows ?? null;

      const { data: refs } = await adminClient.rpc("get_genre_reference_examples", {
        p_genero: targetGenre,
        p_limit: 5,
      });
      referenceExamples = refs;
    }

    // Conta total no catálogo e quantas são do gênero do usuário (separadamente)
    const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

    let catalogTotal = 0;
    let catalogGenreCount = 0;
    {
      const { count: total } = await adminClient
        .from("music_reference_tracks")
        .select("id", { count: "exact", head: true });
      catalogTotal = total ?? 0;
      if (targetGenre) {
        const { count: gcount } = await adminClient
          .from("music_reference_tracks")
          .select("id", { count: "exact", head: true })
          .ilike("genre", targetGenre);
        catalogGenreCount = gcount ?? 0;
      }
    }

    // Estratégia: se há boa cobertura do gênero (>=20 faixas), usa strict_genre.
    // Caso contrário, busca no catálogo inteiro com bônus de gênero (-0.25) ajudando a priorizar.
    // GENRE_MAP: resolução UI → catálogo com limiar calibrado
    const genreResolution = resolveGenre(targetGenre ?? "");
    const useStrictGenre  = genreResolution.strict;
    const genreLabels     = genreResolution.labels;
    const genreLevel      = genreResolution.level;
    const genreNote       = genreResolution.displayNote;
    const matchedTokens   = (genreResolution as any).matchedTokens ?? [];
    const unmatchedTokens = (genreResolution as any).unmatchedTokens ?? [];

    // Telemetria: registra tokens não mapeados para evoluir o GENRE_MAP.
    if (unmatchedTokens.length > 0 || genreLevel === "absent") {
      adminClient
        .from("analytics_events")
        .insert({
          event_name: "music_dna_genre_unmatched",
          user_id: data.claims.sub,
          properties: {
            raw_input: targetGenre ?? "",
            matched_tokens: matchedTokens,
            unmatched_tokens: unmatchedTokens,
            resolved_labels: genreLabels,
            level: genreLevel,
            strict: useStrictGenre,
          },
        })
        .then(({ error }: { error: unknown }) => {
          if (error) console.warn("[music-dna-analyze] telemetry insert failed:", (error as any)?.message ?? error);
        });
    }

    // Validate and coerce MFCC / chroma arrays from the client payload (cosine
    // similarity vectors — must be exact length for the SQL function to use them).
    const toFloat8Array = (v: unknown, expectedLen: number): number[] | null => {
      if (!Array.isArray(v) || v.length !== expectedLen) return null;
      const out: number[] = [];
      for (const x of v) {
        const n = Number(x);
        if (!Number.isFinite(n)) return null;
        out.push(n);
      }
      return out;
    };
    const mfccArr = toFloat8Array(trackFeatures.mfcc, 13);
    const chromaArr = toFloat8Array(trackFeatures.chroma_cens, 12);

    const rpcArgs = {
      // Reliable scalar features (high weight)
      p_tempo_bpm: num(trackFeatures.tempo) ?? num(trackFeatures.tempo_bpm) ?? num(trackFeatures.bpm),
      p_lufs_integrated: num(trackFeatures.lufs_integrated) ?? num(trackFeatures.lufs),
      p_dynamic_range_db: num(trackFeatures.dynamic_range_db) ?? num(trackFeatures.dynamic_range_lu),
      p_spectral_centroid: num(trackFeatures.spectral_centroid_hz) ?? num(trackFeatures.spectral_centroid),
      p_spectral_flatness: num(trackFeatures.spectral_flatness),
      p_spectral_rolloff: num(trackFeatures.spectral_rolloff_hz) ?? num(trackFeatures.spectral_rolloff),
      p_spectral_bandwidth: num(trackFeatures.spectral_bandwidth),
      p_zero_crossing_rate: num(trackFeatures.zero_crossing_rate) ?? num(trackFeatures.zcr),
      // Acoustic fingerprint (highest weight when available)
      p_mfcc: mfccArr,
      p_chroma_cens: chromaArr,
      // Unreliable Spotify-style features (low weight)
      p_energy: num(trackFeatures.energy),
      p_danceability: num(trackFeatures.danceability),
      p_valence: num(trackFeatures.valence),
      p_acousticness: num(trackFeatures.acousticness),
      p_instrumentalness: num(trackFeatures.instrumentalness),
      p_speechiness: num(trackFeatures.speechiness),
      p_liveness: num(trackFeatures.liveness),
      // Metadata
      p_key_name: str(trackFeatures.key_name) ?? str(trackFeatures.key),
      p_mode: str(trackFeatures.mode) ?? str(trackFeatures.mode_name),
      p_genre_labels: genreLabels,
      p_limit: 6,
      p_strict_genre: useStrictGenre,
    };
    const { data: neighbors, error: nnError } = await adminClient.rpc("find_nearest_reference_tracks", rpcArgs);
    if (nnError) console.error("[music-dna-analyze] nearest neighbors error:", nnError);
    // Hardening: reordena defensivamente por similarity_score DESC para garantir
    // que o LLM receba os vizinhos por proximidade técnica (jamais alfabética),
    // mesmo se o RPC mudar de comportamento no futuro.
    const sortedNeighbors = Array.isArray(neighbors)
      ? [...neighbors]
          .filter((n: any) => typeof n?.similarity_score === "number")
          .sort((a: any, b: any) => Number(b.similarity_score) - Number(a.similarity_score))
          .map((n: any) => {
            // tier_hint orienta o LLM a sinalizar ao artista independente
            // se o vizinho é um par no mesmo patamar (indie/medio) ou
            // referência aspiracional (mainstream / master comercial).
            const lufs = typeof n.lufs_integrated === "number" ? n.lufs_integrated : null;
            const dr = typeof n.dynamic_range_db === "number" ? n.dynamic_range_db : null;
            const tier_hint = lufs !== null && dr !== null && lufs >= -10 && dr < 7
              ? "mainstream"
              : "indie/medio";
            return { ...n, tier_hint };
          })
      : [];
    nearestNeighbors = sortedNeighbors;
    const catalogTotalCompared = useStrictGenre ? catalogGenreCount : catalogTotal;

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
        max_tokens: 3500,
        temperature: 0.35,
        messages: [
          {
            role: "system",
            content:
              "Você é um PARCEIRO DE CARREIRA do artista independente brasileiro — produtor experiente com 20+ anos de bagagem que entende a realidade de quem grava em casa, lança por DistroKid/Onerpm/Tratore/Amuse, faz a própria divulgação e toca em formato enxuto. NÃO é engenheiro de major label cobrando padrão comercial: é aliado que traduz os dados em ações DIY acionáveis nesta semana.\n\n" +
              "PRINCÍPIOS:\n" +
              "1. Específico, nunca genérico. Cite arranjos, timbres, estruturas concretas. Ancore cada observação em dados reais.\n" +
              "2. Realidade indie: o Spotify normaliza tudo para −14 LUFS — competir loudness com major não é o jogo. O indie ganha por CLAREZA, IDENTIDADE e CONSISTÊNCIA.\n" +
              "3. Toda sugestão fora do diagnostico_tecnico precisa ser executável em casa, com plugin gratuito (TDR Nova, Youlean Loudness Meter 2 free, ReaPlugs, Voxengo SPAN, LoudMax, Vital, MeldaProduction free) ou recurso nativo da DAW (Reaper, Cakewalk, GarageBand, BandLab, Audacity). PROIBIDO recomendar mastering profissional, estúdio alugado ou engenheiro contratado como única solução.\n" +
              "4. Tom de parceiro: 'vale a pena explorar', 'uma aposta que costuma render', 'se for possível, dá pra testar'. Nunca 'urgente', 'crítico', 'imediato', 'vai bombar'.\n\n" +
              "BLOCOS DE ANÁLISE:\n" +
              "• Identidade harmônica & composicional.\n" +
              "• Produção & arranjo (instrumentação, espaço, dinâmica, timbres).\n" +
              "• Performance & vocais quando aplicável.\n" +
              "• Posicionamento indie: que playlist editorial/algorítmica/mood faz sentido; o que o artista controla (Spotify for Artists pitch, Canvas vertical, pré-save, Release Radar).\n" +
              "• Pontos de força e pontos de desenvolvimento — sem derrotar o artista.\n\n" +
              "REGRAS DE LINGUAGEM:\n" +
              "❌ Fora de diagnostico_tecnico: PROIBIDO siglas (LUFS, dBTP, dBFS, LU, kHz, Hz) e valores numéricos medidos. Traduza para frases que o artista entende.\n" +
              "❌ Não simule dados ausentes; não use promessas de sucesso; não recomende mastering pago como única saída.\n" +
              "✅ diagnostico_tecnico.* é o ÚNICO bloco com siglas e valores reais — e cada item precisa terminar com UMA frase 'como fazer' citando plugin GRATUITO ou recurso nativo da DAW.\n" +
              "✅ proximos_passos: cada 'impacto' começa com tag entre colchetes — [Mix/Master DIY], [Distribuição], [Identidade e posicionamento] ou [Ao vivo]. Cobrir pelo menos 3 dos 4 pilares. Ordem por retorno mais rápido para o indie (não padrão de major).\n" +
              "✅ diagnostico_resumo: última frase obrigatória = único passo de maior impacto executável SOZINHO em 7 dias, SEM comprar nada.\n\n" +
              "REFERENCIAS_PROXIMAS — REGRA INVIOLÁVEL: ordene SEMPRE por similarity_score DESCRESCENTE; inclua APENAS vizinhos com similarity_score >= 0.70; se nenhum atingir o piso, devolva array vazio. Cite apenas band+filename reais. No 'motivo', sinalize o patamar usando tier_hint do vizinho ('indie/medio' = par real; 'mainstream' = referência aspiracional — diga isso ao artista).\n\n" +
              "Responda SEMPRE em JSON válido, sem markdown e sem texto externo ao JSON.",
          },
          { role: "user", content: action === "generate_diagnosis" ? buildStructuredPrompt(prompt, enrichedPayload, benchmark, referenceExamples, nearestNeighbors) : prompt },
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

    return jsonResponse({
      content,
      neighbors: nearestNeighbors ?? [],
      catalog_total_compared: catalogTotalCompared,
      catalog_total: catalogTotal,
      catalog_genre_count: catalogGenreCount,
      strict_genre_used: useStrictGenre,
      genre_resolution_level: genreLevel,
      genre_resolution_note: genreNote,
      genre_matched_tokens: matchedTokens,
      genre_unmatched_tokens: unmatchedTokens,
      summary_variant: summaryVariant,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    structuredLog("error", "unhandled_exception", {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });
    return jsonResponse({ error: err.message }, 500);
  }
});
