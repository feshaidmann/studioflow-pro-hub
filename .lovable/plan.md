# Modo Debug do Criativo

Objetivo: permitir que você veja exatamente o `system prompt`, as diretivas de texto e o `user prompt` que a edge function `generate-creative` envia ao modelo, junto com metadados (modelo usado, `wantsText`, `noText`, `trackName`, `artistName`, etc.) — para diagnosticar por que o texto está sendo ignorado.

## 1. Edge function `generate-creative/index.ts`

- Aceitar um novo campo opcional no body: `debug: boolean`.
- Quando `debug === true`:
  - Montar normalmente `systemBlocks`, `textDirectiveLines`, `userText`, `imageModel`.
  - **Não** chamar o modelo nem consumir cota.
  - Responder `200` com:
    ```json
    {
      "debug": true,
      "model": "<imageModel>",
      "wantsText": true|false,
      "noText": true|false,
      "fields": { "trackName": "...", "artistName": "...", "releaseDate": "...", "additionalText": "..." },
      "systemPrompt": "<conteúdo final do system>",
      "textDirectives": ["...", "..."],
      "userPrompt": "<userText final, igual ao enviado>",
      "messagesPreview": [ { "role": "system", "content": "..." }, { "role": "user", "content": "..." } ]
    }
    ```
- Manter o caminho normal intacto quando `debug` é falso/ausente.

## 2. Página `src/pages/Creative.tsx`

- Adicionar um toggle “Modo debug (não gera imagem)” perto do botão Gerar, escondido atrás de um `details`/accordion “Avançado” para não poluir a UI.
- Quando ativo, ao clicar em Gerar:
  - Enviar `debug: true` no payload existente (mesma função).
  - Em vez de exibir imagem, abrir um painel `DebugPromptPanel` com:
    - Modelo escolhido + flags `wantsText`/`noText`.
    - Campos detectados (`trackName`, `artistName`, ...).
    - System prompt (textarea read-only, monoespaçada, com botão Copiar).
    - Diretivas de texto (lista).
    - User prompt final (textarea read-only + Copiar).
  - Botão “Gerar de verdade agora” que reenvia o mesmo payload sem `debug`.

## 3. Componente novo

`src/components/creative/DebugPromptPanel.tsx`
- Props: payload de debug retornado pela função.
- Usa tokens semânticos (`bg-muted`, `text-muted-foreground`, `border`), respeitando o tema light macOS já memorizado.
- Sem dependências novas.

## 4. Validação

- Rodar com texto desabilitado e habilitado (com e sem `trackName`/`artistName`) e conferir no painel se as diretivas aparecem ou se o prompt está degenerando para “puramente visual” por falta dos campos — hipótese principal levantada na análise anterior.

## Detalhes técnicos

- `messagesPreview` corta o `image_url` em modo edição para evitar resposta gigante (substitui por `"[image omitted]"`).
- Como `debug` curto-circuita antes do `requestImage`, não há custo de IA nem entrada em `ai_invocations`.
- Nenhuma mudança em RLS, banco, ou contratos públicos.
