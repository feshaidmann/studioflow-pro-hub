---
name: Admin de Curadoria de Carreira
description: Tela /admin/carreira para administradores gerenciarem editais, palcos e análises descobertas (corpus). Permite revalidar links, editar, apagar em lote e revisar/descartar descobertos.
type: feature
---
Rota `/admin/carreira` (lazy, protegida por `useAdminRole`). 3 abas:

1. **Editais** — lista todos via policy admin "Admins can view all editais"; ações: editar (sheet), revalidar link, apagar, em lote.
2. **Palcos** — idem para `palcos_curados` (policy `palcos_curados_admin_write` já existia).
3. **Descobertos** — lista `edital_analyses_corpus` por `created_at`; ações: marcar revisado (`reviewed_at`), descartar (`dismissed_at`), ver detalhes em sheet.

**Edge function `check-opportunity-links`** ganhou modo single-item: POST `{ id, table }` autenticado por usuário com role `admin`. CORS liberado (`*`) por causa do uso interativo. Cron continua usando `verify_cron_token`.

**Limitação atual:** `editais` são per-usuário (cada user tem cópias geradas pelo `oportunidades-search`), então edição/promoção de descoberto NÃO cria entrada global — fica deferido até consolidarmos um catálogo compartilhado. Apagar via admin remove de TODOS os usuários (intencional, para sanear links quebrados).

KPIs no topo: Total / OK / Broken / Unknown / Sem link. Filtros: busca por título + status.
