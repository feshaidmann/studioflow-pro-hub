## Objetivo

1. Apagar do banco as oportunidades atualmente quebradas ou sem link.
2. Entregar uma tela `/admin/carreira` que permita curadoria completa de editais e palcos sem precisar de SQL.

## Parte 1 — Limpeza pontual (migration)

Deletar:
- **Editais:** 2 com `link_status='broken'` + 7 com `link_status='unknown'` e `link` vazio (total 9 linhas).
- **Palcos:** 1 com `link_status='broken'` (e qualquer outro futuro com link vazio).

Cascade já remove `edital_applications` e `alertas_editais` relacionados (FKs com ON DELETE CASCADE).

## Parte 2 — `/admin/carreira` (tela completa)

Rota nova, protegida por `useAdminRole()` (mesmo padrão de `/admin/reference-tracks`).

### Layout

```text
┌─ Header: "Curadoria de Carreira" + KPIs ────────────────┐
│  Total | OK | Broken | Unknown | Sem link               │
├─ Abas: Editais · Palcos · Descobertos (corpus) ─────────┤
│  Filtros: status do link, fonte, busca por título       │
│  Tabela paginada com ações por linha                    │
└─────────────────────────────────────────────────────────┘
```

### Funcionalidades por aba

**Editais / Palcos**
- Tabela: título, link (clicável + status badge colorido), data limite, fonte, última verificação.
- Ações por linha: **Editar** (sheet com todos os campos), **Revalidar link** (invoca `check-opportunity-links` pontualmente), **Abrir externo**, **Deletar** (com `AlertDialog`).
- Ações em lote (checkboxes): **Deletar selecionados**, **Revalidar selecionados**.
- Botão **+ Novo** abre o mesmo sheet de edição em modo criar.

**Descobertos (corpus)**
- Lista análises de `edital_analyses_corpus` que **não** têm `edital_id` (= editais que usuários analisaram mas ainda não estão na base).
- Agrupa por `content_hash` (dedup) e mostra: título informado, resumo, valor, prazo, # de usuários que analisaram.
- Ação: **Promover a edital** → abre sheet pré-preenchido com a análise; ao salvar, cria linha em `editais` e marca corpus como promovido.

### Mudanças técnicas

**Migration:**
- DELETEs descritos acima.
- Coluna `promoted_edital_id uuid REFERENCES editais(id)` em `edital_analyses_corpus` (para marcar promovidos e não aparecerem mais na fila).
- Função RPC `admin_revalidate_link(p_table text, p_id uuid)` ou simplesmente invocar `check-opportunity-links` com payload `{ id, table }` (verificar se a function já aceita; se não, adicionar suporte).

**Edge function `check-opportunity-links`:**
- Adicionar modo "single item" para revalidação manual sob demanda.

**RLS:**
- `editais` e `palcos_curados` já têm policies de admin? Verificar e, se faltar, adicionar `INSERT/UPDATE/DELETE` para `has_role(auth.uid(),'admin')`.
- `edital_analyses_corpus` já é admin-only para SELECT; adicionar UPDATE admin para marcar `promoted_edital_id`.

**Novos arquivos:**
- `src/pages/admin/Carreira.tsx` — orquestra abas, filtros, KPIs.
- `src/components/admin/carreira/OpportunityRow.tsx` — linha da tabela.
- `src/components/admin/carreira/OpportunityEditSheet.tsx` — formulário criar/editar.
- `src/components/admin/carreira/DiscoveredList.tsx` — aba do corpus.
- `src/hooks/useAdminOpportunities.ts` — CRUD + revalidação + mutations.

**Roteamento:**
- Adicionar `/admin/carreira` em `App.tsx` (lazy).
- Link no `Admin.tsx` (hub) ao lado dos demais painéis.

### Não incluído (intencional)

- Importação em massa de CSV — deixar pra depois.
- Edição inline (dupla-célula) — usar sheet por simplicidade.
- Histórico de edições/audit log — `updated_at` já registra.

## Ordem de implementação

1. Migration: deletes + coluna `promoted_edital_id` + policies admin que faltarem.
2. Atualizar `check-opportunity-links` para aceitar item único.
3. Hook `useAdminOpportunities`.
4. Tela `/admin/carreira` com 3 abas, sheet de edição, ações em lote.
5. Atualizar `mem://navegacao/rotas-descontinuadas` e criar memória da curadoria.

## Riscos / pontos de atenção

- DELETE cascata em `editais` apaga inscrições de usuários — os 9 alvos são links quebrados/vazios, então improvável ter inscrição ativa, mas validar com `SELECT count(*) FROM edital_applications WHERE edital_id IN (...)` antes de rodar (incluir no corpo da migration como NOTICE).
- Revalidação manual de link precisa respeitar timeout curto (10s) e tratar redirects 3xx como ok.
