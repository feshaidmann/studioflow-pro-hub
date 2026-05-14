## Objetivo

Substituir o módulo "Criativo" (que gera ativos finais para publicação) pelo módulo **Direção Visual**, que gera um **briefing estruturado** para o artista enviar a um designer. A IA produz apenas referências e rascunhos. O módulo roda **em paralelo à produção musical** — não está atrelado a nenhum stage do projeto.

---

## 1. Remoções

Apagar do app:

- `src/pages/Creative.tsx`
- `src/components/creative/` inteiro (CaptionGeneratorCard, FormatSelector, FormatChips, ImagePreview, GalleryLightbox, StyleChips, ReferenceImageUpload, QuickTemplates, VideoEffectPicker, VideoLoopGenerator, videoLayers, DebugPromptPanel, DeriveBatchDialog)
- `src/hooks/useCreativeAssets.ts`
- Rota `/criativo` em `src/App.tsx`
- Item de menu `nav.creative` / `/criativo` em `src/components/AppLayout.tsx` (incluindo lazy preload)
- Edge function `supabase/functions/generate-creative/` + `supabase--delete_edge_functions(["generate-creative"])`

Manter as tabelas `creative_assets` e `creative_captions` no banco como histórico (não dropar nesta entrega).

---

## 2. Banco

Migration única:

- Tabela `visual_briefings` (project_id, user_id, version, artistic_profile jsonb, generated_images jsonb, approved_images jsonb, generated_palette jsonb, copy_options jsonb, approved_copy, designer_notes, regeneration_count, pdf_url, timestamps).
- RLS: `auth.uid() = user_id` para ALL.
- CHECK `regeneration_count <= 5`.
- Trigger `update_updated_at_column` em UPDATE.
- Bucket privado de Storage `briefings` com policy de leitura/escrita por owner via path `{user_id}/...`.

**Sem** alteração de stages do projeto. **Sem** novo valor `identidade_visual`.

---

## 3. Edge Functions

### `generate-visual-direction` (POST)

- Input: `{ project_id, artistic_profile, briefing_id? }`. Valida `genres`, `moods` (≥1) e `artist_refs` — senão `400`.
- Imagens: 6 chamadas paralelas a `google/gemini-3.1-flash-image-preview` via Lovable AI Gateway (`LOVABLE_API_KEY`). Cada prompt monta `genres + moods + artist_refs + identity_phrase` com variação de estilo e `style_tag` (ex.: "Escuro · urbano", "P&B · grão analógico", "Cinematográfico", "Editorial", "Documental", "Onírico"). Label fixo "Referência de estilo".
- Paleta + copy: 1 chamada a `google/gemini-3-flash-preview` com `Output.object` (zod) retornando `{ palette: { colors[], rationale }, copy_options: [{id,label,text}×3] }`. System prompt: copywriter musical, tom autoral, JSON válido.
- Persiste em `visual_briefings`. Se `briefing_id` veio no body é regeneração — incrementa `regeneration_count` (guard `<= 5`, senão `429`). Retorna o registro.
- Trata 402/429 do gateway com mensagem clara para o cliente.

### `export-visual-briefing` (POST)

- Input: `{ briefing_id }`. Valida ownership.
- Gera PDF com `npm:jspdf` (header com artista + projeto + data; seções Gênero/Mood/Referências/Direção Estética com imagens + label "Referência de estilo"/Paleta com swatches/Copy aprovada/Notas; footer "Gerado via StudioFlow Pro · Direção Visual").
- Upload em `briefings/{user_id}/{briefing_id}.pdf` no bucket privado. Gera signed URL (1h), grava `pdf_url`, retorna URL.

---

## 4. Frontend — `src/components/visual-direction/`

- `VisualDirectionPage.tsx` — stepper de 4 etapas (`profile | generation | review | briefing`), barra de progresso, persiste `briefingId` em estado.
- `ArtisticProfileStep.tsx` — formulário (genres tag-input com sugestões, máx 4; moods multi-select máx 3; artist_refs textarea obrigatório; external_refs opcional; palette presets JSP + hex custom até 3 cores; identity_phrase 120 chars). Botão "Próximo" desabilitado até campos obrigatórios preenchidos.
- `GenerationStep.tsx` — chama edge function, exibe loading com Sonner. Grid 3×2 com label fixo "Referência de estilo", seleção com borda dourada e checkmark. Botão "Regenerar imagens (N/5)" desabilitado em 5 com tooltip "Limite atingido para esta sessão". Paleta com swatches + rationale. 3 cards de copy A/B/C, seleção exclusiva.
- `ReviewStep.tsx` — chips removíveis das imagens, swatches read-only, copy editável inline com botão "✏ Editar", textarea `designer_notes`. **AlertDialog** se `approved_copy === texto original` ao clicar em "Gerar briefing →".
- `BriefingStep.tsx` — card consolidado, "⬇ Baixar PDF" (chama `export-visual-briefing`), "🔗 Copiar link" com Sonner. Banner CTA marketplace com botão "Encontrar designer" desabilitado + tooltip "Em breve".

