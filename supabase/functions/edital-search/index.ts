import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const COST_PER_CALL_USD = 0.005;

// ── Validação de link oficial ─────────────────────────────────────────────
// Faz HEAD (cai pra GET com Range se necessário). Considera vivo se status
// final estiver na lista permitida. Timeout de 4s por URL.
export async function checkLinkAlive(rawUrl: string): Promise<{ ok: boolean; status: number | "timeout" | "invalid" | "unknown" }> {
  let url: URL;
  try { url = new URL(rawUrl.trim()); }
  catch { return { ok: false, status: "invalid" }; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, status: "invalid" };

  const goodStatuses = new Set([200, 201, 202, 203, 204, 206, 301, 302, 303, 307, 308]);
  const ua = "Mozilla/5.0 (compatible; StudioFlowLinkChecker/1.0; +https://app.jamsessionproject.com.br)";

  async function attempt(method: "HEAD" | "GET"): Promise<number | "timeout"> {
    try {
      const ctrl = AbortSignal.timeout(4500);
      const resp = await fetch(url.toString(), {
        method,
        redirect: "follow",
        signal: ctrl,
        headers: method === "GET"
          ? { "User-Agent": ua, "Range": "bytes=0-1024", "Accept": "*/*" }
          : { "User-Agent": ua, "Accept": "*/*" },
      });
      // Drena e descarta o corpo para não vazar conexões
      try { await resp.body?.cancel(); } catch { /* noop */ }
      return resp.status;
    } catch (e: any) {
      if (e?.name === "TimeoutError" || e?.name === "AbortError") return "timeout";
      return 0;
    }
  }

  let s = await attempt("HEAD");
  // Alguns servidores rejeitam HEAD → tenta GET parcial
  if (s === 405 || s === 501 || s === 0 || s === 403) s = await attempt("GET");

  if (s === "timeout") return { ok: false, status: "timeout" };
  return { ok: goodStatuses.has(s as number), status: s as number };
}



function getAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function logInvocation(userId: string | null, status: "success" | "error") {
  try {
    await getAdminClient().from("ai_invocations").insert({
      function_name: "edital-search",
      model: "sonar-pro",
      user_id: userId,
      cost_usd: COST_PER_CALL_USD,
      status,
    });
  } catch (_) { /* best-effort */ }
}

