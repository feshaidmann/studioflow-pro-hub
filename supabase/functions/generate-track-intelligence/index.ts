import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const AI_MODEL = "google/gemini-2.5-flash";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o Track Intelligence do StudioFlow Pro, um diagnóstico de prontidão de release para artistas independentes brasileiros. Sua função é analisar os dados de um projeto musical e retornar um diagnóstico estruturado em JSON.

REGRAS INVIOLÁVEIS:
1. Toda afirmação deve ser ancorada em dados do JSON de entrada. Nunca invente dados.
2. Não faça comparações com bancos de dados de faixas — você não tem esse acesso.
3. Não use linguagem vaga ou elogios genéricos. Seja direto, técnico e acionável.
4. Retorne APENAS o JSON conforme schema fornecido. Sem texto antes ou depois. Sem markdown.
5. Scores devem refletir os dados reais — não infle scores sem justificativa.
6. Recomendações devem ser específicas: citar dado do projeto, citar plataforma, citar prazo quando calculável.

Schema de saída obrigatório:
{
  "consolidated_score": number (0-100),
  "score_label": "Pronto para lançar" | "Quase lá" | "Precisa de atenção" | "Não recomendado lançar",
  "dimensions": {
    "technical": { "score": number, "justification": string },
    "completeness": { "score": number, "justification": string },
    "strategy": { "score": number, "justification": string },
    "market": { "score": number, "justification": string }
  },
  "gaps": [
    { "id": string, "title": string, "description": string, "severity": "critical"|"warning"|"ok", "action_label": string|null, "action_route": string|null }
  ],
  "recommendations": [
    { "priority": number, "title": string, "body": string }
  ],
  "summary": string
}

Cálculo do consolidated_score: (technical*0.35) + (completeness*0.25) + (strategy*0.25) + (market*0.15).
Faixas do score_label: 85-100 "Pronto para lançar", 65-84 "Quase lá", 40-64 "Precisa de atenção", 0-39 "Não recomendado lançar".
Sempre retorne entre 3 e 6 gaps e exatamente 3 recommendations.`;

function buildUserPrompt(input: any, ctx: any) {
  const today = new Date().toISOString().slice(0, 10);
  const target = new Date(input.target_release_date);
  const daysUntil = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Detect divergence between declared master_status and real Master Analyzer run
  const masterDivergence = input.master_status === "sim" && ctx.master_analyzer_run === "não";
  const checklistGapNote = ctx.release_checklist_progress != null
    ? `${ctx.release_checklist_completed ?? 0} de ${ctx.release_checklist_total ?? 0} itens (${ctx.release_checklist_progress}%)`
    : "checklist de release não iniciado";

  // Build technical block from linked DNA analysis (if any)
  const dna = ctx.dna_analysis;
  const dnaBlock = dna ? `

ANÁLISE TÉCNICA REAL (DNA Musical vinculada ao projeto — use estes números literais):
- LUFS integrado: ${dna.lufs_integrated ?? "n/a"} dB
- Dynamic range: ${dna.dynamic_range_db ?? "n/a"} dB
- Loudness: ${dna.loudness_db ?? "n/a"} dB
- BPM: ${dna.tempo_bpm ?? "n/a"}
- Tom: ${dna.key_name ?? "n/a"} ${dna.mode_name ?? ""}
- Energy: ${dna.energy ?? "n/a"} · Danceability: ${dna.danceability ?? "n/a"} · Valence: ${dna.valence ?? "n/a"}
- Gênero detectado pela análise: ${dna.genre ?? "n/a"}
- Resumo do diagnóstico técnico: ${dna.summary ?? "—"}
- Data da análise: ${dna.created_at ?? "n/a"}

REGRAS ADICIONAIS QUANDO HÁ ANÁLISE TÉCNICA:
- Em dimensions.technical.justification, cite LUFS, BPM e dynamic range literais e compare com alvos das plataformas-alvo (Spotify -14 LUFS, Apple Music -16 LUFS, YouTube -14 LUFS, TikTok -14 LUFS).
- Em recommendations, se LUFS estiver fora do alvo de alguma plataforma selecionada, gere recomendação específica citando o delta em dB.
${dna.genre && input.genre && dna.genre.toLowerCase() !== input.genre.toLowerCase() ? `- DIVERGÊNCIA DE GÊNERO: declarado "${input.genre}" mas DNA detectou "${dna.genre}". Inclua gap obrigatório warning "Gênero declarado difere da análise técnica" com action_route="/music-dna".` : ""}` : "";

  return `Analise o seguinte projeto musical e gere um diagnóstico de prontidão de release.

