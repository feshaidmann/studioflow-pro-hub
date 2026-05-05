## Objetivo

Adicionar campos de segmentação em `projects`, `profiles` e `project_members` para alimentar futuras análises (custo médio por gênero, ROI, tempo de produção etc.) — sem expor essa camada ao usuário. Cada campo entra com framing de benefício direto ("ver referências do seu estilo", "comparar seu crescimento").

Convenções respeitadas: PT-BR, light mode, macOS minimalist, RLS owner-only inalterada.

---

## 1. Migração SQL

Em `projects`:
- `genre TEXT`, `subgenre TEXT`
- `artist_state TEXT`
- `audience_size_at_start TEXT` (faixas: `0-500`, `500-2k`, `2k-10k`, `10k-50k`, `50k+`)
- `production_start_date TIMESTAMPTZ DEFAULT NOW()`
- `distributor TEXT`
- Trigger `set_updated_at` em `projects` (atualiza `updated_at` em todo UPDATE)

Em `profiles`:
- `primary_genre TEXT`
- `state TEXT`
- `career_start_year INTEGER`

Em `project_members`:
- `specialty_category TEXT`

Sem alterar RLS — as políticas existentes já cobrem os novos campos.

---

## 2. Constantes compartilhadas

`src/constants/genreOptions.ts` com:
- `GENRE_OPTIONS` (18 gêneros + "Outros")
- `AUDIENCE_SIZE_OPTIONS` (5 faixas)
- `DISTRIBUTOR_OPTIONS` (8 + "Outra")
- `BRAZIL_STATES` (27 UFs)

`src/constants/specialtyOptions.ts` extraído do array atual em `FreelancerProfile.tsx`, importado pelos dois consumidores (Profile + ProjectTeamTab).

---

## 3. Onboarding (`src/pages/Onboarding.tsx`)

- Novo passo opcional **Gênero principal** (após "Desafio", antes de "Modo") — grid com top 10 gêneros + "Outros", com botão "Pular por agora". Persiste em `profiles.primary_genre`.
- No passo de Identidade, adicionar `<Select>` de UF (`BRAZIL_STATES`) abaixo de Cidade. Persiste em `profiles.state`.
- Atualizar `stepLabels` para 7 passos.
- Atualizar `OnboardingGuest.tsx` com o mesmo Select de UF (passo 1).

## 4. Projects.tsx

No formulário de criação:
- `<Select>` **Gênero principal** (obrigatório) com tooltip "Usamos para te mostrar referências do seu estilo".
- `<Select>` **Seus seguidores hoje** (opcional) com tooltip "Comparar seu crescimento ao longo do tempo".
- Em background: `artist_state = profile.state`, `production_start_date = now()`.

No dialog de edição: mesmos dois campos, populados com valores atuais, persistidos via `updateProject()`.

Estender `addProject`/`updateProject` em `src/contexts/ProjectContext.tsx` e mapeamento em `src/data/mockData.ts` (tipo `Project`) para incluir os novos campos.

## 5. Release Checklist

`src/hooks/useReleaseChecklist.ts`:
- `ChecklistItemDef.type` aceita `"select"` com `options?: readonly string[]`.
- `genero` → `type: "select"`, `options: GENRE_OPTIONS`.
- `distribuidora` → `type: "select"`, `options: DISTRIBUTOR_OPTIONS`.
- `setValue` adicional: quando key for `distribuidora`, atualizar `projects.distributor`. Quando `genero`, atualizar `projects.genre` (mantém ambas fontes em sincronia).

`ProjectReleaseTab.tsx`: renderizar `<Select>` quando `item.type === "select"`.

## 6. Perfil público (`src/pages/FreelancerProfile.tsx`)

- Importar `SPECIALTY_OPTIONS` da nova constante (sem mudança de UI).
- Adicionar `<Select>` **Gênero principal** após especialidades.
- Adicionar `<Select>` **Estado (UF)** abaixo de cidade.
- Persistir `primary_genre` e `state` no `updateProfile()`.

Atualizar `Profile` em `src/contexts/ProfileContext.tsx` (interface + select da query) com `primary_genre`, `state`, `career_start_year`.

## 7. ProjectTeamTab.tsx

No formulário de adição de membro: `<Select>` **Especialidade** (`SPECIALTY_OPTIONS`), opcional. Inserir como `specialty_category` no `project_members`.

---

## 8. Não alterar

- Nenhum dashboard/UI de "benchmark" agora.
- `genre` não retroativamente obrigatório para projetos antigos.
- Campo `key` (tonalidade) permanece como texto livre.
- RLS, dark mode, inglês, módulo `/studio`, fluxo de pagamento — intactos.

---

## Arquivos tocados

```text
supabase/migrations/<timestamp>_market_intel_fields.sql   (nova)
src/constants/genreOptions.ts                              (novo)
src/constants/specialtyOptions.ts                          (novo)
src/contexts/ProfileContext.tsx
src/contexts/ProjectContext.tsx
src/data/mockData.ts
src/pages/Onboarding.tsx
src/pages/OnboardingGuest.tsx
src/pages/Projects.tsx
src/pages/FreelancerProfile.tsx
src/hooks/useReleaseChecklist.ts
src/components/project-hub/ProjectReleaseTab.tsx
src/components/project-hub/ProjectTeamTab.tsx
```
