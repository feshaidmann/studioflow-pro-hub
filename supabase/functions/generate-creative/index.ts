import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }
function aspectLabel(w: number, h: number): string {
  const g = gcd(w, h);
  const rw = w / g, rh = h / g;
  if (rw === rh) return "1:1 perfectly square";
  if (rw === 16 && rh === 9) return "16:9 horizontal landscape";
  if (rw === 9 && rh === 16) return "9:16 vertical portrait";
  if (rw === 4 && rh === 5) return "4:5 vertical";
  if (rw === 3 && rh === 2) return "3:2 horizontal";
  return `${rw}:${rh} ${w > h ? "horizontal" : w < h ? "vertical" : "square"}`;
}

function base64ToBytes(b64: string): Uint8Array {
  const raw = b64.replace(/^data:image\/\w+;base64,/, "");
  const bin = atob(raw);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64Png(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:image/png;base64,${btoa(bin)}`;
}

async function normalizeImageToFormat(imageDataUrl: string, targetW: number, targetH: number): Promise<string> {
  try {
    const bytes = base64ToBytes(imageDataUrl);
    const img = await Image.decode(bytes);
    const targetRatio = targetW / targetH;
    const currentRatio = img.width / img.height;
    let working = img;

    // Center-crop if aspect ratio differs by more than 2%
    if (Math.abs(targetRatio - currentRatio) > 0.02) {
      let cropW: number, cropH: number;
      if (currentRatio > targetRatio) {
        // too wide → crop width
        cropH = img.height;
        cropW = Math.round(cropH * targetRatio);
      } else {
        // too tall → crop height
        cropW = img.width;
        cropH = Math.round(cropW / targetRatio);
      }
      const x = Math.floor((img.width - cropW) / 2);
      const y = Math.floor((img.height - cropH) / 2);
      working = img.crop(x, y, cropW, cropH);
    }

    // Resize to target dimensions (Lanczos is default in ImageScript)
    if (working.width !== targetW || working.height !== targetH) {
      working = working.resize(targetW, targetH);
    }

    const out = await working.encode();
    return bytesToBase64Png(out);
  } catch (e) {
    console.error("normalizeImageToFormat failed:", e);
    return imageDataUrl; // fallback to original
  }
}


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers":
    "x-quota-daily-limit, x-quota-daily-used, x-quota-weekly-limit, x-quota-weekly-used, x-quota-daily-resets-at",
};

const IMAGE_MODEL_DEFAULT = "google/gemini-2.5-flash-image";
// Nano Banana 2 — better legibility for integrated typography (track/artist names).
const IMAGE_MODEL_TYPOGRAPHY = "google/gemini-3.1-flash-image-preview";

async function requestImage(messages: any[], lovableKey: string, model: string = IMAGE_MODEL_DEFAULT) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      modalities: ["image", "text"],
    }),
  });

  return response;
}

function extractImageData(aiData: any): string | null {
  return aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Unauthorized");

    // Check if user is admin — admins têm tokens ilimitados na fase de testes
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!adminRole;

    // Check AI usage quota (20 daily, 80 weekly) — counted in BRT (UTC-3)
    // Admins bypass quotas (effectively unlimited)
    const DAILY_LIMIT = isAdmin ? Number.MAX_SAFE_INTEGER : 20;
    const WEEKLY_LIMIT = isAdmin ? Number.MAX_SAFE_INTEGER : 80;
    const BRT_OFFSET_MS = -3 * 60 * 60 * 1000; // BRT = UTC-3

    const now = new Date();
    // Convert "now" to BRT, then take start of day, then convert back to UTC instant
    const nowBRT = new Date(now.getTime() + BRT_OFFSET_MS);
    const todayStartBRT = new Date(Date.UTC(nowBRT.getUTCFullYear(), nowBRT.getUTCMonth(), nowBRT.getUTCDate()));
    const todayStartUTC = new Date(todayStartBRT.getTime() - BRT_OFFSET_MS);
    // Week starts on Sunday (BRT)
    const dayOfWeek = nowBRT.getUTCDay();
    const weekStartBRT = new Date(Date.UTC(nowBRT.getUTCFullYear(), nowBRT.getUTCMonth(), nowBRT.getUTCDate() - dayOfWeek));
    const weekStartUTC = new Date(weekStartBRT.getTime() - BRT_OFFSET_MS);
    // Reset times: tomorrow 00:00 BRT and next Sunday 00:00 BRT
    const tomorrowResetUTC = new Date(todayStartUTC.getTime() + 24 * 60 * 60 * 1000);
    const nextWeekResetUTC = new Date(weekStartUTC.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { count: dailyCount } = await supabase
      .from("ai_invocations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", todayStartUTC.toISOString());

    if ((dailyCount ?? 0) >= DAILY_LIMIT) {
      return new Response(JSON.stringify({
        error: "rate_limit",
        limit_type: "daily",
        limit: DAILY_LIMIT,
        used: dailyCount ?? DAILY_LIMIT,
        resets_at: tomorrowResetUTC.toISOString(),
        message: `Você usou todas as ${DAILY_LIMIT} gerações de hoje.`,
      }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { count: weeklyCount } = await supabase
      .from("ai_invocations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", weekStartUTC.toISOString());

    if ((weeklyCount ?? 0) >= WEEKLY_LIMIT) {
      return new Response(JSON.stringify({
        error: "rate_limit",
        limit_type: "weekly",
        limit: WEEKLY_LIMIT,
        used: weeklyCount ?? WEEKLY_LIMIT,
        resets_at: nextWeekResetUTC.toISOString(),
        message: `Você usou todas as ${WEEKLY_LIMIT} gerações desta semana.`,
      }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Quota headers (so frontend can show "X restantes" without an extra call)
    const quotaHeaders = {
      "X-Quota-Daily-Limit": String(DAILY_LIMIT),
      "X-Quota-Daily-Used": String((dailyCount ?? 0) + 1), // +1 because this call will count
      "X-Quota-Weekly-Limit": String(WEEKLY_LIMIT),
      "X-Quota-Weekly-Used": String((weeklyCount ?? 0) + 1),
      "X-Quota-Daily-Resets-At": tomorrowResetUTC.toISOString(),
    };

    const { prompt, style, format, width, height, editImageUrl, referenceMode, projectId, channelContext, mode, dnaContext, trackName, artistName, releaseDate, additionalText, noText, platform, objective, tone, campaignPhase, length, hashtagsMode } = await req.json();

    // TEXT MODE — generate social media copy
    if (mode === "text") {
      if (!prompt) {
        return new Response(JSON.stringify({ error: "Missing prompt for text mode" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── LEGENDA: contexto do mercado fonográfico brasileiro ──────────────
      //
      // O mercado fonográfico brasileiro tem especificidades que impactam
      // diretamente como uma legenda de lançamento deve ser escrita:
      //
      // 1. STREAMING DOMINANTE: Brasil é o 9º mercado global de streaming
      //    (IFPI 2024). Spotify, YouTube Music e Deezer são os canais primários.
      //    O pré-save no Spotify é o principal CTA de pré-lançamento — gera
      //    dados de audience para o algoritmo e ativa notificação automática.
      //
      // 2. FRAGMENTAÇÃO DE GÊNERO: o mercado é verticalmente segmentado.
      //    Sertanejo/Funk/Forró têm bases de fãs que consomem de formas muito
      //    diferentes de Indie BR/MPB/R&B. A linguagem, os emojis, o ritmo
      //    da legenda e os CTA preferidos variam radicalmente por gênero.
      //
      // 3. WHATSAPP COMO HUB: no Brasil, WhatsApp é o canal de distribuição
      //    orgânica mais eficiente para artistas independentes — listas de
      //    transmissão e comunidades convertem melhor que story ou feed para
      //    fãs próximos. Tom comunitário e link direto são obrigatórios.
      //
      // 4. ALGORITMO DO INSTAGRAM: os primeiros 125 caracteres aparecem antes
      //    do "ver mais". O gancho precisa estar nessa janela. Reels têm texto
      //    sobreposto limitado — a legenda é lida depois, fora do contexto visual.
      //
      // 5. TIKTOK / REELS BR: o gancho precisa ser uma frase que funcione
      //    como hook de áudio-texto simultâneo. Artistas BR de maior tração
      //    usam frases que funcionam como letra da música ("a linha que resume
      //    a faixa"), não descrições da música.
      //
      // 6. HASHTAGS NO BRASIL: as hashtags de maior alcance para artistas
      //    independentes BR são de gênero específico (#mpb, #sertanejo,
      //    #funkbrasil, #indiebrasileiro), de contexto (#novamusica,
      //    #lancamento, #presave) e de comunidade (#artistaindependente).
      //    Hashtags genéricas internacionais (#music, #newmusic, #artist)
      //    têm alcance irrelevante no Brasil.
      //
      // 7. CICLO DE CAMPANHA: o padrão do mercado BR independente é
      //    teaser (D-14 a D-7) → pré-save (D-7 a D-1) → lançamento (D0) →
      //    pós-lançamento/playlist pitch (D+3 a D+14). Cada fase tem um
      //    objetivo algorítmico diferente: o pré-save alimenta dados de
      //    audience; o lançamento maximiza streams nas primeiras 24h (peso
      //    no algoritmo); o pós-lançamento sustenta o velocity para o Radar
      //    de Lançamentos e New Music Friday.

      // Mapeia canal → comportamento específico do mercado BR
      const CHANNEL_CONTEXT: Record<string, string> = {
        "Instagram Feed": "Os primeiros 125 caracteres aparecem antes do 'ver mais' — o gancho precisa estar nessa janela. Máximo 2200 caracteres totais. Instagram Feed BR performa melhor com storytelling curto + CTA explícito. Sem exclamações excessivas — o algoritmo do Instagram desfavorece engajamento artificial.",
        "Reels / Shorts": "Primeira linha funciona como hook de áudio-texto simultâneo. No Brasil, frases que funcionam como linha da música convertem melhor que descrição. Máximo 2200 caracteres, mas legenda funcional em até 150. CTA precisa aparecer antes do 'ver mais'. Evite descrever o visual do Reel.",
        "TikTok": "Texto aparece sobreposto ao vídeo em fonte pequena. Legenda é lida depois, fora do contexto visual. Primeira frase precisa funcionar como gancho standalone. Máximo 2200 caracteres. No Brasil, TikTok responde bem a frases com cadência de letra de música — sonoridade textual importa.",
        "Spotify / streaming": "Descrição de artista no Spotify Fo Artists ou nota de lançamento para distribuidoras (DistroKid, TuneCore, Tratore, Believe). Tom editorial, sem gírias. Descreve o universo da música, os temas, a produção e o contexto do artista. Sem CTA de rede social — o streaming já é o destino.",
        "WhatsApp / comunidade": "Lista de transmissão ou comunidade — fãs próximos que optaram por receber. Tom pessoal e direto, como se o artista estivesse mandando mensagem de voz transcrita. Link clicável é obrigatório. Sem emojis excessivos — WhatsApp penaliza spam visual. Uma mensagem, um pedido.",
      };

      // Mapeia fase → objetivo algorítmico e instrução de CTA
      const PHASE_CONTEXT: Record<string, string> = {
        "Teaser": "Fase de antecipação — NÃO revelar tudo. O objetivo é gerar curiosidade e primeiros dados de audience. CTA ideal: salvar para não perder, ativar notificação, comentar o que espera da faixa. Evite o nome da música se ainda não foi revelado.",
        "Pré-save": "Fase mais crítica para o algoritmo. Pré-saves no Spotify geram dados de audience que alimentam o Radar de Lançamentos e o Release Radar. CTA deve ser explícito e único: salvar/ativar lembrete. Link do pré-save precisa estar acessível (bio ou sticker). Senso de urgência real: a janela fecha no lançamento.",
        "Lançamento": "As primeiras 24-72h determinam o peso algorítmico da faixa. O objetivo é maximizar streams e saves imediatos. CTA duplo funciona: ouvir agora + salvar na biblioteca. Mencionar onde está disponível (Spotify, YouTube, todas as plataformas). Momento de maior energia na comunicação.",
        "Pós-lançamento": "Fase de sustentação de velocity para playlist pitch. O objetivo é manter streams consistentes. CTA pode ser mais leve: compartilhar com alguém que vai gostar, adicionar a playlist, comentar o trecho favorito. Tom de gratidão + convite para aprofundar o relacionamento com a faixa.",
        "Bastidores": "Conteúdo de bastidor tem função de humanização — aproxima artista do fã. Não é legenda de lançamento, é legenda de relacionamento. CTA leve: comentar, perguntar, mostrar curiosidade. Sem vender a música diretamente — deixar a conexão acontecer.",
        "Show / agenda": "CTA de conversão direta: comprar ingresso, confirmar presença, contato para contratação. Incluir data, cidade, venue e link de ingresso quando disponível. Tom de convite pessoal. No Brasil, compartilhamento via WhatsApp é o principal canal de venda de ingressos para shows independentes.",
      };

      // Mapeia objetivo → instrução de CTA precisa
      const OBJECTIVE_CTA: Record<string, string> = {
        "Ouvir agora": "CTA principal: ouvir agora em [plataforma]. Botão/link na bio ou no sticker do story. Senso de novidade — 'saiu agora', 'disponível em todas as plataformas'.",
        "Salvar / pré-save": "CTA único e claro: salvar/pré-salvar. Explicar o que o pré-save faz (recebe notificação + adiciona automaticamente quando sair). No Brasil, muitos fãs não sabem o que é pré-save — vale uma frase de contexto rápido.",
        "Comentar": "Terminar com uma pergunta aberta que o fã consegue responder em 5 palavras. Evite perguntas genéricas ('o que acharam?'). Pergunte algo específico da faixa ou da experiência pessoal do ouvinte.",
        "Compartilhar": "CTA de propagação: pedir para marcar alguém que precisa ouvir isso, compartilhar no story, mandar no WhatsApp para uma pessoa específica. No Brasil, 'manda pra aquela pessoa' converte melhor que 'compartilhe'.",
        "Seguir o artista": "CTA para novos seguidores — só faz sentido em conteúdo de descoberta (Reels, TikTok, colaboração). Não usar em post para fãs existentes. Mencionar o que o seguidor vai encontrar ao seguir.",
        "Chamar para show": "Incluir todas as informações de conversão: data, cidade, venue, faixa de preço se possível, link para ingresso ou contato. WhatsApp é o canal preferido de contratação no mercado BR independente.",
      };

      // DNA como vocabulário emocional — instrução de uso explícita
      const dnaInstruction = dnaContext
        ? `DNA Musical da faixa (use como vocabulário emocional e cultural — nunca descreva tecnicamente nem mencione termos como LUFS, BPM, espectro ou frequência na legenda): ${dnaContext}`
        : "";

      const channelInstruction = platform ? (CHANNEL_CONTEXT[platform] || `Canal: ${platform}`) : "";
      const phaseInstruction = campaignPhase ? (PHASE_CONTEXT[campaignPhase] || `Fase: ${campaignPhase}`) : "";
      const objectiveInstruction = objective ? (OBJECTIVE_CTA[objective] || `Objetivo: ${objective}`) : "";

      // Regra de hierarquia: canal prevalece sobre tamanho quando há conflito
      const lengthInstruction = length
        ? `Tamanho desejado: ${length === "short" ? "até 220 caracteres" : length === "medium" ? "1-2 parágrafos curtos (até 400 caracteres)" : "storytelling com arco emocional em até 4 parágrafos curtos"}. Se o canal impuser limite menor, o canal prevalece.`
        : "";

      // Hashtags: critério concreto por gênero e contexto
      const hashtagInstruction = (() => {
        if (!hashtagsMode || hashtagsMode === "none") return "Sem hashtags.";
        const count = hashtagsMode === "few" ? "2-3" : "5-8";
        return `Hashtags: ${count}. Use hashtags de gênero específico (ex: #mpb, #sertanejo, #funkbrasil, #indiebrasileiro), de campanha (#novamusica, #lancamento, #presave) ou de comunidade (#artistaindependente, #musicabrasileira). NUNCA use hashtags genéricas internacionais como #music, #artist, #newmusic, #song — têm alcance irrelevante no Brasil e sinalizam conteúdo automatizado.`;
      })();

      const textSystemPrompt = [
        "Você é um especialista em marketing musical para o mercado fonográfico brasileiro independente, com domínio de estratégia de lançamento, algoritmos de streaming e comportamento de fãs por gênero.",
        "",
        "MISSÃO: escrever uma legenda que converta — gere o comportamento específico pedido (stream, save, comentário, compartilhamento) alinhado ao momento da campanha e ao canal de publicação.",
        "",
        "PRINCÍPIOS DO MERCADO BR:",
        "- O pré-save é o CTA de maior impacto para o algoritmo do Spotify: feeds o Radar de Lançamentos e o Release Radar com dados reais de audience.",
        "- As primeiras 24-72h de um lançamento determinam o peso algorítmico da faixa nas semanas seguintes. Velocidade de streams e saves importa mais que volume total.",
        "- WhatsApp é o canal de distribuição orgânica mais eficiente para artistas independentes brasileiros — fãs próximos convertem mais via lista de transmissão que via feed.",
        "- Cada gênero tem uma voz e um vocabulário próprios: o fã de Funk Carioca, de MPB Contemporânea e de Sertanejo Universitário lê e responde de formas completamente diferentes.",
        "- Emojis têm função estética e de escansão — usá-los com intenção, não como preenchimento.",
        "",
        "REGRAS DE ESCRITA:",
        "- Escreva em pt-BR natural e fluente, no registro do gênero da faixa.",
        "- Nunca mencione aspectos técnicos da produção (mixagem, masterização, BPM, frequências, LUFS).",
        "- Nunca descreva a capa ou o clipe — a imagem fala por si.",
        "- Nunca use linguagem de press release ('anuncia', 'lança', 'apresenta') em posts de redes sociais — é lido como marketing corporativo.",
        "- Nunca inclua aspas em torno da legenda, nem explique as escolhas feitas.",
        "- Responda APENAS com a legenda, sem preâmbulo, sem explicação, sem alternativas.",
        "",
        trackName ? `Música: "${trackName}"` : "",
        artistName ? `Artista: ${artistName}` : "",
        releaseDate ? `Data de lançamento: ${releaseDate}` : "",
        channelInstruction ? `\nCANAL — ${channelInstruction}` : "",
        phaseInstruction ? `\nFASE DA CAMPANHA — ${phaseInstruction}` : "",
        objectiveInstruction ? `\nOBJETIVO — ${objectiveInstruction}` : "",
        tone ? `\nTom de voz: ${tone}` : "",
        lengthInstruction ? `\n${lengthInstruction}` : "",
        hashtagInstruction ? `\n${hashtagInstruction}` : "",
        dnaInstruction ? `\n${dnaInstruction}` : "",
      ].filter(Boolean).join("\n");

      const textResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: textSystemPrompt },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!textResp.ok) {
        const status = textResp.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI text generation failed");
      }

      const textData = await textResp.json();
      const text = textData.choices?.[0]?.message?.content || "";

      // Log AI usage
      await supabase.from("ai_invocations").insert({
        user_id: user.id,
        function_name: "generate-creative-text",
        model: "google/gemini-3-flash-preview",
        status: "success",
      });

      return new Response(JSON.stringify({ text }), {
        headers: { ...corsHeaders, ...quotaHeaders, "Content-Type": "application/json" },
      });
    }

    // IMAGE MODE (default)
    if (!prompt || !format || !width || !height) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── IMAGEM: contexto do mercado fonográfico brasileiro ───────────────
    //
    // Cada formato de arte tem requisitos técnicos e estéticos específicos
    // ditados pelas plataformas de streaming e redes sociais brasileiras:
    //
    // CAPA DE SINGLE/ÁLBUM (3000×3000 / 1:1):
    //   - Renderizada em miniaturas de 40×40px no Spotify mobile — o elemento
    //     mais importante (rosto, símbolo, palavra) precisa ler em escala mínima.
    //   - No feed do Spotify, a capa compete com centenas de outras em grade:
    //     contraste alto e ponto focal único vencem composições cheias.
    //   - Capas de MPB/Indie BR tendem a linguagem fotográfica ou ilustração
    //     com paleta contida. Funk/Sertanejo tendem a cores saturadas e rosto
    //     do artista em primeiro plano. Pop BR segue estética internacional.
    //   - Evitar: fundos brancos puros (some na interface do Spotify em modo
    //     claro), texto menor que 1/8 da largura (ilegível em thumbnail).
    //
    // POST INSTAGRAM (1080×1080 / 1:1):
    //   - Aparece no feed em grade de 3 colunas — precisa funcionar como
    //     miniatura de ~300px antes de ser clicado.
    //   - O olhar do algoritmo BR prioriza imagens com rosto humano visível.
    //   - Área segura para texto: evitar bordas — 10% de margem mínima.
    //
    // STORY / CANVAS SPOTIFY (1080×1920 / 9:16):
    //   - Formato de tela cheia imersivo. A zona superior e inferior têm
    //     sobreposições de UI (nome de usuário no topo, CTA no fundo) —
    //     elementos-chave devem ficar entre 15% e 85% da altura.
    //   - No Canvas Spotify, a arte fica em loop atrás do player — deve ser
    //     abstrata o suficiente para não competir com a UI do player.
    //   - Stories BR: movimento visual percebido (mesmo em arte estática)
    //     converte melhor — composições diagonais, profundidade, blur seletivo.
    //
    // REELS / SHORTS (1080×1920 vídeo):
    //   - Thumbnail do Reel aparece como frame congelado — o primeiro frame
    //     precisa funcionar como composição estática autossuficiente.
    //
    // BANNER SPOTIFY (2560×1440 / 16:9):
    //   - Aparece no perfil do artista no Spotify. Zona central segura:
    //     entre 20% e 80% horizontal, entre 25% e 75% vertical (o restante
    //     é cortado em mobile). Nome do artista e elementos-chave no centro.
    //
    // THUMBNAIL YOUTUBE (1920×1080 / 16:9):
    //   - Aparece em lista ao lado do título do vídeo. Rosto em close +
    //     texto grande + contraste alto é o padrão de maior CTR no Brasil.
    //   - Texto deve ser legível em 120×67px (tamanho de thumbnail em mobile).

    // Style id → rich visual description (English for model adherence)
    // Descriptions anchored in Brazilian phonographic aesthetics per genre context
    const STYLE_DESCRIPTIONS: Record<string, string> = {
      minimalist: "minimalist composition, generous negative space, restrained palette of 2-3 colors maximum, refined typographic hierarchy, clean geometry — the visual language of Brazilian MPB and Indie BR contemporary releases",
      retro: "retro aesthetic with Brazilian roots — vintage textures, faded chromogenic film palette, grain reminiscent of 70s-80s Brazilian LP cover art, warm analog tones, slight vignette",
      neon: "vibrant neon palette with high saturation, glowing color edges, deep shadow contrast — the visual energy of Brazilian Funk, Trap BR and nightlife electronic releases",
      watercolor: "watercolor painting technique, soft organic edges, pigment bloom on wet paper, translucent layering, natural imperfections — intimate and handmade quality",
      collage: "mixed-media collage aesthetic, layered textures combining photography and illustration, paper cut-out edges, tactile materiality, compositional tension between elements",
      photorealistic: "photorealistic rendering with cinematic intent — natural directional lighting, shallow depth of field, true-to-life skin tones and material surfaces, professional portrait or location photography quality",
      abstract: "abstract non-representational composition using expressive gestural forms, bold color blocking, dynamic tension between geometric and organic shapes, conceptual visual language",
      "lo-fi": "lo-fi analog aesthetic, film grain, light leaks, muted warm palette with faded greens and yellows, soft focus, intimate hand-held camera energy — the visual texture of Brazilian indie bedroom recordings",
    };

    // Format-specific composition requirements for the Brazilian phonographic market
    const FORMAT_SPECS: Record<string, string> = {
      spotify_cover: `Single/album cover for streaming. Renders as a 40×40px thumbnail on Spotify mobile — the primary focal element (face, symbol, key word) MUST read clearly at that scale. Use high contrast between subject and background. Compose for a single dominant element. Avoid pure white backgrounds (disappears in Spotify light mode interface).`,
      deezer_cover: `Single/album cover for Deezer. Same technical requirements as Spotify: readable at 40×40px thumbnail, single dominant focal element, high contrast. Deezer's interface uses dark backgrounds — light-toned artwork stands out more.`,
      tidal_cover: `Single/album cover for Tidal. High-fidelity streaming platform with audiophile audience. Artwork can afford more visual complexity than Spotify — Tidal's larger thumbnail presentation supports detail. Still maintain a clear focal hierarchy.`,
      instagram_post: `Instagram feed post. Appears in a 3-column grid at ~300px before being tapped. The image must work as a small grid thumbnail AND as a full-screen expanded view. Safe text area: keep all text elements at least 10% from all edges. Human faces with visible eyes perform better in the Brazilian Instagram algorithm.`,
      story: `Instagram Story / static vertical. Full-screen immersive format. Critical safe zones: the top 15% has username overlay, the bottom 15% has CTA/link sticker area — place no key visual elements there. Composition lives between 15% and 85% of height. Diagonal compositions and depth create implied motion that performs well on Stories.`,
      spotify_canvas: `Spotify Canvas — looping abstract video background behind the player UI. The music player controls overlay the center of the image. Design for the periphery: strong visual texture and movement at edges, neutral or abstract center to avoid competing with player controls. Avoid faces centered — they get covered by the player.`,
      spotify_banner: `Spotify artist profile banner (2560×1440). Critical safe zone: center 60% horizontal × center 50% vertical — this is the only area visible on all screen sizes. Content outside this zone is cropped on mobile. Place artist name and key visuals strictly within the safe zone.`,
      reels_loop: `Reels / Shorts video loop thumbnail frame. The first frame of the video is the thumbnail shown in the feed. Compose as a strong static image that also implies motion — diagonal tension, implied trajectory, kinetic energy in pose or elements.`,
      youtube_cover: `YouTube video thumbnail. Appears in list view next to the title. High CTR thumbnails on Brazilian YouTube combine: close-up face with expressive eyes + large readable text + high contrast background. Text must be legible at 120×67px (mobile list thumbnail size). Avoid more than 3 visual elements.`,
      twitter_post: `Twitter/X post image. Appears cropped to ~2:1 aspect in timeline — compose the most important element within the center horizontal band. Full image only visible when tapped.`,
      custom: `Custom format. Compose with full artistic freedom within the specified dimensions.`,
    };

    const styleDescription = style ? (STYLE_DESCRIPTIONS[style] || style) : null;
    const formatSpec = FORMAT_SPECS[format] || null;
    const aspectStr = aspectLabel(width, height);

    // Build system prompt as art direction briefing
    const systemBlocks: string[] = [];

    systemBlocks.push(
      [
        "You are an art director specializing in visual identity for independent Brazilian music artists.",
        "Your work appears on streaming platforms (Spotify, Deezer, YouTube Music), Brazilian social media (Instagram, TikTok), and physical formats.",
        "",
        "Execution principles:",
        "- Intentional composition: clear focal point, deliberate visual hierarchy, bold use of color, light, texture and depth. Reject lazy symmetry, default centering and stock-photo aesthetics.",
        "- Authorial direction: every artwork must feel designed by a human art director, not assembled from a template. Vary angle, framing, scale and atmosphere.",
        "- Platform-aware craft: the artwork must perform in its specific context — thumbnail legibility, safe zone compliance, feed competition. Technical requirements are not constraints, they are the brief.",
        "- The user's creative description is the PRIMARY composition instruction. Execute it with artistic interpretation but do not ignore its scene, subjects, atmosphere or visual elements.",
      ].join("\n")
    );

    // Format spec — platform-specific technical requirements
    if (formatSpec) {
      systemBlocks.push(`Platform requirements for this format:\n${formatSpec}\n\nFinal dimensions: ${width}×${height}px (${aspectStr}). Frame the complete scene within these proportions — no amateur cropping of subjects.`);
    } else {
      systemBlocks.push(`Composition: ${aspectStr}, final delivery at ${width}×${height}px. Frame the complete scene within these proportions.`);
    }

    if (styleDescription) {
      systemBlocks.push(`Visual style direction: ${styleDescription}.`);
    }

    if (channelContext) {
      systemBlocks.push(`Distribution channel context: ${channelContext}. Adapt legibility and visual impact for this specific context.`);
    }

    // Typography rules — surgical, only when needed
    const wantsText = !noText && (trackName || artistName || additionalText);
    if (noText || (!trackName && !artistName && !additionalText)) {
      systemBlocks.push(
        [
          "Composição puramente visual: NÃO renderize texto, letras, números, palavras, logos, marcas d'água, partituras, BPM ou diagramas técnicos. Sem tipografia de qualquer tipo na imagem.",
          "REGRA CRÍTICA: mesmo se o prompt do usuário mencionar nomes de música, artista, projeto, gênero, banda ou álbum (entre aspas ou não), trate essas menções como CONTEXTO CONCEITUAL para inspirar a cena visual — NUNCA as escreva dentro da imagem. Nenhum texto pode aparecer.",
        ].join("\n")
      );
    } else if (wantsText) {
      const lines: string[] = [];
      lines.push("TIPOGRAFIA OBRIGATÓRIA — esta arte DEVE conter os textos abaixo renderizados de forma legível, integrados ao design (parte da composição, não etiqueta colada). NÃO entregue uma imagem sem esses textos.");
      if (trackName) lines.push(`- TÍTULO DA FAIXA (texto principal, tipografia mais destacada da arte): «${trackName}»`);
      if (artistName) lines.push(`- NOME DO ARTISTA (texto secundário, menor que o título mas claramente legível): «${artistName}»`);
      if (releaseDate) lines.push(`- Data de lançamento: ${releaseDate} — apenas se couber elegantemente, em tamanho pequeno.`);
      if (additionalText) lines.push(`- Texto adicional: «${additionalText}» — apoio curto, se couber.`);
      lines.push(
        "Use APENAS os textos listados acima — caractere por caractere, sem traduzir, sem abreviar, sem alterar grafia, acentuação ou pontuação. NÃO invente subtítulos, taglines, créditos extras, datas, hashtags, números, slogans ou qualquer palavra adicional. Se uma string não foi fornecida acima, não a substitua por nada."
      );
      lines.push("Se o prompt do usuário mencionar OUTROS nomes (de música, artista, projeto, banda, álbum) entre aspas ou não, NÃO os renderize como texto — apenas os textos listados acima podem aparecer escritos na imagem.");
      lines.push("Posicione a tipografia em zona de alta legibilidade (contraste suficiente com o fundo, sem cortes, sem cobrir o sujeito principal). Tratamento tipográfico coerente com o estilo visual escolhido.");
      systemBlocks.push(lines.join("\n"));
    }

    // Reference image handling — translated, simplified, kept rigorous on identity
    if (editImageUrl) {
      const refMode = (referenceMode as string) || "identity";
      const refLines: string[] = [];
      refLines.push("Imagem de referência autorizada anexada pelo usuário (direitos de uso garantidos).");

      if (refMode === "variation") {
        refLines.push(
          "Modo VARIAÇÃO: use a referência como semente conceitual. Preserve clima geral, paleta e sensibilidade estética, mas mude livremente composição, enquadramento, pose, cenário e detalhes. Se houver rosto, pode reinterpretá-lo livremente."
        );
      } else if (refMode === "edit") {
        refLines.push(
          "Modo EDIÇÃO: aplique a instrução textual do usuário sobre a imagem de referência. Preserve sujeitos, composição e identidade; modifique somente o que a instrução pede explicitamente."
        );
      } else {
        refLines.push(
          "IDENTITY mode: the face in the reference image is the artist — preserve their exact likeness as you would a high-end fashion or music editorial retouching brief. What to preserve with absolute fidelity: facial identity, skin tone, distinctive physical features. What you may and should transform freely: composition, framing, crop, background, lighting, color palette, wardrobe, set design, typography and graphic layout. If artistic style conflicts with facial identity, facial identity always wins — execute the style everywhere except on the face."
        );
      }

      systemBlocks.push(refLines.join("\n"));
    }

    const messages: any[] = [
      { role: "system", content: systemBlocks.join("\n\n") },
    ];

    // User message is purely the creative description
    if (editImageUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: editImageUrl } },
        ],
      });
    } else {
      messages.push({ role: "user", content: prompt });
    }

    // Use Nano Banana 2 when typography is required — significantly better text legibility.
    const imageModel = wantsText ? IMAGE_MODEL_TYPOGRAPHY : IMAGE_MODEL_DEFAULT;
    let aiResp = await requestImage(messages, lovableKey, imageModel);

    if (!aiResp.ok) {
      const status = aiResp.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes. Adicione créditos na sua conta." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const txt = await aiResp.text();
      console.error("AI error:", status, txt);
      return new Response(JSON.stringify({
        error: "Não foi possível gerar a imagem agora. Ajuste o prompt ou tente novamente em instantes.",
        code: "image_generation_failed",
        fallback: true,
      }), {
        status: 200, headers: { ...corsHeaders, ...quotaHeaders, "Content-Type": "application/json" },
      });
    }

    let aiData = await aiResp.json();
    let imageData = extractImageData(aiData);

    if (!imageData) {
      console.warn("AI returned no image; retrying with stricter image-only instruction", {
        finishReason: aiData?.choices?.[0]?.finish_reason,
        contentPreview: String(aiData?.choices?.[0]?.message?.content ?? "").slice(0, 240),
      });

      const retryMessages = [
        ...messages,
        {
          role: "user",
          content: "Gere a imagem agora. Responda obrigatoriamente com uma imagem renderizada no campo images; não responda apenas com texto.",
        },
      ];
      aiResp = await requestImage(retryMessages, lovableKey);

      if (!aiResp.ok) {
        const txt = await aiResp.text();
        console.error("AI retry error:", aiResp.status, txt);
        return new Response(JSON.stringify({ error: "Não foi possível gerar a imagem agora. Tente novamente em instantes.", code: "image_generation_failed", fallback: true }), {
          status: 200, headers: { ...corsHeaders, ...quotaHeaders, "Content-Type": "application/json" },
        });
      }

      aiData = await aiResp.json();
      imageData = extractImageData(aiData);
    }

    if (!imageData) {
      return new Response(JSON.stringify({ error: "A IA respondeu sem uma imagem. Ajuste o prompt ou tente gerar novamente.", code: "no_image_returned", fallback: true }), {
        status: 200, headers: { ...corsHeaders, ...quotaHeaders, "Content-Type": "application/json" },
      });
    }

    // Log AI usage
    await supabase.from("ai_invocations").insert({
      user_id: user.id,
      function_name: "generate-creative",
        model: IMAGE_MODEL,
      status: "success",
    });

    // Normalize to exact target dimensions (crop + resize) to honor format spec
    const normalized = await normalizeImageToFormat(imageData, width, height);

    // Return base64 only — user saves explicitly
    return new Response(JSON.stringify({
      imageBase64: normalized,
      width,
      height,
    }), {
      headers: { ...corsHeaders, ...quotaHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-creative error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
