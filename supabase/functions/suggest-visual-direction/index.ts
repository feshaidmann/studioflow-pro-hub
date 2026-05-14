// Sugere um perfil artístico inicial para a Direção Visual com base no contexto do projeto.
// Usa Lovable AI Gateway (LOVABLE_API_KEY) e devolve um ArtisticProfile pronto pra alimentar o stepper.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEXT_MODEL = "google/gemini-3-flash-preview";

interface SuggestedProfile {
  genres: string[];
  moods: string[];
  artist_refs: string;
  external_refs?: string;
  palette: string[];
  identity_phrase?: string;
}

function tryParseJson(text: string): any | null {
  try { return JSON.parse(text); } catch (_) {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
  return null;
}

function buildPrompt(ctx: {
  project_name: string;
  artist_name: string;
  project_type: string;
  stage: string;
  genre?: string | null;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  specialties?: string[];
  dna?: { genre?: string; energy?: number; valence?: number; tempo_bpm?: number } | null;
}): string {
  return `Contexto do projeto musical:
- Nome do projeto: ${ctx.project_name}
- Artista: ${ctx.artist_name || "(não informado)"}
- Tipo: ${ctx.project_type}
- Etapa atual: ${ctx.stage}
- Gênero principal do artista: ${ctx.genre || "(não informado)"}
- Cidade/Estado: ${[ctx.city, ctx.state].filter(Boolean).join(" / ") || "(não informado)"}
- Especialidades: ${(ctx.specialties || []).join(", ") || "(não informado)"}
- Bio: ${ctx.bio || "(não informado)"}
${ctx.dna ? `- DNA musical detectado: gênero ${ctx.dna.genre || "?"}, energia ${ctx.dna.energy ?? "?"}, valência ${ctx.dna.valence ?? "?"}, tempo ${ctx.dna.tempo_bpm ?? "?"} bpm` : ""}

Sugira um PERFIL ARTÍSTICO inicial para servir de rascunho na criação da identidade visual deste lançamento.
Use linguagem brasileira, autoral, sem clichês de IA. As referências devem ser de artistas REAIS, plausíveis para o gênero.
Retorne APENAS JSON válido neste formato:
{
  "genres": ["..."],
  "moods": ["...", "..."],
  "artist_refs": "Nome 1, Nome 2, Nome 3",
  "external_refs": "links ou referências visuais (filmes, fotógrafos, álbuns) — pode ficar vazio",
  "palette": ["#hex1","#hex2","#hex3","#hex4"],
  "identity_phrase": "frase curta que sintetiza a vibe do projeto"
}
Use moods do conjunto: Melancólico, Eufórico, Sombrio, Etéreo, Cru, Sofisticado, Nostálgico, Onírico, Urgente, Íntimo, Épico, Minimalista. Escolha 2 a 3.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const project_id: string | undefined = body.project_id;
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: proj, error: projErr } = await supabase
      .from("projects")
      .select("id, user_id, name, artist, project_type, stage")
      .eq("id", project_id)
      .maybeSingle();
    if (projErr || !proj || proj.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Projeto não encontrado ou sem permissão" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("primary_genre, bio, city, state, specialties")
      .eq("id", user.id)
      .maybeSingle();

    const { data: dnaRow } = await supabase
      .from("music_dna_analyses")
      .select("genre, energy, valence, tempo_bpm")
      .eq("project_id", project_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const prompt = buildPrompt({
      project_name: proj.name,
      artist_name: proj.artist,
      project_type: proj.project_type,
      stage: proj.stage,
      genre: profile?.primary_genre,
      bio: profile?.bio,
      city: profile?.city,
      state: profile?.state,
      specialties: profile?.specialties,
      dna: dnaRow ?? null,
    });

    const t0 = Date.now();
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TEXT_MODEL,
        messages: [
          { role: "system", content: "Você é um diretor de arte musical brasileiro. Devolva SEMPRE JSON válido, sem texto antes ou depois." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de uso da IA atingido. Tente novamente em alguns minutos." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const txt = await resp.text();
      console.error("suggest gen failed", resp.status, txt);
      return new Response(JSON.stringify({ error: "Falha ao sugerir direção visual" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    const parsed = tryParseJson(content) as Partial<SuggestedProfile> | null;
    if (!parsed) {
      return new Response(JSON.stringify({ error: "Resposta inválida da IA" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const suggestion: SuggestedProfile = {
      genres: Array.isArray(parsed.genres) ? parsed.genres.filter(Boolean) : [],
      moods: Array.isArray(parsed.moods) ? parsed.moods.filter(Boolean) : [],
      artist_refs: typeof parsed.artist_refs === "string" ? parsed.artist_refs : "",
      external_refs: typeof parsed.external_refs === "string" ? parsed.external_refs : "",
      palette: Array.isArray(parsed.palette) ? parsed.palette.filter((c) => typeof c === "string") : [],
      identity_phrase: typeof parsed.identity_phrase === "string" ? parsed.identity_phrase : "",
    };

    // Best-effort log (non-blocking)
    try {
      await supabase.from("ai_invocations").insert({
        function_name: "suggest-visual-direction",
        model: TEXT_MODEL,
        status: "success",
        user_id: user.id,
        tokens_input: data?.usage?.prompt_tokens ?? null,
        tokens_output: data?.usage?.completion_tokens ?? null,
      } as any);
    } catch (_) {}

    console.log(`suggest-visual-direction ok in ${Date.now() - t0}ms`);
    return new Response(JSON.stringify({ suggestion }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-visual-direction fatal", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
