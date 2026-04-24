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
    const url = new URL(req.url);
    const specialty = url.searchParams.get("specialty") ?? "";
    const query = url.searchParams.get("q") ?? "";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    let dbQuery = supabaseAdmin
      .from("professionals")
      .select("id, name, specialty, bio, email, phone")
      .eq("active", true)
      .eq("allow_global_listing", true);

    if (specialty) {
      dbQuery = dbQuery.ilike("specialty", `%${specialty}%`);
    }
    if (query) {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,specialty.ilike.%${query}%,bio.ilike.%${query}%`);
    }

    dbQuery = dbQuery.order("name").limit(50);

    const { data, error } = await dbQuery;

    if (error) throw error;

    return new Response(JSON.stringify({ professionals: data ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
