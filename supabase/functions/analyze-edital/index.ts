import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const ALLOWED_FILE_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const supabaseService = createClient(SUPABASE_URL, SERVICE_ROLE);

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function logFn(level: "info" | "warn" | "error", message: string, details: Record<string, unknown>) {
  try {
    await supabaseService.from("function_logs").insert({
      function_name: "analyze-edital",
      level,
      message,
      details,
    });
  } catch (e) {
    console.error("function_logs insert failed", e);
  }
}

const SYSTEM_PROMPT = `Você é um assistente especialista em editais culturais brasileiros.
Sua tarefa é LER o edital fornecido e gerar uma análise objetiva que ajude um artista independente a decidir se vale a pena se inscrever e a começar o material da inscrição.

Devolva SEMPRE um JSON válido nesta estrutura, sem nenhum texto fora do JSON:
{
  "resumo": "3 a 5 linhas em português claro, sem jargão burocrático, explicando do que se trata o edital, quem pode se inscrever e o que oferece.",
  "prazos": [
    { "label": "Inscrições", "data": "DD/MM/AAAA ou 'não informado'", "observacao": "opcional" }
  ],
  "documentos": [
    "Lista curta de documentos exigidos para a inscrição (RG, CNPJ, portfólio, etc.). Se não houver, devolva []."
  ],
  "valor": "Valor do prêmio/financiamento se mencionado, em formato livre. Pode ser string vazia.",
  "publico_alvo": "Quem pode se inscrever, em uma frase.",
  "carta_sugerida": "Um texto-base reutilizável (200 a 350 palavras) que o artista pode adaptar para o memorial/justificativa principal. Use o tom em primeira pessoa, conecte com o projeto do artista (se fornecido), e SEM placeholders entre colchetes. Se faltar contexto do projeto, escreva genérico-porém-utilizável."
}`;

function buildUserPrompt(opts: {
  editalTitle?: string;
  projectContext?: string;
  fullText?: string;
}) {
  const parts: string[] = [];
  if (opts.editalTitle) parts.push(`Título do edital (referência): ${opts.editalTitle}`);
  if (opts.projectContext) {
    parts.push(`\nCONTEXTO DO PROJETO DO ARTISTA (use para personalizar a carta):\n${opts.projectContext}`);
  }
  if (opts.fullText) {
    parts.push(`\nTEXTO DO EDITAL:\n"""\n${opts.fullText.slice(0, 60_000)}\n"""`);
  }
  parts.push("\nGere a análise no formato JSON especificado.");
  return parts.join("\n");
}

