import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const ALLOWED_FILE_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

type Cause =
  | "ok"
  | "auth_error"
  | "bad_request"
  | "no_perplexity_key"
  | "perplexity_upstream_error"
  | "perplexity_timeout"
  | "empty_response"
  | "invalid_json"
  | "no_fields_extracted"
  | "lovable_ai_error"
  | "file_too_large"
  | "unsupported_file_type"
  | "unknown_error";

const supabaseService = createClient(SUPABASE_URL, SERVICE_ROLE);

async function logFn(
  level: "info" | "warn" | "error",
  message: string,
  details: Record<string, unknown>,
) {
  try {
    await supabaseService.from("function_logs").insert({
      function_name: "extract-edital-fields",
      level,
      message,
      details,
    });
  } catch (e) {
    console.error("function_logs insert failed", e);
  }
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = Date.now();
  let userId: string | null = null;
  let hasUrl = false;
  let hasTitulo = false;

  const finish = async (
    status: number,
    cause: Cause,
    extra: Record<string, unknown>,
    levelOverride?: "info" | "warn" | "error",
  ) => {
    const duration_ms = Date.now() - startedAt;
    const level: "info" | "warn" | "error" =
      levelOverride ?? (cause === "ok" ? "info" : status >= 500 ? "error" : "warn");
    if (cause !== "ok") {
      await logFn(level, cause, {
        cause,
        http_status: status,
        duration_ms,
        user_id: userId,
        has_url: hasUrl,
        has_titulo: hasTitulo,
        ...extra,
      });
    }
    return jsonResponse(status, { cause, http_status: status, duration_ms, ...extra });
  };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return await finish(401, "auth_error", { error: "Não autorizado" });
    }

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) {
      return await finish(401, "auth_error", { error: "Não autorizado" });
    }
    userId = user.id;

    const body = await req.json().catch(() => ({}));
    const { url, titulo, file, text } = body ?? {};
    hasUrl = !!url;
    hasTitulo = !!titulo;
    const hasFile = !!file && typeof file === "object" && typeof file.base64 === "string";
    const hasText = typeof text === "string" && text.trim().length > 0;

    if (!url && !titulo && !hasFile && !hasText) {
      return await finish(400, "bad_request", { error: "URL, título, arquivo ou texto é obrigatório" });
    }

    const userPromptForFields = `Você está analisando um edital cultural brasileiro.

Extraia TODOS os campos obrigatórios do formulário de inscrição. Para cada campo, retorne:
- "nome": nome do campo (ex: "Nome do proponente")
- "tipo": tipo do campo (text, textarea, number, date, file, select)
- "obrigatorio": boolean
- "descricao": breve descrição ou instrução do campo
- "opcoes": array de opções se for select (senão null)

Retorne APENAS um JSON válido no formato: { "campos": [...], "resumo_edital": "breve resumo do edital", "documentos_exigidos": ["lista de documentos"] }`;

    // ============ Branch: texto colado pelo usuário ============
    if (hasText) {
      if (!LOVABLE_API_KEY) {
        return await finish(500, "lovable_ai_error", { error: "Integração de IA indisponível" });
      }

      // Normalize whitespace, then send head+tail so Annexes at end of
      // Brazilian editais (ANEXO I — form fields) are not cut off.
      const normalized = (text as string).replace(/\s{3,}/g, "\n\n").trim();
      const MAX_CHARS = 80_000;
      const textContent =
        normalized.length <= MAX_CHARS
          ? normalized
          : normalized.slice(0, 40_000) + "\n\n[…]\n\n" + normalized.slice(-40_000);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90_000);
      let aiRes: Response;
      try {
        aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "Você é um assistente especialista em editais culturais brasileiros. Extraia campos de formulários de inscrição e retorne JSON válido.",
              },
              {
                role: "user",
                content: `${userPromptForFields}\n\nCONTEÚDO DO EDITAL:\n${textContent}`,
              },
            ],
          }),
          signal: controller.signal,
        });
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        const isAbort = fetchErr?.name === "AbortError";
        return await finish(504, isAbort ? "perplexity_timeout" : "lovable_ai_error", {
          error: isAbort ? "Tempo esgotado ao analisar texto" : "Falha de rede ao consultar IA",
          fetch_error: String(fetchErr?.message ?? fetchErr),
        });
      }
      clearTimeout(timeoutId);

      if (!aiRes.ok) {
        const errText = await aiRes.text().catch(() => "");
        return await finish(502, "lovable_ai_error", {
          error: "Erro ao consultar IA",
          ai_status: aiRes.status,
          raw_excerpt: errText.slice(0, 500),
        });
      }
      const aiData = await aiRes.json().catch(() => null);
      const rawContent: string = aiData?.choices?.[0]?.message?.content ?? "";
      if (!rawContent.trim()) {
        return await finish(502, "empty_response", { error: "A IA não retornou conteúdo" });
      }

      let parsed: any;
      let parseFailed = false;
      try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("no_json_match");
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        parseFailed = true;
        parsed = { campos: [], resumo_edital: rawContent, documentos_exigidos: [] };
      }
      const fieldsCount = Array.isArray(parsed?.campos) ? parsed.campos.length : 0;
      if (parseFailed) {
        return await finish(200, "invalid_json", { ...parsed, fields_count: 0, raw_excerpt: rawContent.slice(0, 500) });
      }
      if (fieldsCount === 0) {
        return await finish(200, "no_fields_extracted", { ...parsed, fields_count: 0, raw_excerpt: rawContent.slice(0, 500) });
      }
      return await finish(200, "ok", { ...parsed, fields_count: fieldsCount, source: "text" });
    }

    // ============ Branch: arquivo enviado pelo usuário ============
    if (hasFile) {
      if (!LOVABLE_API_KEY) {
        return await finish(500, "lovable_ai_error", { error: "Integração de IA indisponível" });
      }
      const mime = String(file.mime_type ?? "").toLowerCase();
      if (!ALLOWED_FILE_MIME.has(mime)) {
        return await finish(400, "unsupported_file_type", { error: "Tipo de arquivo não suportado", mime_type: mime });
      }
      const base64: string = file.base64;
      // base64 length * 3/4 ≈ raw bytes
      const approxBytes = Math.floor((base64.length * 3) / 4);
      if (approxBytes > MAX_FILE_BYTES) {
        return await finish(400, "file_too_large", { error: "Arquivo excede 10 MB", approx_bytes: approxBytes });
      }

      const dataUrl = `data:${mime};base64,${base64}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60_000);
      let aiRes: Response;
      try {
        aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "Você é um assistente especialista em editais culturais brasileiros. Extraia campos de formulários de inscrição e retorne JSON válido.",
              },
              {
                role: "user",
                content: [
                  { type: "text", text: userPromptForFields },
                  { type: "image_url", image_url: { url: dataUrl } },
                ],
              },
            ],
          }),
          signal: controller.signal,
        });
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        const isAbort = fetchErr?.name === "AbortError";
        return await finish(504, isAbort ? "perplexity_timeout" : "lovable_ai_error", {
          error: isAbort ? "Tempo esgotado ao analisar arquivo" : "Falha de rede ao consultar IA",
          fetch_error: String(fetchErr?.message ?? fetchErr),
        });
      }
      clearTimeout(timeoutId);

      if (!aiRes.ok) {
        const errText = await aiRes.text().catch(() => "");
        return await finish(502, "lovable_ai_error", {
          error: "Erro ao consultar IA",
          ai_status: aiRes.status,
          raw_excerpt: errText.slice(0, 500),
        });
      }
      const aiData = await aiRes.json().catch(() => null);
      const rawContent: string = aiData?.choices?.[0]?.message?.content ?? "";
      if (!rawContent.trim()) {
        return await finish(502, "empty_response", { error: "A IA não retornou conteúdo" });
      }

      let parsed: any;
      let parseFailed = false;
      try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("no_json_match");
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        parseFailed = true;
        parsed = { campos: [], resumo_edital: rawContent, documentos_exigidos: [] };
      }
      const fieldsCount = Array.isArray(parsed?.campos) ? parsed.campos.length : 0;
      if (parseFailed) {
        return await finish(200, "invalid_json", { ...parsed, fields_count: 0, raw_excerpt: rawContent.slice(0, 500) });
      }
      if (fieldsCount === 0) {
        return await finish(200, "no_fields_extracted", { ...parsed, fields_count: 0, raw_excerpt: rawContent.slice(0, 500) });
      }
      return await finish(200, "ok", { ...parsed, fields_count: fieldsCount, source: "file" });
    }

    // ============ Branch: URL / título via Perplexity ============
    if (!PERPLEXITY_API_KEY) {
      return await finish(500, "no_perplexity_key", { error: "API key não configurada" });
    }

    const prompt = url
      ? `Acesse o edital cultural neste link: ${url}

${userPromptForFields}`
      : `Busque informações sobre o edital cultural "${titulo}".

${userPromptForFields}`;

    // Perplexity call with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45_000);
    let perplexityRes: Response;
    try {
      perplexityRes = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [
            {
              role: "system",
              content: "Você é um assistente especialista em editais culturais brasileiros. Extraia campos de formulários de inscrição e retorne JSON válido.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 2000,
          search_recency_filter: "month",
        }),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      const isAbort = fetchErr?.name === "AbortError";
      return await finish(504, isAbort ? "perplexity_timeout" : "perplexity_upstream_error", {
        error: isAbort ? "Tempo esgotado ao consultar IA" : "Falha de rede ao consultar IA",
        fetch_error: String(fetchErr?.message ?? fetchErr),
      });
    }
    clearTimeout(timeoutId);

    if (!perplexityRes.ok) {
      const errText = await perplexityRes.text().catch(() => "");
      return await finish(502, "perplexity_upstream_error", {
        error: "Erro ao consultar IA",
        perplexity_status: perplexityRes.status,
        raw_excerpt: errText.slice(0, 500),
      });
    }

    const perplexityData = await perplexityRes.json().catch(() => null);
    const rawContent: string = perplexityData?.choices?.[0]?.message?.content ?? "";

    if (!rawContent.trim()) {
      return await finish(502, "empty_response", {
        error: "A IA não retornou conteúdo",
        perplexity_status: perplexityRes.status,
      });
    }

    let parsed: any;
    let parseFailed = false;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("no_json_match");
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      parseFailed = true;
      parsed = { campos: [], resumo_edital: rawContent, documentos_exigidos: [] };
    }

    const fieldsCount = Array.isArray(parsed?.campos) ? parsed.campos.length : 0;

    if (parseFailed) {
      return await finish(200, "invalid_json", {
        ...parsed,
        fields_count: 0,
        raw_excerpt: rawContent.slice(0, 500),
      });
    }
    if (fieldsCount === 0) {
      return await finish(200, "no_fields_extracted", {
        ...parsed,
        fields_count: 0,
        raw_excerpt: rawContent.slice(0, 500),
      });
    }

    return await finish(200, "ok", { ...parsed, fields_count: fieldsCount });
  } catch (err: any) {
    console.error("extract-edital-fields error:", err);
    return await finish(500, "unknown_error", { error: err?.message ?? "Erro desconhecido" });
  }
});
