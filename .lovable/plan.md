# Melhorias de CX — Módulo Criativo no Fluxo do Projeto

Implementar as 4 melhorias de maior impacto identificadas na auditoria, ligando melhor o módulo Criativo ao Hub do Projeto e ao Checklist de Lançamento.

## 1. Pré-popular detalhes da faixa quando vier do projeto

**Arquivo:** `src/pages/Creative.tsx`

Quando o usuário entra com `?project=<id>`:
- Preencher `trackName` com `linkedProject.name` (via `cleanTrackName`)
- Preencher `artistName` com `linkedProject.artist`
- Abrir o `Collapsible` de "Detalhes da faixa" (`setTrackDetailsOpen(true)`)
- Disparar apenas uma vez (guard via `useRef`) para não sobrescrever edições do usuário

## 2. Auto-filtrar a Galeria pelo projeto vinculado

**Arquivo:** `src/pages/Creative.tsx`

- Ao detectar `?project=<id>`, setar `filterProject = projectIdParam` por padrão
- Mostrar um chip removível ("Filtrando: <Nome do projeto> ✕") acima da grid quando o filtro vier do contexto

## 3. Auto-marcar itens do Checklist de Lançamento ao salvar arte do projeto

**Arquivos:**
- `src/hooks/useReleaseChecklist.ts` — exportar helper `markChecklistItem(projectId, key)` que faz upsert direto via `supabase` (sem depender da instância do hook)
- `src/pages/Creative.tsx` — após `saveAsset` bem-sucedido com `projectId`, mapear formato → chave de checklist e chamar o helper:
  - `spotify_cover` → `capa`
  - `youtube_cover` → `thumbnail`
  - `reels_loop` → `reels`
  - `story` → `stories`
  - `instagram_post` → (nenhum, ignorar)
- Mostrar toast: "Item '<label>' marcado no checklist do projeto"

Helper faz `select` da row, faz merge de `items[key] = { checked: true, value: "" }` e `update`/`insert`. Se já estava marcado, no-op silencioso.

## 4. Analytics do módulo Criativo

**Arquivo:** `src/pages/Creative.tsx`

Adicionar `trackEvent` (de `@/lib/analytics`) em pontos-chave:
- `creative_opened` — no mount, com `{ from_project: !!projectIdParam, has_dna: !!dnaParam }`
- `creative_generated` — após geração de imagem com sucesso, `{ format, has_dna, has_reference, project_linked }`
- `creative_saved_to_gallery` — após `saveAsset`, `{ format, project_linked, media_type }`
- `creative_caption_generated` — em `CaptionGeneratorCard.tsx` ao gerar legenda
- `creative_returned_to_project` — no clique do botão "Voltar ao projeto"

## Detalhes técnicos

- Não há mudanças de schema; `release_checklists` já suporta o upsert.
- O helper `markChecklistItem` precisa do `user_id` (vem de `useAuth`).
- `trackEvent` é no-op até PostHog ser inicializado, então é seguro para shipar agora.
- Nenhum item é desmarcado automaticamente — somente marcação aditiva, para não atropelar o controle manual do usuário.

## Fora de escopo (deixar para depois)
- Contagem de materiais já criados no `CreativeEntryCard`
- Botão "desfazer" no toast de auto-save
- Refatoração do listener `open-feedback` (já implementado)