Página: `src/pages/VisualDirection.tsx` (lê `:id` do projeto, valida ownership, monta `VisualDirectionPage`).

Rota: `/projeto/:id/direcao-visual` em `src/App.tsx` (lazy).

---

## 5. Como o usuário entra no módulo

Sem trigger por stage. Três pontos de entrada paralelos:

1. **Sidebar** (substitui o item criativo antigo) — ícone `Palette`, label "Direção Visual". Path computado: `/projeto/${currentProjectId}/direcao-visual`.
   - Sem projeto ativo → desabilitado, tooltip "Abra um projeto para usar este módulo".
   - `plan: 'free'` → badge "Pro" + abre modal de upgrade existente em vez de navegar.
2. **Aba dentro do ProjectDetail** — adicionar uma aba "Direção Visual" na navegação interna do projeto (ao lado de Visão Geral, Tarefas etc.) que abre o módulo no contexto do projeto. Disponível em **qualquer stage**.
3. **Card de sugestão suave** no ProjectOverviewTab — mostrar um card "Já pensou na identidade visual? Comece o briefing em paralelo à produção" com CTA para o módulo. Sem dependência de stage; some quando já existe um `visual_briefings` para o projeto.

Adicionar chaves PT/EN em `LanguageContext` (`nav.visualDirection`, `tabs.visualDirection`, `visualDirection.suggestionTitle`, etc).

---

## 6. Tokens & regras inegociáveis

- Reutilizar tokens HSL semânticos do `index.css` (light mode, conforme memória). Cores específicas (`#C9A84C`, `#8B6FD4`, `#3DB882`, `#2D9CDB`, `#080810`) entram **apenas** como presets de paleta no formulário e como swatches do briefing — **não** como background do app.
- Nenhum botão de "publicar / postar / enviar para rede social".
- Label "Referência de estilo" presente na grid, nos chips do Review e no PDF.
- Edge function rejeita `400` sem `genres`/`moods`/`artist_refs`.
- Módulo só funciona com `project_id` válido.
- `regeneration_count <= 5` enforced no banco (CHECK) e na edge function.

---

## 7. Memória

Ao final, atualizar `mem://index.md`:

- Adicionar entrada `Direção Visual` (novo módulo, tabela `visual_briefings`, edge functions, regra de só-rascunho, **roda em paralelo à produção, não é stage**).
- Adicionar constraint: módulo criativo antigo (`/criativo`) removido — não recriar.
- **Não** alterar `Project Workflow` (continua 6 stages).

---

## Detalhes técnicos

```text
Banco
  visual_briefings (RLS owner-only, CHECK regeneration_count<=5)
  storage bucket "briefings" (privado, signed URLs)

Edge functions
  generate-visual-direction  → Lovable AI (gemini-3.1-flash-image-preview ×6 + gemini-3-flash-preview Output.object)
  export-visual-briefing     → jspdf + storage upload + signed URL

Frontend
  src/pages/VisualDirection.tsx
  src/components/visual-direction/{VisualDirectionPage,ArtisthapProfileStep,GenerationStep,ReviewStep,BriefingStep,StylePresets}.tsx
  Rota /projeto/:id/direcao-visual
  Sidebar item "Direção Visual"
  Aba "Direção Visual" no ProjectDetail
  Card de sugestão no ProjectOverviewTab (sem gating de stage)

Removidos
  /criativo (rota, page, components, hook, edge function generate-creative)
```

---

## Ordem de execução (em sequência, no mesmo ciclo)

1. Migration (`visual_briefings` + bucket `briefings`) → aguardar aprovação.
2. Edge functions (`generate-visual-direction`, `export-visual-briefing`) + remoção do módulo antigo (arquivos + `delete_edge_functions(["generate-creative"])`).
3. Componentes React, página, rota, sidebar, aba no ProjectDetail, card de sugestão no Overview, atualização de memória.