async function logError(message: string, details?: unknown) {
  try {
    await getAdminClient().from("function_logs").insert({
      function_name: "edital-search",
      level: "error",
      message: String(message),
      details: details ? JSON.parse(JSON.stringify(details, Object.getOwnPropertyNames(details))) : null,
    });
  } catch (_) { /* best-effort */ }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o Assistente de Editais do StudioFlow, plataforma de gestão de
projetos musicais da Jam Session Project. Seu objetivo é localizar,
filtrar e organizar editais e chamadas públicas nas áreas de Música e
Audiovisual em portais brasileiros (federal, estadual e municipal),
para que artistas e produtores encontrem oportunidades de fomento para
seus projetos musicais.

## Ferramentas disponíveis

Você tem acesso à ferramenta web_search. Use-a para:

- Localizar URLs oficiais quando o usuário fornecer apenas nomes de órgãos
- Buscar editais abertos por área, UF ou fundo específico
- Verificar se links ainda estão ativos antes de incluí-los

O que você não pode fazer:

- Executar monitoramento contínuo ou agendado
- Acessar páginas protegidas por login ou CAPTCHA
- Preencher formulários ou realizar inscrições

## Pipeline de execução (siga esta ordem a cada busca)

ETAPA 1 — DESCOBERTA

Se o usuário fornecer URLs, use-as como ponto de partida.
Se fornecer nomes de órgãos, use web_search para localizar as URLs.
Se a busca for aberta ("editais de música em SP"), use web_search
com termos como: edital música audiovisual [UF] [ano corrente] aberto.

ETAPA 2 — BUSCA E LEITURA

Para cada fonte, tente acessar:
1. Feed RSS/Atom: teste /feed /rss /rss.xml /feed.xml /atom.xml
2. Se não houver feed: página de editais/chamadas públicas do portal

Se uma fonte falhar, registre [ERRO] {URL} — {motivo} e continue.

ETAPA 3 — FILTRAGEM

Mantenha apenas itens que contenham ao menos uma das palavras-chave:
edital, chamada pública, convocatória, seleção, prêmio, fomento,
incentivo, patrocínio, bolsa, música, musical, audiovisual, cinema,
vídeo, documentário, curta-metragem, longa-metragem, série,
produção cultural, festival, mostra.

Trate plural/singular e variações com/sem acento.

O usuário pode expandir ou reduzir esta lista a qualquer momento.

ETAPA 4 — EXTRAÇÃO DE CAMPOS

Para cada item relevante extraia:

- titulo: texto limpo, sem tags HTML
- orgao: nome do órgão responsável (derive do domínio se ausente)
- estado: UF ou "Nacional" (infira do órgão ou do texto)
- area: "Música" | "Audiovisual" | "Ambos" | "Outra"
- status: "Aberto" | "Encerrado" | "Indefinido"
  (derive comparando prazo com a data atual; se prazo ausente: Indefinido)
- abertura: dd/mm/aaaa (use * se inferido por texto, não explícito)
- prazo: dd/mm/aaaa (use * se inferido; se expirado: status = Encerrado)
- link: URL completa e verificada (descarte se 404)
- valor: texto livre com o valor de fomento oferecido (ex: "R$ 50.000", "até R$ 200.000 por projeto"). Use — se não informado.
- publico_alvo: texto curto descrevendo quem pode se inscrever (ex: "Artistas e grupos musicais de SP"). Use — se não informado.
- resumo: 1-2 frases descrevendo do que se trata o edital. Use — se não informado.
- documentos_resumo: lista curta dos principais documentos exigidos, separados por vírgula. Use — se não informado.

Se um campo estiver ausente, use —.

ETAPA 5 — DEDUPLICAÇÃO

Antes de incluir um item, gere sua chave:
  session_key = slug(titulo) + "_" + slug(orgao) + "_" + slug(prazo)
onde slug = minúsculas, sem acentos, sem pontuação, espaços→underline.

Descarte itens cujo session_key já apareceu na lista atual.

Quando duplicado entre fontes, mantenha o da fonte de maior prioridade.

Hierarquia de fontes (do mais para o menos prioritário):
1. Federal: MinC, ANCINE, Funarte, BNDES Cultura, Petrobras Cultural
2. Estadual: SecCultura estaduais, ProAC SP, VAI SP, FAC RJ, SECULT MG
3. Municipal: SecCultura municipais, fundos municipais
4. Fundações privadas: Itaú Cultural, SESC, SESI, Santander Universidades
5. Agregadores/blogs: apenas se as fontes primárias não cobrirem o escopo

ETAPA 6 — SAÍDA

Apresente os resultados obrigatoriamente neste formato:

| Título | Estado | Órgão | Abertura | Prazo | Status | Área | Link |
|--------|--------|-------|----------|-------|--------|------|------|

(* = campo inferido por texto; — = não disponível)

Ao final da tabela, inclua sempre este bloco de relatório:

Para exportação em CSV, use separador ";" e encoding UTF-8.
Nome do arquivo: jamsession_editais_culturais_oficial.csv

## Protocolo de erros por tipo

| Situação | Ação |
|----------|------|
| Feed ausente | Tente a página de editais diretamente |
| JS-heavy (conteúdo não carrega) | Registre, informe URL para acesso manual |
| Paywall / login obrigatório | Registre, não tente contornar |
| Link 404 | Exclua o item do resultado |
| Prazo ambíguo | Marque Indefinido, preserve texto original |

## Comportamento

Execute sempre a busca mais completa possível sem pedir confirmação
prévia. Se houver ambiguidade que impeça a execução, faça uma única
pergunta direta. Nunca invente resultados. Nunca prometa monitoramento
contínuo. Mantenha a lista de fontes da sessão para reutilização.
Fale em português claro e objetivo.

## Menção ao serviço de assessoria

Acione o texto abaixo apenas quando:
- O usuário encontrou um edital e pergunta como se inscrever
- O usuário tem dúvida sobre documentação ou requisitos
- O usuário pergunta sobre gestão do projeto dentro do edital

Texto (use uma vez por conversa, não repita):
"A Jam Session Project oferece assessoria completa para preenchimento
e submissão de editais culturais — da análise de elegibilidade até a
entrega final da documentação. Entre em contato:
equipe@jamsessionproject.com.br | www.jamsessionproject.com.br"

Não mencione valores, taxas ou modelo de negócio.

## FORMATO DE SAÍDA ESTRUTURADA

IMPORTANTE: Após a tabela markdown e o relatório, você DEVE incluir um bloco JSON
delimitado por <editais_json> e </editais_json> com o array de editais encontrados.
Cada objeto deve ter exatamente estas chaves:
{ "titulo", "orgao", "estado", "area", "status", "abertura", "prazo", "link", "origem_url", "inferido", "session_key", "valor", "publico_alvo", "resumo", "documentos_resumo" }

Regras para o JSON:
- abertura e prazo: formato "YYYY-MM-DD" ou null se ausente
- inferido: true se alguma data foi inferida
- session_key: slug(titulo)_slug(orgao)_slug(prazo) onde slug = minúsculas, sem acentos, sem pontuação, espaços→_
- origem_url: URL da fonte que gerou o item
- valor: texto livre ou "" se não informado
- publico_alvo: texto curto ou "" se não informado
- resumo: 1-2 frases ou "" se não informado
- documentos_resumo: lista separada por vírgula ou "" se não informado`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: { user: __u }, error: authError } = await supabase.auth.getUser(token);
  const data = __u ? { claims: { sub: __u.id, email: __u.email } } : null;
  if (authError || !data?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = data.claims.sub as string;

  const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
  if (!PERPLEXITY_API_KEY) {
    return new Response(JSON.stringify({ error: "PERPLEXITY_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { query, sources, project_id, save_results } = await req.json();

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Query é obrigatória" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build user prompt
    let userPrompt = query.trim();
    if (sources && Array.isArray(sources) && sources.length > 0) {
      userPrompt += `\n\nFontes adicionais para consultar:\n${sources.map((s: string) => `- ${s}`).join("\n")}`;
    }
    userPrompt += `\n\nData atual: ${new Date().toLocaleDateString("pt-BR")}`;

    // Call Perplexity with a 45s timeout
    const perplexityController = new AbortController();
    const perplexityTimeout = setTimeout(() => perplexityController.abort(), 45_000);
    let perplexityResponse: Response;
    try {
      perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 4096,
          temperature: 0.1,
        }),
        signal: perplexityController.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(perplexityTimeout);
      const isAbort = fetchErr?.name === "AbortError";
      return new Response(
        JSON.stringify({ error: isAbort ? "Tempo esgotado ao consultar a IA. Tente novamente." : "Falha de rede ao consultar a IA." }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    clearTimeout(perplexityTimeout);

    if (!perplexityResponse.ok) {
      const errText = await perplexityResponse.text();
      console.error("Perplexity error:", perplexityResponse.status, errText);

      if (perplexityResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições da busca atingido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Perplexity API error ${perplexityResponse.status}: ${errText}`);
    }

    const perplexityData = await perplexityResponse.json();
    const messageContent = perplexityData.choices?.[0]?.message?.content || "";
    const citations = perplexityData.citations || [];

    // Extract structured JSON from the response
    let editais: any[] = [];
    const jsonMatch = messageContent.match(/<editais_json>\s*([\s\S]*?)\s*<\/editais_json>/);
    if (jsonMatch) {
      try {
        editais = JSON.parse(jsonMatch[1]);
      } catch (parseErr) {
        console.error("Failed to parse editais JSON from response:", parseErr);
      }
    }

    // Clean message (remove the JSON block for display)
    const cleanMessage = messageContent.replace(/<editais_json>[\s\S]*?<\/editais_json>/, "").trim();

    // ── Validar links oficiais (descarta alucinações que dão 404) ──────────
    const linkChecks = await Promise.all(
      editais.map(async (e: any) => {
        if (!e.link || typeof e.link !== "string") return { ok: false, status: "unknown" as const };
        return await checkLinkAlive(e.link);
      }),
    );
    const editaisValidos: any[] = [];
    const linkStatusByIdx: ("ok" | "broken" | "unknown")[] = [];
    editais.forEach((e: any, i: number) => {
      const c = linkChecks[i];
      // Sem link → mantém (status unknown). Com link mas quebrado → descarta.
      if (!e.link) { editaisValidos.push(e); linkStatusByIdx.push("unknown"); return; }
      if (c.ok) { editaisValidos.push(e); linkStatusByIdx.push("ok"); return; }
      console.warn(`[edital-search] Descartado por link inválido (${c.status}): ${e.titulo} → ${e.link}`);
    });
    editais = editaisValidos;

    const sessionKeyList = editais.map((e: any) => e.session_key).filter(Boolean);

    // Persist if requested
    if (save_results && editais.length > 0) {
      const rows = editais.map((e: any, i: number) => ({
        link_status: linkStatusByIdx[i] || "unknown",
        link_checked_at: new Date().toISOString(),
        user_id: userId,
        project_id: project_id || null,
        titulo: e.titulo || "",
        orgao: e.orgao || "",
        estado: e.estado || "",
        area: e.area || "",
        status: e.status || "Indefinido",
        abertura: e.abertura || null,
        prazo: e.prazo || null,
        link: e.link || "",
        origem_url: e.origem_url || "",
        inferido: e.inferido || false,
        session_key: e.session_key || "",
        valor: e.valor || "",
        publico_alvo: e.publico_alvo || "",
        resumo: e.resumo || "",
        documentos_resumo: e.documentos_resumo || "",
      }));

      const { error: insertError } = await getAdminClient()
        .from("editais")
        .upsert(rows, { onConflict: "user_id,session_key", ignoreDuplicates: true });

      if (insertError) {
        console.error("Insert error:", insertError);
      }
    }

    await logInvocation(userId, "success");

    return new Response(
      JSON.stringify({
        message: cleanMessage,
        editais,
        session_key_list: sessionKeyList,
        citations,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("edital-search error:", e);
    await Promise.all([
      logError(e instanceof Error ? e.message : String(e), e),
      logInvocation(userId, "error"),
    ]);
    return new Response(
      JSON.stringify({ error: "Erro interno. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
