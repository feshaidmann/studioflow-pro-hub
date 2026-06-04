import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProfileRow {
  id: string;
  display_name: string;
  username: string | null;
  bio: string;
  city: string;
  state: string | null;
  public_email: string;
  whatsapp: string;
  avatar_url: string | null;
  captador_verificado: boolean;
  captador_palco_tipos: string[];
  captador_generos: string[];
  captador_regioes: string[];
  captador_porte: string[];
  captador_taxa: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { application_id } = await req.json().catch(() => ({}));
    if (!application_id || typeof application_id !== "string") {
      return new Response(JSON.stringify({ error: "application_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: app, error: appErr } = await admin
      .from("edital_applications")
      .select("id, user_id, opportunity_id")
      .eq("id", application_id)
      .single();
    if (appErr || !app || app.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: palco } = await admin
      .from("editais")
      .select("id, estado, generos, area, tipo_palco, porte")
      .eq("id", app.opportunity_id)
      .single();

    const palcoTipo: string | null = (palco?.tipo_palco as string) || (palco?.area as string) || null;
    const palcoGeneros: string[] = (palco?.generos as string[]) ?? [];
    const palcoEstado: string | null = (palco?.estado as string) || null;
    const palcoPorte: string | null = (palco?.porte as string) || null;

    const { data: candidates } = await admin
      .from("profiles")
      .select("id, display_name, username, bio, city, state, public_email, whatsapp, avatar_url, captador_verificado, captador_palco_tipos, captador_generos, captador_regioes, captador_porte, captador_taxa")
      .eq("is_captador", true)
      .eq("allow_global_listing", true)
      .limit(200);

    const list = (candidates ?? []) as ProfileRow[];
    const scored = list.map((p) => {
      let score = 0;
      const match_reasons: { label: string; detail: string; weight: number }[] = [];
      if (palcoTipo && p.captador_palco_tipos?.some((t) => t.toLowerCase() === palcoTipo.toLowerCase())) {
        score += 3;
        match_reasons.push({ label: "Tipo de palco", detail: palcoTipo, weight: 3 });
      }
      if (palcoEstado && p.captador_regioes?.includes(palcoEstado)) {
        score += 2;
        match_reasons.push({ label: "Região", detail: palcoEstado, weight: 2 });
      }
      if (palcoGeneros.length > 0) {
        const overlap = p.captador_generos?.filter((g) => palcoGeneros.includes(g)) ?? [];
        if (overlap.length > 0) {
          score += 2;
          match_reasons.push({ label: "Gênero", detail: overlap.join(", "), weight: 2 });
        }
      }
      if (palcoPorte && p.captador_porte?.includes(palcoPorte)) {
        score += 1;
        match_reasons.push({ label: "Porte", detail: palcoPorte, weight: 1 });
      }
      if (p.captador_verificado) {
        score += 0.5;
        match_reasons.push({ label: "Verificado", detail: "Perfil validado pela equipe", weight: 0.5 });
      }
      return { ...p, match_score: score, match_reasons };
    });

    scored.sort((a, b) => b.match_score - a.match_score);
    const top = scored.filter((s) => s.match_score > 0).slice(0, 5);

    return new Response(JSON.stringify({ captadores: top, palco_tipo: palcoTipo, palco_estado: palcoEstado }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Erro interno. Tente novamente." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
