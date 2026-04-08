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

    // Use service role to bypass RLS for the update
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch invitation by token
    const { data: inv, error: fetchErr } = await adminClient
      .from("project_invitations")
      .select("*, project:projects(name, artist)")
      .eq("token", token)
      .maybeSingle();

    if (fetchErr || !inv) {
      return new Response(JSON.stringify({ error: "Invitation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check already responded
    if (inv.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "already_responded", status: inv.status }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (new Date(inv.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "invitation_expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update invitation
    const { error: updateErr } = await adminClient
      .from("project_invitations")
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

    // If accepted: look up auth user by email and set plan=free, origin=invite on their profile
    if (status === "accepted") {
      try {
        // Look up user in auth by email
        const { data: usersData } = await adminClient.auth.admin.listUsers();
        const matchedUser = usersData?.users?.find(
          (u) => u.email?.toLowerCase() === inv.professional_email?.toLowerCase()
        );

        if (matchedUser) {
          // Upsert profile with plan=free and origin=invite
          await adminClient
            .from("profiles")
            .upsert({
              id: matchedUser.id,
              plan: "free",
              origin: "invite",
              allow_global_listing: allow_global_listing ?? false,
            }, { onConflict: "id" });
        }
      } catch (profileErr) {
        // Non-fatal: log and continue
        console.error("profile update error (non-fatal):", profileErr);
      }
    }

    // If accepted AND professional consented to global listing, add to professionals table
    if (status === "accepted" && allow_global_listing === true) {
      await adminClient.from("professionals").insert({
        name: inv.professional_name,
        email: inv.professional_email,
        specialty: inv.professional_role,
        user_id: inv.invited_by,
        active: true,
        allow_global_listing: true,
      });
    }

    const projectName = (inv.project as any)?.name ?? "Projeto";
    const artistName = (inv.project as any)?.artist ?? "Artista";

    return new Response(
      JSON.stringify({ ok: true, project_name: projectName, artist_name: artistName, professional_name: inv.professional_name, project_id: inv.project_id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("respond-to-invite error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
