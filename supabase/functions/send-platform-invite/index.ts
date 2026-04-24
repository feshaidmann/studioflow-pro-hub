import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { platform_invitation_id } = await req.json();
    if (!platform_invitation_id) {
      return new Response(JSON.stringify({ error: "platform_invitation_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch invitation (verify ownership)
    const { data: inv, error: invErr } = await adminClient
      .from("platform_invitations")
      .select("*")
      .eq("id", platform_invitation_id)
      .eq("invited_by", userId)
      .single();

    if (invErr || !inv) {
      return new Response(JSON.stringify({ error: "Invitation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch inviter profile for display name
    const { data: profile } = await adminClient
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();
    const inviterName = profile?.display_name ?? "Um usuário";

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appUrl = Deno.env.get("APP_URL") || "https://mix-matters-suite.lovable.app";
    const viewUrl = `${appUrl}/platform-invite/${inv.token}`;

    const emailHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Inter,system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:40px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0f0b1a;border-radius:16px;overflow:hidden;border:1px solid #2d2550">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#4c1d95,#7c3aed);padding:32px 40px;text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px">🎵 StudioFlow</h1>
          <p style="margin:8px 0 0;color:#e9d5ff;font-size:14px">Convite para fazer parte da agenda</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px">
          <p style="margin:0 0 8px;color:#c4b5fd;font-size:14px;text-transform:uppercase;letter-spacing:1px;font-weight:600">Olá${inv.invitee_name ? ", " + inv.invitee_name : ""}!</p>
          <h2 style="margin:0 0 24px;color:#f3f0ff;font-size:22px;font-weight:700;line-height:1.3">
            <span style="color:#a78bfa">${inviterName}</span> quer adicionar você à sua agenda de colaboradores no StudioFlow
          </h2>
          <div style="background:#1e1535;border:1px solid #3b2f6e;border-radius:12px;padding:20px;margin-bottom:28px">
            <p style="margin:0;color:#d4d4d4;font-size:14px;line-height:1.6">
              O StudioFlow é uma plataforma de gestão para artistas e produtores musicais. 
              Ao aceitar este convite, você entrará na agenda de <strong style="color:#a78bfa">${inviterName}</strong> 
              para possíveis colaborações em projetos futuros.
            </p>
          </div>
          <!-- CTA Button -->
          <div style="text-align:center;margin-bottom:28px">
            <a href="${viewUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.3px">
              📩 Ver convite e responder
            </a>
          </div>
          <p style="margin:0 0 0;color:#6b7280;font-size:12px;text-align:center">
            Este convite expira em 7 dias. Caso não reconheça este e-mail, ignore esta mensagem.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#0a0714;padding:20px 40px;text-align:center;border-top:1px solid #2d2550">
          <p style="margin:0;color:#4b5563;font-size:12px">StudioFlow — Gestão profissional de estúdio</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "StudioFlow <onboarding@resend.dev>",
        to: [inv.invitee_email],
        subject: `${inviterName} quer adicionar você à agenda no StudioFlow`,
        html: emailHtml,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error("Resend error:", errBody);
      return new Response(JSON.stringify({ error: "Failed to send email", detail: errBody }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await emailRes.json();

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-platform-invite error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