DADOS DECLARADOS PELO ARTISTA:
- Título da faixa: ${input.track_title}
- Gênero: ${input.genre}
- Público-alvo: ${input.target_audience}
- Data-alvo de lançamento: ${input.target_release_date} (hoje: ${today} — ${daysUntil} dias)
- Plataformas-alvo: ${(input.target_platforms || []).join(", ")}
- Objetivo do release: ${input.release_goal}
- Master validado: ${input.master_status}
- Artwork pronto: ${input.artwork_status}
- Distribuidora configurada: ${input.distributor_status}

DADOS DO PROJETO (coletados automaticamente — VERIFIQUE CONTRA O DECLARADO):
- Estágio atual: ${ctx.project_stage ?? "n/a"}
- Tarefas concluídas: ${ctx.tasks_completed ?? 0} de ${ctx.tasks_total ?? 0} (${ctx.open_tasks_count ?? 0} abertas)
- Colaboradores confirmados: ${ctx.collaborators_confirmed ?? 0} de ${ctx.collaborators_total ?? 0}
- Master Analyzer (DNA Musical) executado para esta faixa: ${ctx.master_analyzer_run ?? "desconhecido"}
- Última análise técnica: ${ctx.last_master_analysis_date ?? "nunca"}
- Progresso do checklist de release: ${checklistGapNote}
${masterDivergence ? "\n⚠️ DIVERGÊNCIA DETECTADA: artista declarou master pronto, mas nenhum Master Analyzer foi executado. INCLUA isso como gap obrigatório de severidade 'warning' com action_label='Analisar master' e action_route='/music-dna'." : ""}
${dnaBlock}

REGRAS DE ROTAS PARA action_route (use apenas estas):
- "/music-dna" → gaps técnicos / mix / master / análise acústica
- "/projects/${input.project_id ?? ""}" → gaps de projeto / colaboradores / tarefas
- "/criativo" → gaps de artwork / capa / conteúdo visual
- "/professionals" → gaps de equipe / contratação
- "/agenda" → gaps de planejamento de datas
- "/track-intelligence" → re-análise

