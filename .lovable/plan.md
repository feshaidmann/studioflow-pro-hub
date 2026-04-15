

# Ativar Perfil Cultural + Recomendações de Editais de Ponta a Ponta

## Resumo
Conectar o motor de recomendações (`match-editais`) à interface, expandir as áreas culturais disponíveis, e criar uma seção "Recomendados para você" na tela de Editais vinculada ao projeto selecionado.

---

## Mudanças

### 1. Expandir áreas culturais no `ProjectCulturalProfile`

**Arquivo:** `src/components/project-hub/ProjectCulturalProfile.tsx`

- Expandir `AREA_OPTIONS` de 2 para ~10: Música, Audiovisual, Artes Cênicas, Artes Visuais, Literatura, Patrimônio Cultural, Cultura Popular, Dança, Circo, Cultura Digital
- Usar layout em wrap para acomodar mais opções

### 2. Seção "Recomendados" na tela de Editais

**Arquivo:** `src/pages/Editais.tsx`

- Adicionar seletor de projeto no topo da aba "Meus Editais" (usa `useProjects` já importado)
- Quando um projeto com `perfil_cultural` preenchido estiver selecionado, mostrar seção colapsável "Editais recomendados para {nome do projeto}" usando `useMatchEditais`
- Cada card de recomendação mostra: titulo, orgao, estado, score (como badge), prazo, e botão "Ver detalhes" (abre o Sheet existente)
- Se o perfil cultural do projeto estiver vazio, mostrar call-to-action: "Configure o Perfil Cultural do seu projeto para receber recomendações personalizadas" com link para o projeto

### 3. Indicador no Perfil Cultural que recomendações existem

**Arquivo:** `src/components/project-hub/ProjectCulturalProfile.tsx`

- Após salvar o perfil, mostrar toast com guidance: "Perfil salvo! Veja recomendações na aba Editais"
- Adicionar texto informativo abaixo do título: "Estes filtros são usados para recomendar editais compatíveis com seu projeto"

### 4. Edge Function — incluir campos enriquecidos na resposta

**Arquivo:** `supabase/functions/match-editais/index.ts`

- Adicionar `valor`, `publico_alvo`, `resumo` ao SELECT para que as recomendações mostrem dados completos
- Atualizar interface `EditalRow` e `MatchedEdital` no hook correspondente

---

## Arquivos impactados

| Arquivo | Mudança |
|---|---|
| `src/components/project-hub/ProjectCulturalProfile.tsx` | Expandir áreas, texto informativo, toast com guidance |
| `src/pages/Editais.tsx` | Seletor de projeto, seção "Recomendados", integrar `useMatchEditais` |
| `src/hooks/useMatchEditais.ts` | Adicionar campos `valor`, `resumo`, `publico_alvo` à interface |
| `supabase/functions/match-editais/index.ts` | Incluir campos enriquecidos no SELECT |

## Sem alterações de banco de dados
Tudo já existe — `perfil_cultural` (jsonb) nos projetos e a edge function `match-editais` deployada.

