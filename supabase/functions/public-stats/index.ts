import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString().slice(0, 10);

  const [artistsRes, editaisRes, publishedRes, profsRes] = await Promise.allSettled([
    supabase.from("projects").select("user_id").gte("created_at", since),
    supabase
      .from("editais")
      .select("id", { count: "exact", head: true })
      .eq("status", "Aberto")
      .gt("prazo", nowIso),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("completed", true),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("allow_global_listing", true),
  ]);

  let artistsActive = 0;
  if (artistsRes.status === "fulfilled" && !artistsRes.value.error) {
    const rows = (artistsRes.value.data ?? []) as Array<{ user_id: string | null }>;
    artistsActive = new Set(rows.map((r) => r.user_id).filter(Boolean)).size;
  } else if (artistsRes.status === "fulfilled") {
    console.error("artistsActive query error", artistsRes.value.error);
  } else {
    console.error("artistsActive rejected", artistsRes.reason);
  }

  const pickCount = (
    res: PromiseSettledResult<{ count: number | null; error: unknown }>,
    label: string,
  ): number => {
    if (res.status === "fulfilled") {
      if ((res.value as { error: unknown }).error) {
        console.error(`${label} query error`, (res.value as { error: unknown }).error);
        return 0;
      }
      return (res.value as { count: number | null }).count ?? 0;
    }
    console.error(`${label} rejected`, res.reason);
    return 0;
  };

  const payload = {
    artistsActive,
    editaisAtivos: pickCount(editaisRes as never, "editaisAtivos"),
    projectsPublished: pickCount(publishedRes as never, "projectsPublished"),
    professionalsAvailable: pickCount(profsRes as never, "professionalsAvailable"),
    generatedAt: new Date().toISOString(),
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
});
