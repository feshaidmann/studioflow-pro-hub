import { createClient } from "jsr:@supabase/supabase-js@2";

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
      .from("project_invitations")
      .select("*, project:projects(name, artist, user_id)")
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

    const now = new Date().toISOString();

    // Update invitation with timestamps
    const { error: updateErr } = await adminClient
      .from("project_invitations")
      .update({
        status,
        allow_global_listing: allow_global_listing ?? false,
        responded_at: now,
        ...(status === "accepted" ? { accepted_at: now } : { declined_at: now }),
      })
      .eq("token", token);

    if (updateErr) {
      console.error("update error:", updateErr);
      return new Response(JSON.stringify({ error: "Failed to update invitation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If accepted: find or create user, update project_member with correct user_id
    if (status === "accepted") {
      try {
        const { data: usersData } = await adminClient.auth.admin.listUsers();
        const matchedUser = usersData?.users?.find(
          (u) => u.email?.toLowerCase() === inv.professional_email?.toLowerCase()
        );

        if (matchedUser) {
          // Upsert profile
          await adminClient
            .from("profiles")
            .upsert({
              id: matchedUser.id,
              plan: "free",
              origin: "invite",
              allow_global_listing: allow_global_listing ?? false,
            }, { onConflict: "id" });

          // Find existing project_member by project_id + email (created by project owner)
          const { data: existingMember } = await adminClient
            .from("project_members")
            .select("id")
            .eq("project_id", inv.project_id)
            .ilike("email", inv.professional_email || "")
            .maybeSingle();

          if (existingMember) {
            // UPDATE existing record with the collaborator's real user_id
            const { error: updateMemberErr } = await adminClient
              .from("project_members")
              .update({
                user_id: matchedUser.id,
                invitation_id: inv.id,
                delivery_status: "ativo",
                member_type: "collaborator",
                permissions_scope: "basic_collaborator",
                last_activity_at: now,
              })
              .eq("id", existingMember.id);

            if (updateMemberErr) {
              console.error("project_member update error (non-fatal):", updateMemberErr);
            }
          } else {
            // INSERT new record with the collaborator's user_id
            const { error: insertErr } = await adminClient
              .from("project_members")
              .insert({
                project_id: inv.project_id,
                user_id: matchedUser.id,
                name: inv.professional_name || "",
                email: inv.professional_email || "",
                role: inv.professional_role || "",
                fee: inv.fee || 0,
                invitation_id: inv.id,
                delivery_status: "ativo",
                expected_deliverable: inv.schedule_notes || "",
                delivery_due_date: inv.deadline || null,
                permissions_scope: "basic_collaborator",
                member_type: "collaborator",
                last_activity_at: now,
              });

            if (insertErr) {
              console.error("project_member insert error (non-fatal):", insertErr);
            }
          }
        }
      } catch (profileErr) {
        console.error("profile/member update error (non-fatal):", profileErr);
      }
    }

    // Global listing
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