function parseJsonOutput(raw: string) {
  // Remove cercas markdown ```json ... ``` (ou ``` ... ```)
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json|JSON)?\s*/m, "").replace(/```\s*$/m, "").trim();
  // 1ª tentativa: parse direto
  try {
    return JSON.parse(cleaned);
  } catch {
    // 2ª tentativa: extrai do primeiro { ao último }
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) throw new Error("no_json_match");
    return JSON.parse(cleaned.slice(first, last + 1));
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!LOVABLE_API_KEY) return jsonResponse(500, { error: "Integração de IA indisponível" });

  const startedAt = Date.now();
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse(401, { error: "Não autorizado" });

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) return jsonResponse(401, { error: "Não autorizado" });

    const body = await req.json().catch(() => ({}));
    const { file, text, edital_title, edital_id, project_id } = body ?? {};

    const hasFile = !!file && typeof file === "object" && typeof file.base64 === "string";
    const hasText = typeof text === "string" && text.trim().length > 50;
    if (!hasFile && !hasText) {
      return jsonResponse(400, { error: "Envie um arquivo ou cole o texto do edital (mínimo 50 caracteres)." });
    }

    // Carrega contexto do projeto, se fornecido
    let projectContext = "";
    if (project_id) {
      const { data: proj } = await supabaseService
        .from("projects")
        .select("name, artist, notes, project_type, stage")
        .eq("id", project_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (proj) {
        projectContext = [
          `Nome: ${proj.name ?? ""}`,
          `Artista: ${proj.artist ?? ""}`,
          `Tipo: ${proj.project_type ?? ""}`,
          `Estágio atual: ${proj.stage ?? ""}`,
          proj.notes ? `Notas: ${proj.notes}` : "",
        ].filter(Boolean).join("\n");
      }
    }
    // Bio do artista do perfil
    const { data: prof } = await supabaseService
      .from("profiles")
      .select("display_name, bio, specialties, city")
      .eq("id", user.id)
      .maybeSingle();
    if (prof) {
      projectContext = [
        projectContext,
        `\nPerfil do artista:`,
        prof.display_name ? `Nome: ${prof.display_name}` : "",
        prof.city ? `Cidade: ${prof.city}` : "",
        prof.specialties?.length ? `Especialidades: ${prof.specialties.join(", ")}` : "",
        prof.bio ? `Bio: ${prof.bio}` : "",
      ].filter(Boolean).join("\n");
    }

    let messages: any[];
    if (hasFile) {
      const mime = String(file.mime_type ?? "").toLowerCase();
      if (!ALLOWED_FILE_MIME.has(mime)) {
        return jsonResponse(400, { error: "Tipo de arquivo não suportado. Use PDF, DOC, DOCX ou TXT." });
      }
      const approxBytes = Math.floor((file.base64.length * 3) / 4);
      if (approxBytes > MAX_FILE_BYTES) {
        return jsonResponse(400, { error: "Arquivo excede 10 MB." });
      }
      const dataUrl = `data:${mime};base64,${file.base64}`;
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: buildUserPrompt({ editalTitle: edital_title, projectContext }) },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ];
    } else {
      messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt({ editalTitle: edital_title, projectContext, fullText: text }) },
      ];
    }

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
          messages,
          max_tokens: 2500,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      const isAbort = fetchErr?.name === "AbortError";
      await logFn("error", "ai_fetch_failed", { user_id: user.id, isAbort });
      return jsonResponse(504, {
        error: isAbort ? "Tempo esgotado ao analisar o edital. Tente novamente." : "Falha de rede ao consultar a IA.",
      });
    }
    clearTimeout(timeoutId);

    if (aiRes.status === 429) return jsonResponse(429, { error: "Limite de uso da IA atingido. Tente novamente em alguns minutos." });
    if (aiRes.status === 402) return jsonResponse(402, { error: "Créditos de IA esgotados." });
    if (!aiRes.ok) {
      const txt = await aiRes.text().catch(() => "");
      await logFn("error", "ai_upstream_error", { status: aiRes.status, excerpt: txt.slice(0, 300) });
      return jsonResponse(502, { error: "Erro ao consultar a IA." });
    }

    const aiData = await aiRes.json().catch(() => null);
    const rawContent: string = aiData?.choices?.[0]?.message?.content ?? "";
    if (!rawContent.trim()) {
      return jsonResponse(502, { error: "A IA não retornou conteúdo." });
    }

    let parsed: any;
    try {
      parsed = parseJsonOutput(rawContent);
    } catch {
      await logFn("warn", "invalid_json", { excerpt: rawContent.slice(0, 300) });
      return jsonResponse(200, {
        analise: {
          resumo: rawContent.slice(0, 1500),
          prazos: [],
          documentos: [],
          valor: "",
          publico_alvo: "",
          carta_sugerida: "",
        },
        warning: "A análise não veio totalmente estruturada — revise manualmente.",
      });
    }

    // Persistência opcional: se edital_id fornecido, salva em edital_applications.analise_ia
    if (edital_id) {
      try {
        const { data: existing } = await supabaseService
          .from("edital_applications")
          .select("id")
          .eq("edital_id", edital_id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (existing) {
          await supabaseService
            .from("edital_applications")
            .update({ analise_ia: parsed, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
        }
      } catch (e) {
        console.warn("persist analise_ia failed", e);
      }
    }

    // Corpus: grava análise pública (sem carta_sugerida) para refino futuro da base
    try {
      const corpusText = hasText ? String(text) : "";
      const encoder = new TextEncoder();
      const hashSource = corpusText || `${file?.base64 ?? ""}`.slice(0, 4000);
      const hashBuf = await crypto.subtle.digest("SHA-256", encoder.encode(hashSource));
      const contentHash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      const { carta_sugerida: _omit, ...analisePublica } = parsed ?? {};
      await supabaseService.from("edital_analyses_corpus").insert({
        user_id: user.id,
        edital_id: edital_id ?? null,
        edital_title: edital_title ?? null,
        source: hasFile ? "file" : "text",
        content_hash: contentHash,
        input_text: corpusText ? corpusText.slice(0, 60_000) : null,
        input_excerpt: corpusText ? corpusText.slice(0, 500) : null,
        resumo: analisePublica?.resumo ?? null,
        prazos: analisePublica?.prazos ?? [],
        documentos: analisePublica?.documentos ?? [],
        valor: analisePublica?.valor ?? null,
        publico_alvo: analisePublica?.publico_alvo ?? null,
        model: "google/gemini-2.5-flash",
        duration_ms: Date.now() - startedAt,
      });
    } catch (e) {
      console.warn("corpus insert failed", e);
    }

    await logFn("info", "ok", { user_id: user.id, duration_ms: Date.now() - startedAt, source: hasFile ? "file" : "text" });
    return jsonResponse(200, { analise: parsed });
  } catch (err: any) {
    console.error("analyze-edital error", err);
    return jsonResponse(500, { error: "Erro interno. Tente novamente." });
  }
});
