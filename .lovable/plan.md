## Visão geral

Unificar **Editais** e **Palcos** num único módulo chamado **Carreira** (`/carreira`), com filtro lateral por tipo de oportunidade, busca IA única que mistura fomento e palcos, e remoção das rotas legadas `/editais` e `/palcos`.

A arquitetura interna já favorece a fusão: ambos os módulos hoje compartilham `useEditalApplications`, `ApplicationChecklist` e `EditalResultModal` para rastrear inscrições. A diferença real está apenas no **tipo de oportunidade** (fomento financeiro × apresentação ao vivo) e nos templates de checklist.

## Estrutura da nova página `/carreira`

```text
┌──────────────────────────────────────────────────────────┐
│  Carreira                              [+ Nova busca IA] │
├────────────┬─────────────────────────────────────────────┤
│ FILTROS    │  [Buscar por nome, órgão, cidade…]          │
│            │                                             │
│ Tipo       │  ┌─ Card (badge: Edital · Fomento) ──────┐  │
│ ☐ Todos    │  │ Lei Aldir Blanc - SP   R$ 50k · 30d  │  │
│ ☐ Editais  │  └──────────────────────────────────────┘  │
│ ☐ Palcos   │  ┌─ Card (badge: Palco · Festival) ─────┐  │
│            │  │ Festival MIMO 2026     RJ · 60d      │  │
│ Status     │  └──────────────────────────────────────┘  │
│ ☐ Aberto   │                                             │
│ ☐ Inscrito │                                             │
│ ☐ Salvo    │                                             │
│            │                                             │
│ Estado     │                                             │
│ Categoria  │                                             │
│ Valor      │                                             │
└────────────┴─────────────────────────────────────────────┘
```

- Lista única ordenada por relevância/prazo, com **badge de tipo** em cada card (cor diferente para Edital vs Palco).
- Filtros laterais persistem em querystring (`?tipo=edital&status=aberto`).
- Painel **"Minhas inscrições"** acessível por aba secundária no topo (compartilha tudo via `useEditalApplications`).

## Busca IA unificada

Nova edge function **`oportunidades-search`** que:
1. Recebe a query em linguagem natural do usuário.
2. Usa Lovable AI (`google/gemini-3-flash-preview`) com structured output para classificar a intenção em `["edital", "palco", "ambos"]` + extrair filtros (estado, categoria, prazo).
3. Dispara em paralelo as buscas internas existentes (`edital-search` e/ou `palco-search`) conforme a classificação.
4. Mescla, normaliza num shape comum `{ tipo, titulo, orgao, prazo, valor, link, categoria, estado }` e devolve ranqueado.

As edge functions `edital-search` e `palco-search` continuam existindo internamente — só ganham um wrapper.

## Modelo de dados

Nada de novo no banco. As tabelas `editais`, `palcos_curados` e `edital_applications` permanecem como estão. A unificação é puramente de UI + roteamento.

## Migração de rotas

- Nova rota: `/carreira` (substitui ambas).
- `/editais` e `/palcos` removidos do `App.tsx`, do menu `AppLayout` e da bottom-nav mobile.
- Adicionar **um único redirect React Router** de `/editais` e `/palcos` → `/carreira?tipo=...` para evitar quebrar links externos durante a transição (1 linha cada, sem custo).
- Atualizar `EditalProgressCard`, `EditalMetricsDashboard` e `Tutorial.tsx` para apontar para `/carreira`.

## Detalhes técnicos

- **Páginas afetadas:**
  - Criar `src/pages/Carreira.tsx` (layout com filtro lateral + lista).
  - Refatorar conteúdo útil de `Editais.tsx` e `Palcos.tsx` em componentes reutilizáveis em `src/components/carreira/`:
    - `OpportunityCard.tsx` (renderiza tanto edital quanto palco via prop `tipo`)
    - `OpportunityFilters.tsx` (filtro lateral)
    - `MyApplicationsTab.tsx` (consolida inscrições)
    - `AISearchPanel.tsx` (busca IA unificada)
  - Manter `EditalInscricao.tsx` (página de inscrição detalhada) — só renomear menus.
  - Deletar `src/pages/Editais.tsx` e `src/pages/Palcos.tsx` após extrair os componentes.

- **Hooks:**
  - Criar `useOportunidades()` que internamente chama `useEditais()` e `usePalcos()` e mescla o resultado tipado.
  - Manter `useEditais` e `usePalcos` como hooks especializados (chamados pelo novo hook agregador).

- **Edge function nova:** `supabase/functions/oportunidades-search/index.ts` (orquestra `edital-search` + `palco-search` via classificação IA).

- **Navegação:**
  - `AppLayout.tsx`: substituir os dois itens (`/editais` e `/palcos`) por um único item **"Carreira"** com ícone `Trophy` ou `Sparkles`.
  - Atualizar bottom-nav mobile e prefetch dinâmico.

- **i18n:** adicionar chaves `nav.carreira`, `carreira.tipo.edital`, `carreira.tipo.palco`, etc. em `LanguageContext`.

- **Memória do projeto:** adicionar nota em `mem://navegacao/estrutura-e-onboarding` sobre o módulo unificado e a remoção das rotas antigas.

## Ordem de implementação sugerida

1. Criar componentes compartilhados em `src/components/carreira/` extraindo o que já é reutilizável.
2. Criar `Carreira.tsx` consumindo o novo `useOportunidades`.
3. Criar edge function `oportunidades-search` e plugá-la no `AISearchPanel`.
4. Atualizar `App.tsx`, `AppLayout.tsx` e referências em outros componentes.
5. Remover `Editais.tsx` e `Palcos.tsx` (após confirmar paridade funcional).
6. Atualizar Tutorial e i18n.

## Fora do escopo

- Mudanças no schema de banco (não são necessárias).
- Refatoração da página `EditalInscricao` (formulário de inscrição segue intacto).
- Mudanças no `EditalAIAssistant` (continua sendo invocado pela página de inscrição detalhada).