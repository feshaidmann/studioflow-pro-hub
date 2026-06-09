// Direção Visual — gera referências de estilo, paleta e opções de copy.
// IMPORTA: usa Lovable AI Gateway (LOVABLE_API_KEY). Não há provider externo.
// As imagens vêm rotuladas sempre como "Referência de estilo" (não são arte final).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IMAGE_MODEL = "google/gemini-3.1-flash-image-preview";
const TEXT_MODEL = "google/gemini-3-flash-preview";

interface ArtisticProfile {
  genres?: string[];
  moods?: string[];
  artist_refs?: string;
  external_refs?: string;
  palette?: string[];
  identity_phrase?: string;
}

const STYLE_VARIANTS: { tag: string; brief: string }[] = [
  { tag: "Escuro · urbano", brief: "Atmosfera urbana noturna, contraste alto, neons sutis, textura de filme" },
  { tag: "P&B · grão analógico", brief: "Preto e branco, grão de filme 35mm, alto contraste, fotografia documental" },
  { tag: "Cinematográfico · widescreen", brief: "Composição cinematográfica anamórfica, luz dramática, cor desbotada" },
  { tag: "Editorial · minimalista", brief: "Estética editorial limpa, espaço negativo, paleta restrita, tipografia ausente" },
  { tag: "Documental · íntimo", brief: "Captura íntima e crua, luz natural, textura tátil, sensação de proximidade" },
  { tag: "Onírico · texturizado", brief: "Atmosfera onírica, luz suave difusa, sobreposições etéreas, paleta dessaturada" },
];

function buildImagePrompt(profile: ArtisticProfile, variant: typeof STYLE_VARIANTS[number]): string {
  const parts: string[] = [];
  parts.push("Imagem de REFERÊNCIA DE ESTILO para identidade visual de um artista musical.");
  parts.push("Sem texto, sem logos, sem tipografia.");
  parts.push(`Estilo visual: ${variant.brief}.`);
  if (profile.genres?.length) parts.push(`Gênero musical: ${profile.genres.join(", ")}.`);
  if (profile.moods?.length) parts.push(`Mood: ${profile.moods.join(", ")}.`);
  if (profile.artist_refs) parts.push(`Inspiração estética dos artistas: ${profile.artist_refs}.`);
  if (profile.external_refs) parts.push(`Referências externas: ${profile.external_refs}.`);
  if (profile.identity_phrase) parts.push(`Frase identitária: "${profile.identity_phrase}".`);
  if (profile.palette?.length) parts.push(`Paleta sugerida: ${profile.palette.join(", ")}.`);
  parts.push("Resultado: imagem evocativa que serve de referência visual para um designer profissional.");
  return parts.join(" ");
}

function buildCopyPrompt(profile: ArtisticProfile): string {
  return `Perfil artístico:
- Gêneros: ${(profile.genres || []).join(", ") || "(não informado)"}
- Moods: ${(profile.moods || []).join(", ") || "(não informado)"}
- Artistas de referência: ${profile.artist_refs || "(não informado)"}
- Referências externas: ${profile.external_refs || "(nenhuma)"}
- Paleta: ${(profile.palette || []).join(", ") || "(livre)"}
- Frase identitária: ${profile.identity_phrase || "(nenhuma)"}

Gere uma paleta visual coerente (4 cores em hex) com justificativa curta e 3 variações de legenda
para redes sociais com tons distintos: A) Intimista, B) Direto, C) Evocativo.
Retorne APENAS JSON válido neste formato:
{
  "palette": { "colors": ["#hex1","#hex2","#hex3","#hex4"], "rationale": "..." },
  "copy_options": [
    { "id": "A", "label": "Intimista", "text": "..." },
    { "id": "B", "label": "Direto", "text": "..." },
    { "id": "C", "label": "Evocativo", "text": "..." }
  ]
}`;
}

async function generateImageOnce(prompt: string, lovableKey: string): Promise<string | null> {
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!resp.ok) {
      console.error("image gen failed", resp.status, await resp.text());
      return null;
    }
    const data = await resp.json();
    return data?.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? null;
  } catch (e) {
    console.error("image gen error", e);
    return null;
  }
}

