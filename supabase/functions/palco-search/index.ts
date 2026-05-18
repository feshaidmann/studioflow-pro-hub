import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const COST_PER_CALL_USD = 0.005;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function logInvocation(userId: string | null, status: "success" | "error") {
  try {
    await getAdminClient().from("ai_invocations").insert({
      function_name: "palco-search",
      model: "sonar-pro",
      user_id: userId,
      cost_usd: COST_PER_CALL_USD,
      status,
    });
  } catch (_) { /* best-effort */ }
}

// ─── System prompt especializado em oportunidades de palco BR ─────────────────
const SYSTEM_PROMPT = `Você é o Assistente de Palcos do StudioFlow, plataforma de gestão de
projetos musicais da Jam Session Project. Seu objetivo é localizar
oportunidades reais de apresentação para artistas independentes brasileiros:
festivais com seleção aberta, showcases, circuitos de palcos, programas de
residência musical e aberturas de shows.

## Ferramentas disponíveis

Você tem acesso à ferramenta web_search. Use-a para:
- Localizar festivais com inscrições abertas ou previstas
- Verificar se formulários de seleção ainda estão ativos
- Buscar editais de palcos em portais culturais (SESC, prefeituras, governo estadual)

O que você não pode fazer:
- Inventar oportunidades ou datas não verificadas
- Acessar páginas protegidas por login ou CAPTCHA
- Realizar inscrições em nome do artista

## O que é uma oportunidade de palco válida

Inclua apenas itens que se enquadrem em uma destas categorias:

1. FESTIVAL COM SELEÇÃO — festival que aceita inscrições de bandas/artistas
   via formulário, edital ou chamada pública (ex: Rec-Beat, Festival de Garanhuns,
   Lollapalooza Side Stage, festivais universitários)

2. CIRCUITO / PROGRAMAÇÃO FIXA — espaço ou rede de espaços com programação
   musical contínua que aceita submissão de portfólio (ex: SESC Apresentações,
   Circuito Cultural Paulista, Programa Palco Giratório)

3. SHOWCASE — evento focado em apresentação para curadoria, agentes e público
   (ex: Natura Musical Showcases, SXSW BR equivalentes)

4. ABERTURA DE SHOWS — seleção de bandas de abertura para artistas maiores
   (ex: Tim Festival Abertura, seleções de produtoras)

5. RESIDÊNCIA MUSICAL — programa de imersão com apresentações
   (ex: residências SESC, programas de incubação musical)

NÃO inclua: bares genéricos sem processo de seleção, open mics sem curadoria,
eventos privados, eventos já encerrados sem data futura, oportunidades pagas
(onde o artista paga para se apresentar).

## Pipeline de execução

ETAPA 1 — DESCOBERTA
Busque usando termos como: inscrições abertas festival música [UF/Nacional] [ano corrente],
seleção de bandas showcase Brasil, edital de palco apresentação musical,
SESC apresentações inscrição, circuito cultural artista independente.

ETAPA 2 — VERIFICAÇÃO
Para cada oportunidade encontrada, tente confirmar:
- O processo de seleção é real e público
- A inscrição está aberta ou tem data prevista
- Existe link de formulário ou edital acessível

ETAPA 3 — EXTRAÇÃO DE CAMPOS

Para cada oportunidade extraia:
- nome: nome do festival/evento/programa
- organizador: quem organiza (SESC RJ, Prefeitura de SP, etc.)
- tipo_palco: "festival" | "showcase" | "circuito" | "residencia" | "abertura"
- estado: UF ou "Nacional"
- generos: array de gêneros compatíveis (use os gêneros do mercado BR:
  MPB Contemporânea, Samba, Pagode, Funk Carioca, Forró / Piseiro,
  Sertanejo Universitário, Sertanejo Raiz, Indie BR, Rock Alternativo BR,
  Pop Brasileiro, Rap BR, R&B / Soul, Trap BR, Axé / Pop Bahia,
  Eletrônica / House, Bossa Nova, Lo-Fi Hip Hop, Jazz, Outro)
- porte: "iniciante" | "medio" | "grande"
  (iniciante = até 1.000 pessoas; medio = 1.000–10.000; grande = 10.000+)
- tem_edital: true se há processo formal de seleção, false se é por indicação
- link: URL do formulário ou página de inscrição
- prazo: YYYY-MM-DD ou null se não definido
- status: "Aberto" | "Encerrado" | "Previsto"
- periodo_inscricao: meses típicos de inscrição (ex: "Jan–Mar") se sem data fixa
- cachet_medio: texto livre (ex: "R$ 800–2.000", "Voluntário", "Cachê + hospedagem")
- publico_estimado: texto livre (ex: "2.000–8.000 pessoas")
- resumo: 2-3 frases sobre a oportunidade, perfil de artista buscado e processo de seleção

Se um campo estiver ausente, use null para datas e "" para textos.

ETAPA 4 — DEDUPLICAÇÃO
Chave: slug(nome) + "_" + slug(organizador) onde slug = minúsculas, sem acentos, espaços→_

## FORMATO DE SAÍDA ESTRUTURADA

Após o texto de resposta, inclua obrigatoriamente um bloco JSON delimitado por
<palcos_json> e </palcos_json> com o array de oportunidades encontradas.
Cada objeto deve ter exatamente estas chaves:
{ "nome", "organizador", "tipo_palco", "estado", "generos", "porte",
  "tem_edital", "link", "prazo", "status", "periodo_inscricao",
  "cachet_medio", "publico_estimado", "resumo", "session_key" }

session_key = slug(nome) + "_" + slug(organizador)

## Menção ao serviço de assessoria

Acione apenas quando o usuário perguntar como se inscrever ou preparar o material:
"A Jam Session Project oferece assessoria completa para preparação de material de
inscrição em festivais e editais de palco — do EPK ao contato com curadoria.
Entre em contato: equipe@jamsessionproject.com.br"

Fale em português claro e objetivo. Nunca invente oportunidades.`;

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
  const authData = __u ? { claims: { sub: __u.id } } : null;
  if (authError || !authData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = authData.claims.sub as string;

  const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
  if (!PERPLEXITY_API_KEY) {
    return new Response(JSON.stringify({ error: "PERPLEXITY_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { query, save_results, project_id } = await req.json();

    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: "Query é obrigatória" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `${query.trim()}\n\nData atual: ${new Date().toLocaleDateString("pt-BR")}`;

    const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
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
    });

    if (!perplexityResponse.ok) {
      const errText = await perplexityResponse.text();
      if (perplexityResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Perplexity API error ${perplexityResponse.status}: ${errText}`);
    }

    const perplexityData = await perplexityResponse.json();
    const messageContent = perplexityData.choices?.[0]?.message?.content || "";
    const citations = perplexityData.citations || [];

    // Extract structured JSON
    let palcos: any[] = [];
    const jsonMatch = messageContent.match(/<palcos_json>\s*([\s\S]*?)\s*<\/palcos_json>/);
    if (jsonMatch) {
      try { palcos = JSON.parse(jsonMatch[1]); } catch (_) { /* keep empty */ }
    }

    const cleanMessage = messageContent.replace(/<palcos_json>[\s\S]*?<\/palcos_json>/, "").trim();

    // Persist if requested — saved as tipo='palco' in editais table (pipeline unificado)
    if (save_results && palcos.length > 0) {
      const nowIso = new Date().toISOString();
      const rows = palcos.map((p: any) => ({
        user_id: userId,
        project_id: project_id || null,
        tipo: "palco",
        titulo: p.nome || "",
        orgao: p.organizador || "",
        estado: p.estado || "",
        area: "Música",
        status: p.status || "Previsto",
        abertura: null,
        prazo: p.prazo || null,
        link: p.link || "",
        origem_url: p.link || "",
        inferido: false,
        session_key: p.session_key || "",
        valor: p.cachet_medio || "",
        publico_alvo: p.publico_estimado || "",
        resumo: p.resumo || "",
        documentos_resumo: "",
        // Campos específicos de palco — preservados em colunas dedicadas
        tipo_palco: p.tipo_palco || null,
        generos: Array.isArray(p.generos) ? p.generos : [],
        porte: p.porte || null,
        tem_edital: typeof p.tem_edital === "boolean" ? p.tem_edital : null,
        periodo_inscricao: p.periodo_inscricao || null,
        link_status: "unknown",
        link_checked_at: nowIso,
      }));

      await getAdminClient()
        .from("editais")
        .upsert(rows, { onConflict: "user_id,session_key", ignoreDuplicates: true });
    }

    await logInvocation(userId, "success");

    return new Response(
      JSON.stringify({ message: cleanMessage, palcos, citations }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    await logInvocation(userId, "error");
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
