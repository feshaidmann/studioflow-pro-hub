# Plano — Persistência real + autosave do Stepper de Direção Visual

## Estado atual
- Já existe `visual_briefings` no banco com RLS por dono e edge functions `generate-visual-direction` e `export-visual-briefing`.
- A página `VisualDirection.tsx` carrega o briefing mais recente do projeto e re-deriva o passo a partir do conteúdo (`approved_copy → briefing`, imagens selecionadas → `review`, imagens geradas → `generation`).
- Persistência hoje só acontece em três pontos discretos: clique em "Gerar referências" (cria a linha), toggle de imagem (fire-and-forget) e clique em "Gerar briefing" (salva copy/notes/approved_images).
- O perfil artístico digitado **não é salvo** se o usuário fechar a aba antes de gerar.
- Edições de copy/notes só persistem no clique final.
- O passo atual não é persistido — refresh re-deriva, o que pode jogar o usuário num passo diferente do que ele estava.
- Não há indicador visual de "salvando…" / "salvo".

## O que muda

### 1. Migration — novos campos em `visual_briefings`
- `current_step text not null default 'profile'` — para restaurar exatamente onde o usuário parou.
- `last_saved_at timestamptz` — opcional, alimentado pelo trigger `update_updated_at_column` que já existe; usaremos `updated_at` direto (sem novo campo).
- Índice `(project_id, user_id)` já é coberto por RLS; nada a adicionar.

### 2. Hook `useVisualBriefing(projectId)`
Centraliza tudo num hook em `src/components/visual-direction/useVisualBriefing.ts`:
- Carrega o briefing mais recente do projeto (mesma query atual).
- Estado: `briefing`, `step`, `status` (`idle | saving | saved | error`), `loading`, `generating`.
- `setStep(next)` muda local + persiste `current_step` (debounced 400ms).
- `updateProfile(partial)` faz **merge no `artistic_profile`** e debounced-saves (400ms). Cria a linha no banco via upsert se ainda não existir (insert minimal: project_id, user_id, artistic_profile, current_step='profile').
- `updateReview({ approved_copy, designer_notes })` debounced-save (600ms) com merge.
- `toggleImage(id)` mantém otimista, agora com tratamento de erro → reverte e mostra status `error`.
- `generate(profile, regen)` chama a edge function (já existe) e atualiza estado.
- `saveAndAdvance(stepKey)` força flush de pendências antes de mudar de passo (ex: ao clicar "Revisar →").
- Cleanup: flush em `unmount` / `beforeunload` para não perder digitação recente.

### 3. UX em cada passo
- **ArtisticProfileStep**: passa a notificar mudanças via novo callback `onChange(profile)` (debounced no hook). Botão "Gerar referências →" continua disparando a edge function. O draft fica salvo mesmo se o usuário sair antes de gerar; ao voltar, o form é re-hidratado.
- **GenerationStep**: sem mudança visual; toggles agora exibem status quando falham.
- **ReviewStep**: copy e designer_notes passam a chamar `onChange` debounced. O botão "Gerar briefing →" usa `saveAndAdvance("briefing")` para garantir flush.
- **BriefingStep**: sem mudança.

### 4. Indicador de status
- Pequeno chip ao lado do `Stepper`: ⏳ "Salvando…" / ✓ "Salvo há 12s" / ⚠ "Falha ao salvar — tentar novamente" (com botão de retry que chama o flush).
- Calculado a partir de `status` + `briefing.updated_at`.

### 5. Restauração ao reabrir
- Ao carregar, usar `briefing.current_step` direto. Se vier vazio (linhas antigas), aplicar a heurística atual como fallback.
- Validação defensiva: se `current_step === 'review'` mas não há imagens selecionadas, cair para `generation`.

## Arquivos afetados

```
supabase/migrations/<novo>.sql                                  — adiciona current_step
src/components/visual-direction/useVisualBriefing.ts            — novo hook
src/components/visual-direction/SaveStatus.tsx                  — novo chip
src/components/visual-direction/ArtisticProfileStep.tsx         — adiciona onChange
src/components/visual-direction/ReviewStep.tsx                  — adiciona onChange
src/pages/VisualDirection.tsx                                   — usa o hook, remove estado local duplicado
```

## Detalhes técnicos

- Debounce simples por `setTimeout` + `clearTimeout` em `useRef`. Sem dependência nova.
- Merge de `artistic_profile` é shallow no cliente (campo é JSON). Update envia o objeto completo para evitar conflitos parciais.
- `flushPending()` é chamado antes de qualquer mudança de passo, antes do `generate`, no cleanup do `useEffect` do hook e em `window.addEventListener('beforeunload')`.
- Race protection: cada save guarda um `requestId` incremental; respostas fora de ordem são descartadas.
- Erros de rede: status vai para `error`, toast discreto (sonner), botão de retry no chip.
- Sem mudanças nas edge functions — elas já fazem upsert correto.

## Fora de escopo
- Histórico de versões (`version` continua incrementando só na regeneração via edge function).
- Realtime entre abas do mesmo usuário (não solicitado).
- Conflito multi-usuário (briefing é estritamente owner-only via RLS).
