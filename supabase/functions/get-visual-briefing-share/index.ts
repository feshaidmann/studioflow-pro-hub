// Endpoint público (verify_jwt=false) que devolve o briefing visual a partir de um token de share.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    let token = url.searchParams.get("token");
    if (!token && (req.method === "POST")) {
      const body = await req.json().catch(() => ({}));
      token = body?.token ?? null;
    }
    if (!token || !/^[a-f0-9]{16,128}$/.test(token)) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: share, error: sErr } = await supabase
      .from("visual_briefing_shares")
      .select("id, briefing_id, expires_at, revoked_at, view_count")
      .eq("token", token)
      .maybeSingle();
    if (sErr || !share) {
      return new Response(JSON.stringify({ error: "Link não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (share.revoked_at) {
      return new Response(JSON.stringify({ error: "Link revogado" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (new Date(share.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Link expirado" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: briefing, error: bErr } = await supabase
      .from("visual_briefings")
      .select("id, user_id, project_id, artistic_profile, approved_images, generated_images, generated_palette, approved_copy, designer_notes, created_at")
      .eq("id", share.briefing_id)
      .maybeSingle();
    if (bErr || !briefing) {
      return new Response(JSON.stringify({ error: "Briefing não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: project } = await supabase
      .from("projects")
      .select("name, artist")
      .eq("id", briefing.project_id)
      .maybeSingle();

    // Gera signed URL do PDF (se houver) com TTL = restante do share, capado em 1h
    let pdfUrl: string | null = null;
    const path = `${briefing.user_id}/${briefing.id}.pdf`;
    const remainingMs = new Date(share.expires_at).getTime() - Date.now();
    const ttlSec = Math.max(60, Math.min(3600, Math.floor(remainingMs / 1000)));
    const { data: signed } = await supabase.storage
      .from("briefings")
      .createSignedUrl(path, ttlSec);
    if (signed?.signedUrl) pdfUrl = signed.signedUrl;

    // Incrementa contador (best-effort)
    await supabase
      .from("visual_briefing_shares")
      .update({ view_count: (share.view_count ?? 0) + 1 })
      .eq("id", share.id);

    return new Response(JSON.stringify({
      briefing: {
        id: briefing.id,
        artistic_profile: briefing.artistic_profile,
        approved_images: briefing.approved_images,
        generated_images: briefing.generated_images,
        generated_palette: briefing.generated_palette,
        approved_copy: briefing.approved_copy,
        designer_notes: briefing.designer_notes,
        created_at: briefing.created_at,
      },
      project: { name: project?.name ?? null, artist: project?.artist ?? null },
      pdf_url: pdfUrl,
      expires_at: share.expires_at,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("get-visual-briefing-share error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
