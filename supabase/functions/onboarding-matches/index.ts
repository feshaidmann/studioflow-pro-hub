import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Require authentication — this is called from the onboarding wizard after
  // sign-up, so the user always has a valid JWT. Without this check the endpoint
  // exposed all users' editais to unauthenticated callers.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ editais: [], professionals: [], error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return new Response(
      JSON.stringify({ editais: [], professionals: [], error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    let state = "";
    let genre = "";

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      state = String(body?.state ?? "").trim();
      genre = String(body?.genre ?? "").trim();
    } else {
      const url = new URL(req.url);
      state = (url.searchParams.get("state") ?? "").trim();
      genre = (url.searchParams.get("genre") ?? "").trim();
    }

    // Use service role only for the professionals query (public listing).
    // Editais are user-owned — filter by the authenticated user's own records.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const nowIso = new Date().toISOString();

    const editaisPromise = (async () => {
      let q = userClient
        .from("editais")
        .select("id, titulo, orgao, estado, prazo, valor")
        .eq("status", "Aberto")
        .or(`prazo.gte.${nowIso},prazo.is.null`);

      if (state) {
        q = q.or(`estado.ilike.%${state}%,estado.eq.Nacional,estado.is.null,estado.eq.`);
      }

      const { data, error } = await q
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data ?? [];
    })();

    const proPromise = (async () => {
      const { data, error } = await admin
        .from("professionals")
        .select("id, name, specialty, bio")
        .eq("active", true)
        .eq("allow_global_listing", true)
        .limit(3);

      if (error) throw error;
      return (data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        specialty: p.specialty ?? "",
        city: "",
        bio: p.bio ?? "",
      }));
    })();

    const [editaisRes, proRes] = await Promise.allSettled([editaisPromise, proPromise]);

    const editais = editaisRes.status === "fulfilled" ? editaisRes.value : [];
    const professionals = proRes.status === "fulfilled" ? proRes.value : [];

    if (editaisRes.status === "rejected") {
      console.error("onboarding-matches editais failed:", editaisRes.reason);
    }
    if (proRes.status === "rejected") {
      console.error("onboarding-matches professionals failed:", proRes.reason);
    }

    return new Response(
      JSON.stringify({
        editais,
        professionals,
        context: { state, genre },
        generatedAt: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=300",
        },
        status: 200,
      },
    );
  } catch (err) {
    console.error("onboarding-matches fatal:", err);
    return new Response(
      JSON.stringify({ editais: [], professionals: [], error: "Erro interno. Tente novamente." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }
});
