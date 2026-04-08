

# Diagnóstico do Módulo de Checklist — Inconsistências Encontradas

## Resumo Executivo

O módulo de checklist tem um **bug crítico de duplicação massiva** na base de dados: 309 tarefas auto-geradas para apenas 43 chaves únicas. Um `source_key` tem **57 cópias idênticas**. Além disso, há falhas lógicas na deduplicação e inconsistências entre os 3 pontos de geração de tarefas.

---

## Problemas Identificados

### 1. CRÍTICO — Deduplicação quebrada (3 pontos de falha)

Existem **3 locais independentes** que geram tarefas automáticas, cada um com uma lógica de deduplicação diferente e incompatível:

| Local | Deduplicação | Problema |
|---|---|---|
| **Edge function** `generate-daily-tasks` | `.maybeSingle()` — busca por `source_key` sem filtrar `dismissed` | Recria tarefas dismissed; `.maybeSingle()` falha silenciosamente se há múltiplos matches |
| **Dashboard** `insertIfNew()` (client-side) | `.select("id").eq("source_key", key)` sem filtrar por status | Query via RLS pode retornar a mesma key, mas **não filtra `dismissed`** — tasks dismissed são "invisíveis" ao fetch mas "visíveis" ao insert check |
| **`useTasks.ensureAutoTask()`** hook | `.eq("auto_generated", true)` mas **não inclui `source_key`** no insert! | O `source_key` nunca é setado no insert dentro de `ensureAutoTask`, então a deduplicação por `source_key` não funciona |

**Causa raiz da duplicação:** A edge function `generate-daily-tasks` é chamada a cada abertura do Dashboard (via `useEffect` no mount), e a deduplicação usa `.maybeSingle()` que retorna erro quando há múltiplos registros existentes — fazendo com que o `existing` seja null e uma nova cópia seja inserida. Isso cria um loop de duplicação exponencial.

### 2. ALTO — Edge function chamada no client sem rate-limiting

O Dashboard chama `generate-daily-tasks` a cada sessão (linha 372-391), que por sua vez processa **todos os usuários do sistema** (`profiles.select("id")`). Isso é:
- Ineficiente: um único usuário dispara processamento para todos
- Sem throttle: abrir 5 abas = 5 execuções
- Custoso: cada execução faz dezenas de queries por usuário

### 3. MÉDIO — `ensureAutoTask` não seta `source_key`

O hook `ensureAutoTask` (linha 120-130 de `useTasks.ts`) recebe um `key` para deduplicação, mas o `insert` não inclui `source_key` no payload. Resultado: tarefas inseridas por este método ficam com `source_key = ''`, quebrando a deduplicação futura.

### 4. MÉDIO — Regras de configuração (`useTaskRules`) ignoradas

O usuário pode configurar regras (ex: inatividade = 14 dias, orçamento = 90%), mas:
- A edge function usa **valores hardcoded** (7 dias, 80%) e nunca consulta `task_rules`
- O Dashboard client-side também usa valores fixos
- A tabela `task_rules` existe mas é efetivamente decorativa

### 5. BAIXO — `fetchTasks` filtra `dismissed=false` mas `toggleTask` não

Quando o usuário marca como concluída e depois desmarca (toggle), a task permanece `dismissed=false`. Mas se ele deletou (soft-delete) e depois toggle é chamado no array local, pode desfazer o dismiss por acidente.

### 6. BAIXO — First-run checklist usa `localStorage`

O onboarding checklist (linhas 87-218 do Dashboard) persiste estado via `localStorage`, não via banco. Trocar de dispositivo reseta o progresso.

---

## Plano de Correção

### Passo 1 — Limpar duplicatas existentes (migration SQL)
- Criar migration para deletar todas as cópias duplicadas, mantendo apenas 1 por `(user_id, source_key)`
- Adicionar **unique constraint** na tabela `tasks` para `(user_id, source_key)` onde `source_key != ''`

### Passo 2 — Corrigir deduplicação na edge function
- Usar `upsert` com `ON CONFLICT (user_id, source_key) DO NOTHING` em vez de select-then-insert
- Mudar para processar **apenas o usuário autenticado** (extrair `user_id` do JWT) em vez de todos os perfis
- Respeitar os parâmetros de `task_rules` do usuário

### Passo 3 — Corrigir deduplicação client-side (Dashboard)
- Remover o `insertIfNew` inline e usar `ensureAutoTask` do hook (DRY)
- Corrigir `ensureAutoTask` para incluir `source_key` no payload do insert
- Usar `upsert` com `onConflict` em vez de select-then-insert

### Passo 4 — Rate-limit a edge function
- Adicionar throttle client-side: só chamar `generate-daily-tasks` se último refresh > 1 hora (persistido em `localStorage`)
- Na edge function, aceitar `user_id` como parâmetro e processar apenas esse usuário

### Passo 5 — Integrar `task_rules`
- Na edge function, carregar `task_rules` do usuário antes de rodar as regras
- Substituir valores hardcoded pelos parâmetros configurados

### Passo 6 — Traduções pendentes
- Substituir strings hardcoded no checklist (labels de source, "Nenhuma tarefa pendente", "Checklist do Dia", etc.) por `t()`.

---

## Dados de Evidência

| Métrica | Valor |
|---|---|
| Total de tarefas auto-geradas | 309 |
| Chaves únicas (`source_key`) | 43 |
| Pior caso de duplicação | 57 cópias para 1 key |
| Fator médio de duplicação | ~7.2x |

