# Plano — Recuperar qualidade criativa do gerador de imagens

## Diagnóstico

Comparando o estado atual do `generate-creative/index.ts` com o que entregava boas artes antes, encontrei três regressões que se somam:

### 1. Prompt virou checklist técnico, não briefing visual
O system prompt hoje tem **5 blocos rotulados** (`[ROLE] [FORMAT] [STYLE] [CHANNEL] [TEXT_RULES] [REFERENCE]`) escritos em inglês burocrático e dominados por **proibições e regras de compliance** ("NEVER render", "Do NOT depict", "ABSOLUTE TEXT BAN", "MANDATORY", "character-for-character", "Verify before finalizing"). Modelos de imagem multimodais (Nano Banana / Gemini Flash Image) **interpretam esse tom como ruído** — eles passam a focar em "obedecer regras" e param de fazer escolhas estéticas autorais. Resultado: composição pobre, simétrica, "stock-like".

### 2. Texto aleatório vem da fricção entre `[TEXT_RULES]` e o prompt do usuário
O bloco `[TEXT_RULES]` ordena ao modelo:
- "render exactly `{trackName}` as the most prominent legible typography"
- "Verify before finalizing: every mandatory text string appears spelled exactly as given"

Mas o `trackName` muitas vezes vem do contexto do projeto sem o usuário ter pedido tipografia. O modelo então **inventa palavras vizinhas** (subtítulos, taglines, datas borradas) para "preencher" a tipografia obrigatória — daí os textos aleatórios que você está vendo. A versão antiga era mais permissiva e o modelo só renderizava texto quando o prompt pedia.

### 3. Descrição do usuário é descartada como "guidance only"
A linha `"The user's creative description is COMPOSITION GUIDANCE ONLY (mood, scene, palette)"` literalmente **diz ao modelo para não levar o prompt criativo a sério como instrução visual** — só usar como humor. Isso achata a entrega: o modelo gera algo "no clima" mas sem a composição específica que o usuário pediu.

Soma desses três fatores = o que você descreveu: "dados aleatórios e composição muito pobre".

---

## Mudanças propostas

### A. Reescrever o system prompt com tom de direção de arte

Substituir o sistema atual de blocos rotulados por um briefing direto e curto, em pt-BR (modelos multimodais Gemini respondem bem a pt-BR e o briefing fica mais natural para o domínio musical brasileiro):

```
Você é diretor de arte para artistas independentes brasileiros.
Sua função é traduzir o briefing do usuário em uma composição visual
autoral, com identidade forte, hierarquia clara e potencial viral
em feed/streaming.

Princípios:
- Composição com intenção: ponto focal claro, hierarquia visual,
  uso ousado de cor, luz e textura. Evite simetria preguiçosa e
  centralização padrão.
- Estética coerente com o cenário musical contemporâneo brasileiro.
- Cada arte é única — varie ângulo, enquadramento, profundidade.

Formato: {aspectStr}, entregue exatamente em {width}×{height}px.
Enquadre a cena inteira nesse aspecto, sem cortes amadores.

Estilo visual: {styleDescription}
Canal de distribuição: {channelContext}
```

Tom positivo + verbos de ação + zero "DO NOT" desnecessários no caminho feliz.

### B. Tornar o tratamento de tipografia condicional e enxuto

Reescrever a lógica de texto da seguinte forma:

- **Caso `noText` ou nenhum `trackName`/`artistName`**: regra única e curta:
  `"Composição puramente visual. Não renderize nenhum texto, letra, número ou logotipo na imagem."`

- **Caso `trackName` e/ou `artistName` foram preenchidos**: instrução curta, não-paranoica:
  ```
  Tipografia integrada à composição:
  - Título da faixa: "{trackName}" (mais destacado)
  - Artista: "{artistName}" (secundário)
  Use APENAS esses textos. Não invente subtítulos, taglines,
  datas, créditos ou qualquer outra palavra. Mantenha a grafia
  exata. Se uma string não foi fornecida, não a invente.
  ```

A frase **"Use APENAS esses textos. Não invente..."** ataca diretamente o problema de texto aleatório — é uma proibição cirúrgica e justificada, em vez de cinco proibições genéricas que confundem o modelo.

### C. Tratar o prompt do usuário como instrução, não como "mood"

Remover a linha `"The user's creative description is COMPOSITION GUIDANCE ONLY"`. Substituir por:

```
O briefing do usuário (mensagem abaixo) é a INSTRUÇÃO PRIMÁRIA
de composição: cena, sujeitos, atmosfera e elementos visuais
descritos devem aparecer na imagem. Interprete com liberdade
artística, mas não ignore.
```

Isso devolve agência ao prompt do usuário — que é o que faz a versão "antiga" parecer mais criativa: ela respeitava o que o artista escrevia.

### D. Manter (sem mudar) o que já está bom

- `aspectLabel()` e `normalizeImageToFormat()` (crop + resize Lanczos) — funcionando bem
- Bloco `[REFERENCE]` para upload de imagem (identity/variation/edit) — está bem desenhado, só vou traduzir para pt-BR e simplificar o tom
- `STYLE_DESCRIPTIONS` em inglês — manter (são descrições de estilo visual padrão da indústria, modelo entende melhor em inglês)
- Quotas, retry com instrução stricter, normalização final, fallback gracioso — todos mantidos

### E. Não mexer em

- `mode === "text"` (geração de legendas) — está separado e funcionando
- Frontend (`Creative.tsx`, `ImagePreview.tsx`, `useCreativeAssets.ts`) — nenhuma mudança de contrato
- Tabela `creative_assets`, storage bucket — sem migração
- `FormatSelector`, `StyleChips`, `QuickTemplates` — intactos

---

## Arquivo editado

- `supabase/functions/generate-creative/index.ts` — apenas a montagem do system prompt (linhas ~298-346) e a linha 320 (descarte do prompt como "guidance"). Total: ~50 linhas reescritas em uma única edição. Sem mudanças em assinatura, sem migração, sem secrets novos.

## Risco e validação

- **Risco**: baixo. Mudança contida em string-building no edge function, mantém todos os campos de input/output.
- **Como você valida**: gerar 2-3 artes com cenários comuns:
  1. Capa de single com `trackName` + `artistName` → verificar se só esses dois textos aparecem
  2. Post de bastidor sem trackName → verificar se sai imagem 100% sem texto
  3. Story descritivo livre ("artista no estúdio analógico, luz quente, fita rolando") → verificar se a composição tem assinatura autoral, não "stock"

Aprove para eu reescrever o system prompt e re-deployar a edge function.
