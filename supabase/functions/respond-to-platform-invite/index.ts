import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { token, status, allow_global_listing } = await req.json();

    if (!token || !["accepted", "declined"].includes(status)) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: token and status (accepted|declined) required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch invitation by token
    const { data: inv, error: fetchErr } = await adminClient
      .from("platform_invitations")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (fetchErr || !inv) {
      return new Response(JSON.stringify({ error: "Invitation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (inv.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "already_responded", status: inv.status }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(inv.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "invitation_expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update invitation
    const { error: updateErr } = await adminClient
      .from("platform_invitations")
      .update({
        status,
        allow_global_listing: allow_global_listing ?? false,
        responded_at: new Date().toISOString(),
      })
      .eq("token", token);

    if (updateErr) {
      console.error("update error:", updateErr);
      return new Response(JSON.stringify({ error: "Failed to update invitation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If accepted: add to inviter's professionals list
    if (status === "accepted") {
      try {
        // Check if professional already exists in this user's agenda
        const { data: existing } = await adminClient
          .from("professionals")
          .select("id")
          .eq("user_id", inv.invited_by)
          .eq("email", inv.invitee_email)
          .maybeSingle();

        if (!existing) {
          await adminClient.from("professionals").insert({
            name: inv.invitee_name,
            email: inv.invitee_email,
            user_id: inv.invited_by,
            active: true,
            allow_global_listing: allow_global_listing ?? false,
          });
        } else {
          // Just update allow_global_listing if changed
          await adminClient
            .from("professionals")
            .update({ allow_global_listing: allow_global_listing ?? false })
            .eq("id", existing.id);
        }

        // Create notification for the inviter
        await adminClient.from("notifications").insert({
          user_id: inv.invited_by,
          title: "Convite aceito!",
          message: `${inv.invitee_name} aceitou seu convite e foi adicionado à sua agenda.`,
          link: "/professionals",
          type: "general",
        });
      } catch (e) {
        console.error("accept side-effects error (non-fatal):", e);
      }
    } else {
      // declined — notify inviter
      try {
        await adminClient.from("notifications").insert({
          user_id: inv.invited_by,
          title: "Convite recusado",
          message: `${inv.invitee_name} recusou seu convite para a agenda.`,
          link: "/professionals",
          type: "general",
        });
      } catch (e) {
        console.error("decline notification error (non-fatal):", e);
      }
    }

    // Fetch inviter name for the response
    const { data: profile } = await adminClient
      .from("profiles")
      .select("display_name")
      .eq("id", inv.invited_by)
      .single();
    const inviterName = profile?.display_name ?? "O usuário";

    return new Response(
      JSON.stringify({
        ok: true,
        invitee_name: inv.invitee_name,
        inviter_name: inviterName,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("respond-to-platform-invite error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
