## Objetivo

Painel admin em `/admin/ai-invocations` para monitorar uso e gargalos de IA — com foco em `music-dna-analyze`, mas servindo todas as funções.

## O que o painel mostra

**Filtros no topo:** período (24h / 7d / 30d) e função (select com `music-dna-analyze` pré-selecionado, opção "Todas").

**Cards de resumo (no período):**
- Total de invocações
- Usuários únicos
- Taxa de erro (% status ≠ success)
- Custo total estimado (US$)

**Gráfico de linha — invocações por hora/dia** (Recharts), com séries `success` e `error` empilhadas. Mostra os picos.

**Tabela "Top usuários no período"** (limitada a 20):
`user_id` curto · display_name (join com `profiles`) · total · sucessos · erros · último uso. Ordenada por total desc.

**Tabela "Top funções no período"** (quando filtro = "Todas"):
`function_name` · total · usuários únicos · taxa de erro · custo total. Ordenada por total desc.

**Tabela "Últimos 50 eventos"**: timestamp, função, user_id, model, status, cost_usd. Útil para inspeção pontual.

## Como funciona (técnico)

1. **RPC `get_ai_invocations_metrics(p_hours int, p_function_name text)`** (`SECURITY DEFINER`, gate via `has_role(auth.uid(), 'admin')`), retornando `jsonb` com 4 blocos: `totals`, `series` (buckets por hora se ≤48h, senão por dia), `top_users`, `top_functions`. O join com `profiles` é via `LEFT JOIN profiles ON profiles.id = ai_invocations.user_id` para trazer `display_name`.
2. **Nova página** `src/pages/admin/AIInvocationsMetrics.tsx` reutilizando padrões de `OportunidadesSearchMetrics.tsx` (cards + Recharts + tabelas shadcn).
3. **Rota** `/admin/ai-invocations` em `App.tsx`, protegida pelo guard já existente para rotas `/admin/*`.
4. **Card de atalho** em `src/pages/Admin.tsx` ("IA · Invocações" → `/admin/ai-invocations`).
5. **Últimos 50 eventos**: query direta na tabela (já tem policy admin de SELECT), sem RPC.

Sem mudança de schema na tabela `ai_invocations` (índices em `created_at` e `function_name` já existem).

## Fora de escopo
- Drill-down por usuário individual.
- Reset/manipulação de quotas — só visualização.
- Export CSV (pode vir depois se pedido).
