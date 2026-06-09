// Cria um link de compartilhamento (autenticado) para um briefing de Direção Visual.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_TTL_HOURS = new Set([1, 24, 24 * 7, 24 * 30]);

function genToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
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

    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const briefingId = String(body.briefing_id ?? "");
    const ttlHours = Number(body.ttl_hours ?? 24);
    if (!briefingId || !ALLOWED_TTL_HOURS.has(ttlHours)) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos (briefing_id, ttl_hours ∈ {1,24,168,720})" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Confirma propriedade
    const { data: briefing, error: bErr } = await supabase
      .from("visual_briefings")
      .select("id, user_id")
      .eq("id", briefingId)
      .maybeSingle();
    if (bErr || !briefing || briefing.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Briefing não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = genToken();
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();

    const { data: share, error: insErr } = await supabase
      .from("visual_briefing_shares")
      .insert({
        briefing_id: briefingId,
        token,
        created_by: user.id,
        expires_at: expiresAt,
      })
      .select("token, expires_at")
      .single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ token: share.token, expires_at: share.expires_at }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("share-visual-briefing error", e);
    return new Response(JSON.stringify({ error: "Erro interno. Tente novamente." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