Retorne o JSON conforme schema, sem nenhum texto adicional.`;
}

async function callAI(apiKey: string, userPrompt: string, retry = false) {
  const body: any = {
    model: AI_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  };
  if (retry) body.temperature = 0;

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`AI gateway ${r.status}: ${txt}`);
  }
  const json = await r.json();
  const content = json.choices?.[0]?.message?.content ?? "";
  return content;
}

function tryParse(content: string) {
  try { return JSON.parse(content); } catch { /**/ }
  // strip markdown fences
  const m = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) {
    try { return JSON.parse(m[1]); } catch { /**/ }
  }
  return null;
}

async function collectProjectContext(supabase: any, projectId: string | null, userId: string, trackTitle: string) {
  // Always check for prior Master Analyzer runs for this track (even without project)
  let masterAnalyzerRun: "sim" | "não" = "não";
  let lastMasterAnalysisDate: string | null = null;
  try {
    const { data: dnaList } = await supabase
      .from("music_dna_analyses")
      .select("id, created_at, track_name")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (dnaList && dnaList.length > 0) {
      const normalized = (s: string) => (s || "").trim().toLowerCase();
      const match = dnaList.find((d: any) => normalized(d.track_name) === normalized(trackTitle));
      if (match) {
        masterAnalyzerRun = "sim";
        lastMasterAnalysisDate = match.created_at;
      }
    }
  } catch (e) { console.error("DNA lookup error", e); }

  if (!projectId) {
    return { master_analyzer_run: masterAnalyzerRun, last_master_analysis_date: lastMasterAnalysisDate };
  }

  try {
    const [{ data: project }, { data: tasks }, { data: members }, { data: checklist }] = await Promise.all([
      supabase.from("projects").select("stage, name, project_type, master_done").eq("id", projectId).maybeSingle(),
      supabase.from("tasks").select("id, completed").eq("project_id", projectId).eq("dismissed", false),
      supabase.from("project_members").select("id, delivery_status").eq("project_id", projectId),
      supabase.from("release_checklists").select("items").eq("project_id", projectId).maybeSingle(),
    ]);
    const tasks_total = (tasks || []).length;
    const tasks_completed = (tasks || []).filter((t: any) => t.completed).length;
    const open_tasks_count = tasks_total - tasks_completed;
    const collaborators_total = (members || []).length;
    const collaborators_confirmed = (members || []).filter((m: any) => m.delivery_status === "ativo" || m.delivery_status === "entregue").length;

    // Compute release checklist progress
    let release_checklist_total = 0;
    let release_checklist_completed = 0;
    if (checklist?.items && typeof checklist.items === "object") {
      for (const v of Object.values(checklist.items as Record<string, any>)) {
        release_checklist_total++;
        if (v?.checked) release_checklist_completed++;
      }
    }
    const release_checklist_progress = release_checklist_total > 0
      ? Math.round((release_checklist_completed / release_checklist_total) * 100)
      : null;

    // If project.master_done is true and we found a DNA analysis, confirm it
    if (project?.master_done && masterAnalyzerRun === "não") {
      // Project marked master_done but no DNA analysis with matching track name — keep as "não"
    }

    return {
      project_stage: project?.stage ?? null,
      project_name: project?.name ?? null,
      tasks_total, tasks_completed, open_tasks_count,
      collaborators_total, collaborators_confirmed,
      master_analyzer_run: masterAnalyzerRun,
      last_master_analysis_date: lastMasterAnalysisDate,
      release_checklist_total,
      release_checklist_completed,
      release_checklist_progress,
    };
  } catch (e) {
    console.error("collectProjectContext error", e);
    return { master_analyzer_run: masterAnalyzerRun, last_master_analysis_date: lastMasterAnalysisDate };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let analysisId: string | null = null;

  try {
    const input = await req.json();
    const required = ["track_title", "genre", "target_audience", "target_release_date", "target_platforms", "release_goal", "master_status", "artwork_status", "distributor_status"];
    for (const k of required) {
      if (input[k] === undefined || input[k] === null || input[k] === "") {
        return new Response(JSON.stringify({ error: `Campo obrigatório ausente: ${k}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Insert pending row first
    const { data: inserted, error: insErr } = await supabase
      .from("track_intelligence_analyses")
      .insert({
        user_id: user.id,
        project_id: input.project_id || null,
        track_title: input.track_title,
        genre: input.genre,
        target_audience: input.target_audience,
        target_release_date: input.target_release_date,
        target_platforms: input.target_platforms,
        release_goal: input.release_goal,
        master_status: input.master_status,
        artwork_status: input.artwork_status,
        distributor_status: input.distributor_status,
        status: "pending",
      })
      .select("id")
      .single();
    if (insErr) throw insErr;
    analysisId = inserted.id;

    const ctx = await collectProjectContext(supabase, input.project_id || null, user.id, input.track_title);
    const userPrompt = buildUserPrompt({ ...input, project_id: input.project_id || null }, ctx);

    let content = await callAI(LOVABLE_API_KEY, userPrompt, false);
    let parsed = tryParse(content);
    if (!parsed) {
      content = await callAI(LOVABLE_API_KEY, userPrompt, true);
      parsed = tryParse(content);
    }
    if (!parsed) {
      throw new Error("Resposta da IA inválida");
    }

    const score = Math.round(Number(parsed.consolidated_score) || 0);
    const label = String(parsed.score_label || "");

    await supabase
      .from("track_intelligence_analyses")
      .update({
        diagnosis: parsed,
        consolidated_score: score,
        score_label: label,
        status: "completed",
      })
      .eq("id", analysisId);

    return new Response(JSON.stringify({ id: analysisId, diagnosis: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-track-intelligence error:", e);
    if (analysisId) {
      await supabase
        .from("track_intelligence_analyses")
        .update({ status: "error", error_message: e instanceof Error ? e.message : String(e) })
        .eq("id", analysisId);
    }
    return new Response(
      JSON.stringify({ error: "Diagnóstico temporariamente indisponível — tente novamente" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