// Faz upload de uma data URL para o bucket creative-assets e retorna a URL pública.
// Evita persistir base64 enorme em JSONB (causa statement_timeout no Postgres).
async function uploadDataUrlToStorage(
  dataUrl: string,
  supabase: ReturnType<typeof createClient>,
  projectId: string,
): Promise<string | null> {
  try {
    if (!dataUrl.startsWith("data:")) return dataUrl; // já é URL
    const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
    if (!match) return null;
    const mime = match[1];
    const ext = mime.split("/")[1]?.split("+")[0] ?? "png";
    const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    const path = `visual-direction/${projectId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("creative-assets")
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (error) {
      console.error("storage upload failed", error);
      return null;
    }
    const { data } = supabase.storage.from("creative-assets").getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error("uploadDataUrlToStorage error", e);
    return null;
  }
}

function tryParseJson(text: string): any | null {
  try { return JSON.parse(text); } catch (_) {}
  // Try extracting first {...} block
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch (_) {}
  }
  return null;
}

async function generatePaletteAndCopy(profile: ArtisticProfile, lovableKey: string): Promise<{ palette: any; copy_options: any[] } | null> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages: [
        {
          role: "system",
          content: "Você é um copywriter musical brasileiro. Crie variações de legenda para redes sociais com base no perfil artístico fornecido. Tom autoral, sem clichês genéricos. Retorne APENAS JSON válido, sem explicações antes ou depois.",
        },
        { role: "user", content: buildCopyPrompt(profile) },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) {
    console.error("copy gen failed", resp.status, await resp.text());
    return null;
  }
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  const parsed = tryParseJson(content);
  if (!parsed?.palette || !Array.isArray(parsed?.copy_options)) return null;
  return parsed;
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
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const project_id: string | undefined = body.project_id;
    const briefing_id: string | undefined = body.briefing_id;
    const profile: ArtisticProfile = body.artistic_profile ?? {};

    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!profile.genres?.length || !profile.moods?.length || !profile.artist_refs?.trim()) {
      return new Response(JSON.stringify({
        error: "Perfil artístico incompleto: gênero, mood e referências de artistas são obrigatórios.",
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Per-user daily quota: max 10 visual generations per day (image model is expensive).
    const todayUtc = new Date().toISOString().slice(0, 10);
    const { count: todayCount } = await supabase
      .from("ai_invocations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("function_name", "generate-visual-direction")
      .gte("created_at", todayUtc + "T00:00:00Z");

    if ((todayCount ?? 0) >= 10) {
      return new Response(
        JSON.stringify({
          error: "rate_limit",
          limit_type: "daily",
          limit: 10,
          used: todayCount,
          resets_at: todayUtc + "T23:59:59Z",
          message: "Limite diário de gerações visuais atingido. Tente amanhã.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { data: proj, error: projErr } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("id", project_id)
      .maybeSingle();
    if (projErr || !proj || proj.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Projeto não encontrado ou sem permissão" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Se for regeneração, valida limite
    let currentRegen = 0;
    if (briefing_id) {
      const { data: existing } = await supabase
        .from("visual_briefings")
        .select("id, user_id, regeneration_count")
        .eq("id", briefing_id)
        .maybeSingle();
      if (!existing || existing.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Briefing não encontrado" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if ((existing.regeneration_count ?? 0) >= 5) {
        return new Response(JSON.stringify({
          error: "Limite de regenerações atingido (5).",
        }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      currentRegen = (existing.regeneration_count ?? 0) + 1;
    }

    // Gera 6 imagens em paralelo
    const imagePromises = STYLE_VARIANTS.map(async (variant) => {
      const url = await generateImageOnce(buildImagePrompt(profile, variant), lovableKey);
      return {
        id: crypto.randomUUID(),
        url,
        label: "Referência de estilo",
        style_tag: variant.tag,
        selected: false,
      };
    });

    // Gera paleta + copy em paralelo aos imagens
    const [imagesRaw, copyResult] = await Promise.all([
      Promise.all(imagePromises),
      generatePaletteAndCopy(profile, lovableKey),
    ]);

    // Sobe data URLs para storage para evitar JSONB gigante (statement_timeout).
    const imagesWithStorage = await Promise.all(
      imagesRaw.map(async (img) => {
        if (!img.url) return img;
        const publicUrl = await uploadDataUrlToStorage(img.url, supabase, project_id);
        return { ...img, url: publicUrl };
      }),
    );
    const images = imagesWithStorage.filter((i) => i.url);
    if (images.length === 0) {
      return new Response(JSON.stringify({
        error: "Não foi possível gerar imagens. Tente novamente em instantes (créditos de IA podem estar esgotados).",
      }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const palette = copyResult?.palette ?? { colors: [], rationale: "" };
    const copy_options = copyResult?.copy_options ?? [];

    // Persiste / atualiza
    let row;
    if (briefing_id) {
      const { data, error } = await supabase
        .from("visual_briefings")
        .update({
          artistic_profile: profile as any,
          generated_images: images as any,
          generated_palette: palette as any,
          copy_options: copy_options as any,
          regeneration_count: currentRegen,
        })
        .eq("id", briefing_id)
        .select()
        .single();
      if (error) throw error;
      row = data;
    } else {
      const { data, error } = await supabase
        .from("visual_briefings")
        .insert({
          project_id,
          user_id: user.id,
          artistic_profile: profile as any,
          generated_images: images as any,
          generated_palette: palette as any,
          copy_options: copy_options as any,
          regeneration_count: 0,
        })
        .select()
        .single();
      if (error) throw error;
      row = data;
    }

    // Log invocation for cost tracking (best-effort)
    supabase.from("ai_invocations").insert({
      function_name: "generate-visual-direction",
      model: IMAGE_MODEL,
      user_id: user.id,
      cost_usd: 0.04,
      status: "success",
    }).catch(() => {});

    return new Response(JSON.stringify({ briefing: row }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-visual-direction error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
