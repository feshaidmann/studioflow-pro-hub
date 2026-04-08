

# Fase 1 — Novo Onboarding Orientado ao Uso

## Objetivo
Substituir o onboarding atual (4 passos genéricos: nome, projeto, modo, resumo) por um fluxo de 6 passos que ativa o usuário no uso real do produto — coletando momento, tipo de projeto, modo, maior dor, identidade, e criando automaticamente o primeiro projeto. Ao final, redirecionar para `/projects/:id` em vez de `/dashboard`.

## Diagnóstico da base atual

**O que já funciona e será preservado:**
- `ProfileContext` com `updateProfile`, `needsProfileSetup`, `isSimpleMode`
- `ProjectContext.addProject()` retorna `Project | null` (com `id`)
- Rota `/onboarding` já existe no `App.tsx`
- Guard `ProtectedRoute` redireciona para `/onboarding` se `needsProfileSetup`
- Flag `onboarding_completed` na tabela `profiles` (server-side)
- Trigger `handle_new_user` cria profile automaticamente

**O que precisa mudar:**
- `profiles` precisa de 3 novos campos: `current_moment`, `main_pain`, `onboarding_version`
- `track_view_mode` já serve como `preferred_mode` — sem campo novo
- `Onboarding.tsx` será reescrito com 6 steps
- `ProfileContext` precisa incluir os novos campos no select e no tipo

## Migration necessária

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_moment text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS main_pain text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS onboarding_version integer NOT NULL DEFAULT 1;
```

Justificativa: campos com defaults vazios, sem quebrar registros existentes. `onboarding_version` permite distinguir usuários do onboarding antigo vs novo.

## Arquivos que serão alterados

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Onboarding.tsx` | Reescrever com 6 steps (momento, tipo, modo, dor, identidade, confirmação) |
| `src/contexts/ProfileContext.tsx` | Adicionar `current_moment`, `main_pain`, `onboarding_version` ao tipo Profile e ao select |

## Arquivos que serão criados

Nenhum novo arquivo. Evolução incremental do existente.

## Hooks/contexts afetados

- `ProfileContext` — tipo Profile expandido, select ampliado
- `ProjectContext` — apenas consumido (addProject), sem alteração

## Tabelas afetadas

- `profiles` — 3 novos campos (migration)

## Riscos de regressão

| Risco | Mitigação |
|-------|-----------|
| Campos novos quebrarem upsert existente | Defaults NOT NULL com valor vazio — sem impacto |
| Select do ProfileContext não incluir campos novos | Adicionar explicitamente ao select |
| Usuários que já completaram onboarding v1 | `onboarding_completed` já é true — não serão afetados |
| Redirect para projeto inexistente se addProject falhar | Fallback para `/dashboard` |

## Estratégia de implementação (3 blocos sequenciais)

1. **Migration** — adicionar 3 campos ao profiles
2. **ProfileContext** — expandir tipo e select
3. **Onboarding.tsx** — reescrever com 6 steps

## Novo fluxo do onboarding (6 steps)

```text
Step 1: Momento atual
  - "Tenho uma ideia" → stage: inicio
  - "Já estou produzindo" → stage: gravacao
  - "Tenho música pronta" → stage: master
  - "Quero lançar" → stage: upload

Step 2: Tipo de projeto
  - Single / EP / Álbum

Step 3: Modo de uso
  - Simples (basic) / Completo (advanced)

Step 4: Maior dificuldade
  - Organização / Equipe / Prazos / Financeiro / Lançamento

Step 5: Identidade
  - Nome artístico (pré-preenchido do email)
  - Cidade (opcional)

Step 6: Confirmação + criar projeto automático
  - Resumo visual
  - Botão "Começar" → cria projeto + salva perfil → redireciona para /projects/:id
```

## Comportamento detalhado do Step 6 (confirmação)

- Projeto criado automaticamente com:
  - `name`: baseado no tipo ("Meu Single", "Meu EP", "Meu Álbum")
  - `artist`: nome artístico informado
  - `stage`: mapeado do momento escolhido
  - `projectType`: tipo escolhido
- Profile atualizado com: `display_name`, `city`, `track_view_mode`, `current_moment`, `main_pain`, `onboarding_version: 2`, `onboarding_completed: true`
- Redirect: `/projects/:newProjectId`
- Fallback se projeto falhar: redirect para `/dashboard`

## Critérios de aceite

1. Novo usuário vê 6 steps claros com progress bar
2. Momento, tipo, modo e dor são selecionáveis via cards (sem inputs de texto desnecessários)
3. Projeto é criado automaticamente ao confirmar
4. Perfil salva todos os campos novos
5. Redirect pós-onboarding vai para o projeto criado
6. Usuários existentes (onboarding v1) não são impactados
7. Build compila sem erros TypeScript

