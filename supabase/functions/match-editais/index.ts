import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface PerfilCultural {
  areas?: string[];
  estados?: string[];
  palavras_chave?: string[];
  porte?: string;
}

interface EditalRow {
  id: string;
  titulo: string;
  orgao: string;
  estado: string;
  area: string;
  status: string;
  abertura: string | null;
  prazo: string | null;
  link: string;
  inferido: boolean;
  created_at: string;
}

function scoreEdital(edital: EditalRow, perfil: PerfilCultural): number {
  let score = 0;

  // Area match
  if (perfil.areas && perfil.areas.length > 0) {
    const editalArea = (edital.area || "").toLowerCase();
    if (perfil.areas.some((a) => editalArea.includes(a.toLowerCase()))) score += 10;
  }

  // Estado match
  if (perfil.estados && perfil.estados.length > 0) {
    const editalEstado = (edital.estado || "").toLowerCase();
    if (editalEstado === "nacional" || editalEstado === "") {
      score += 3;
    } else if (perfil.estados.some((e) => editalEstado.includes(e.toLowerCase()))) {
      score += 5;
    }
  }

  // Status aberto
  if (edital.status === "Aberto") score += 3;

  // Keyword match in titulo/orgao
  if (perfil.palavras_chave && perfil.palavras_chave.length > 0) {
    const text = `${edital.titulo} ${edital.orgao}`.toLowerCase();
    for (const kw of perfil.palavras_chave) {
      if (text.includes(kw.toLowerCase())) score += 2;
    }
  }

  // Recency bonus (created in last 7 days)
  if (edital.created_at) {
    const age = Date.now() - new Date(edital.created_at).getTime();
    if (age < 7 * 86400000) score += 2;
  }

  return score;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const projectId = body?.project_id;
    if (!projectId) {
      return new Response(JSON.stringify({ error: "project_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get project cultural profile
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("perfil_cultural")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (projErr || !project) {
      return new Response(JSON.stringify({ error: "Projeto não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const perfil = (project.perfil_cultural || {}) as PerfilCultural;

    // Fetch user's editais
    const { data: editais, error: edErr } = await supabase
      .from("editais")
      .select("id, titulo, orgao, estado, area, status, abertura, prazo, link, inferido, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (edErr) throw edErr;

    // Score and sort
    const scored = (editais || []).map((e: EditalRow) => ({
      ...e,
      score: scoreEdital(e, perfil),
    }));

    scored.sort((a, b) => b.score - a.score);

    // Return top 20 with score > 0
    const top = scored.filter((e) => e.score > 0).slice(0, 20);

    return new Response(JSON.stringify({ matches: top, total: scored.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("match-editais error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
