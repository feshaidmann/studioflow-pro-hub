## Objetivo

Adicionar uma nova aba **"Direção Visual"** no `ProjectDetail` que mostra status atual do briefing visual do projeto, progresso pelas 4 etapas do stepper, e um card de sugestão via IA que pré-preenche o perfil artístico com base no contexto do projeto (gênero, artista, biografia, DNA musical se houver).

## Mudanças

### 1. Novo componente: `ProjectVisualDirectionTab.tsx`
Local: `src/components/project-hub/ProjectVisualDirectionTab.tsx`. Renderizado dentro da nova aba (somente owner).

Carrega `visual_briefings` do projeto via `useVisualBriefing(projectId)` (hook já existe). Renderiza:

- **Header com status badge** derivado do `current_step`:
  - sem registro → "Não iniciado" (neutro)
  - `profile` → "Rascunho" (secondary)
  - `generation` → "Em geração" (primary)
  - `review` → "Em revisão" (primary)
  - `briefing` → "Pronto" (success)
- **Barra de progresso** (`<Progress />`) com `value = (stepIndex+1)/4 * 100`. Texto "Etapa N de 4 — {label}".
- **Resumo de conteúdo** (quando aplicável): contagem de imagens aprovadas, paleta (mini swatches), copy aprovada truncada.
- **Card de sugestão IA** (visível apenas no estado "Não iniciado" ou "Rascunho" e quando `artistic_profile` ainda está vazio):
  - Texto explicativo curto + botão **"Sugerir com IA"**.
  - Ao clicar: chama edge function `suggest-visual-direction` enviando `{ project_id }`. Mostra `Loader2` durante a chamada.
  - Resposta: pré-popula via `updateProfile(...)` (autosave do hook cuida da persistência) e exibe toast de sucesso. Trata 429/402 mostrando mensagem clara.
- **Botão CTA "Abrir Direção Visual"** que navega para `/projects/:id/direcao-visual` (página completa permanece a UX principal de edição).

### 2. Atualizar `ProjectDetail.tsx`
- Adicionar import `Palette` (lucide) e o novo `ProjectVisualDirectionTab`.
- Adicionar entrada `{ value: "visual", label: "Visual", icon: Palette }` ao array de tabs do owner.
- Trocar `grid-cols-6` por `grid-cols-7` na `TabsList` quando `isOwner`.
- Adicionar `<TabsContent value="visual"><ProjectVisualDirectionTab projectId={project.id} project={project} /></TabsContent>`.
- Não adicionar para colaborador (mantém escopo do dono).

### 3. Nova edge function: `suggest-visual-direction`
Local: `supabase/functions/suggest-visual-direction/index.ts`. `verify_jwt = false` herdado.

- CORS padrão (`npm:@supabase/supabase-js@2/cors`).
- Valida JWT do header Authorization (extrai `user_id`).
- Body: `{ project_id: string }` validado com Zod.
- Carrega contexto do banco com client `service_role`:
  - `projects` (name, artist, project_type, stage)
  - `profiles` (primary_genre, bio, city, state, specialties)
  - `music_dna_analyses` mais recente do projeto (se houver) → genre, valence, energy, tempo_bpm
- Usa Lovable AI Gateway (`@ai-sdk/openai-compatible` + `ai`) com `google/gemini-3-flash-preview` e `Output.object` (Zod) para devolver `ArtisticProfile`:
  ```ts
  { tone: string, references: string[], target_audience: string,
    color_keywords: string[], mood_keywords: string[], notes: string }
  ```
- Loga em `ai_invocations` com `function_name='suggest-visual-direction'`.
- Trata 429/402 e devolve status apropriado.

### 4. i18n (mínimo)
Adicionar em `src/contexts/LanguageContext.tsx` chaves `visual.tab.label`, `visual.status.*`, `visual.suggest.cta`, `visual.suggest.error` (PT/EN). A aba já mostra o ícone como fallback no mobile.

## Fora do escopo
- Não mexer em `useVisualBriefing` (hook já expõe `updateProfile` que basta para aplicar a sugestão).
- Não tocar no fluxo do stepper na página `/direcao-visual`.
- Sem gating Pro (decisão anterior: manter sempre Pro).
- Sem novas migrations (`current_step` já existe).

## Detalhes técnicos

```text
ProjectDetail tabs (owner)
┌──────┬──────┬──────┬──────┬──────┬───────┬────────┐
│Visão │Tarefa│Equipe│Arquiv│Finanç│Lançam.│ Visual │  ← nova
└──────┴──────┴──────┴──────┴──────┴───────┴────────┘

ProjectVisualDirectionTab
┌────────────────────────────────────────┐
│ [Status badge]  Etapa N de 4 — label   │
│ ▓▓▓▓░░░░░░  50%                        │
│ • 4 imagens aprovadas                  │
│ • Paleta: ■■■■■                        │
│ • Copy: "..."                          │
├────────────────────────────────────────┤
│ ✨ Sugerir com IA                      │  (só se vazio)
│ Cria um rascunho com base no projeto.  │
│ [Sugerir com IA]                       │
├────────────────────────────────────────┤
│           [Abrir Direção Visual →]     │
└────────────────────────────────────────┘
```

Arquivos tocados: 4 (1 novo componente, 1 nova edge function, ProjectDetail, LanguageContext).
