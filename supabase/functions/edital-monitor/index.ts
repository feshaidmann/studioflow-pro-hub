import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");

interface FonteEdital {
  id: string;
  user_id: string;
  nome: string;
  url_base: string;
  tipo: "rss" | "api" | "perplexity";
  parametros: Record<string, unknown>;
  ativo: boolean;
  ultima_busca: string | null;
  frequencia_horas: number;
}

interface EditalParsed {
  titulo: string;
  orgao: string;
  estado: string;
  area: string;
  status: string;
  abertura: string | null;
  prazo: string | null;
  link: string;
  origem_url: string;
  session_key: string;
  inferido: boolean;
}

// --- RSS parsing (basic XML) ---
async function fetchRSS(url: string): Promise<EditalParsed[]> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "StudioFlow-EditalMonitor/1.0" } });
    if (!res.ok) return [];
    const xml = await res.text();
    const items: EditalParsed[] = [];

    // Simple regex-based XML item extraction
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const title = block.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/i);
      const link = block.match(/<link>(.*?)<\/link>/i);
      const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/i);

      const titulo = (title?.[1] || title?.[2] || "").trim();
      if (!titulo) continue;

      const linkStr = (link?.[1] || "").trim();
      const sessionKey = `rss_${btoa(unescape(encodeURIComponent(titulo + linkStr))).slice(0, 40)}`;

      items.push({
        titulo,
        orgao: "",
        estado: "",
        area: "",
        status: "Indefinido",
        abertura: pubDate?.[1] ? new Date(pubDate[1]).toISOString().slice(0, 10) : null,
        prazo: null,
        link: linkStr,
        origem_url: url,
        session_key: sessionKey,
        inferido: true,
      });
    }
    return items;
  } catch (err) {
    console.error("RSS fetch error:", err);
    return [];
  }
}

// --- Perplexity-based search ---
async function fetchPerplexity(fonte: FonteEdital): Promise<EditalParsed[]> {
  if (!PERPLEXITY_API_KEY) {
    console.warn("PERPLEXITY_API_KEY not configured, skipping perplexity source");
    return [];
  }

  const query = (fonte.parametros as { query?: string }).query || fonte.nome;
  const systemPrompt = `Você é um assistente que busca editais culturais abertos no Brasil para Música e Audiovisual.
Retorne APENAS um JSON array com objetos: { titulo, orgao, estado, area, status, abertura, prazo, link }.
Datas no formato YYYY-MM-DD. Se não souber, use null. Sem texto extra.`;

  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Busque editais culturais: ${query}` },
        ],
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      console.error("Perplexity error:", res.status, await res.text());
      return [];
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, string | null>>;

    return parsed.map((e) => ({
      titulo: e.titulo || "",
      orgao: e.orgao || "",
      estado: e.estado || "",
      area: e.area || "",
      status: e.status || "Indefinido",
      abertura: e.abertura || null,
      prazo: e.prazo || null,
      link: e.link || "",
      origem_url: fonte.url_base || "perplexity",
      session_key: `ppx_${btoa(unescape(encodeURIComponent((e.titulo || "") + (e.link || "")))).slice(0, 40)}`,
      inferido: true,
    }));
  } catch (err) {
    console.error("Perplexity search error:", err);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth: accept either the service-role key (cron) or a signed-in user (manual "Test now").
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let authorized = false;
  if (token && token === SUPABASE_SERVICE_ROLE_KEY) {
    authorized = true;
  } else if (token) {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) authorized = true;
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {

    // Optional: filter by specific fonte_id (for "Test now" button)
    let fonteId: string | null = null;
    try {
      const body = await req.json();
      fonteId = body?.fonte_id || null;
    } catch { /* no body is fine */ }

    // Fetch active sources due for refresh
    let query = supabase
      .from("fontes_editais")
      .select("*")
      .eq("ativo", true);

    if (fonteId) {
      query = query.eq("id", fonteId);
    }

    const { data: fontes, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    if (!fontes || fontes.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhuma fonte ativa encontrada", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalNew = 0;
    const now = new Date();

    for (const fonte of fontes as FonteEdital[]) {
      // Check if due for refresh (skip for manual test)
      if (!fonteId && fonte.ultima_busca) {
        const lastSearch = new Date(fonte.ultima_busca);
        const nextDue = new Date(lastSearch.getTime() + fonte.frequencia_horas * 3600000);
        if (now < nextDue) continue;
      }

      // Fetch editais based on type
      let newEditais: EditalParsed[] = [];
      if (fonte.tipo === "rss") {
        newEditais = await fetchRSS(fonte.url_base);
      } else if (fonte.tipo === "perplexity") {
        newEditais = await fetchPerplexity(fonte);
      }
      // 'api' type can be extended later

      if (newEditais.length === 0) {
        // Still update ultima_busca
        await supabase.from("fontes_editais").update({ ultima_busca: now.toISOString() }).eq("id", fonte.id);
        continue;
      }

      // Deduplicate against existing editais
      const sessionKeys = newEditais.map((e) => e.session_key);
      const { data: existing } = await supabase
        .from("editais")
        .select("session_key")
        .eq("user_id", fonte.user_id)
        .in("session_key", sessionKeys);

      const existingKeys = new Set((existing || []).map((e: { session_key: string }) => e.session_key));
      const unique = newEditais.filter((e) => e.titulo && !existingKeys.has(e.session_key));

      if (unique.length > 0) {
        const rows = unique.map((e) => ({
          user_id: fonte.user_id,
          ...e,
        }));
        const { error: insertErr } = await supabase.from("editais").insert(rows);
        if (insertErr) console.error("Insert error:", insertErr);

        // Create notification
        await supabase.from("notifications").insert({
          user_id: fonte.user_id,
          title: "Novos editais encontrados",
          message: `${unique.length} edital(is) encontrado(s) via "${fonte.nome}"`,
          type: "edital",
          link: "/editais",
        });

        totalNew += unique.length;
      }

      // Update ultima_busca
      await supabase.from("fontes_editais").update({ ultima_busca: now.toISOString() }).eq("id", fonte.id);
    }

    return new Response(JSON.stringify({ message: `Monitoramento concluído`, processed: fontes.length, newEditais: totalNew }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("edital-monitor error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
