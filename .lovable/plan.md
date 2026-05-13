
# Plano: 7 correções prioritárias do módulo Carreira

Cobre os 7 itens do diagnóstico anterior, em ordem de execução para minimizar retrabalho.

## 1. Separar palco de edital (corrige bug semântico)

**Problema:** palcos salvos vão para a tabela `editais` e abrem `EditalInscricao` (assistente IA de fomento) — sem sentido para festival/showcase.

**O que fazer (frontend-only, sem migração):**
- Em `Carreira.tsx`, na lista "Minhas inscrições", detectar se o registro veio de palco (via `session_key` que começa sem padrão de edital, ou via `area === "Música" && tipo === "palco"` na tabela). Como `useEditalApplications` faz join com `editais`, expor `tipo` no select.
- Para palcos: o card da inscrição não navega para `/editais/inscricao/:id`. Em vez disso abre o `OpportunityDetailSheet` reutilizando `op.raw`. CTA principal é "Abrir oficial" + status menu.
- Adicionar guarda em `EditalInscricao.tsx`: se `editais.tipo === 'palco'`, mostrar empty-state "Esta oportunidade é um palco/festival — acompanhamento direto do regulamento" + botão voltar.

## 2. Loading visível ao "Marcar interesse" + toast com link

**O que fazer:**
- Passar `pending?: boolean` para `OpportunityCard` e exibir spinner no botão "Candidatar/Marcar interesse" quando `interestPending === op.key`.
- Trocar `setTab("inscricoes")` por `toast.success("Interesse registrado", { action: { label: "Ver pipeline", onClick: () => setTab("inscricoes") } })`. Usuário continua descobrindo.
- Mesmo fluxo no `OpportunityDetailSheet` (botão com loading).

## 3. Deep-link `?op=<key>` reabrindo o sheet

**O que fazer:**
- Em `Carreira.tsx`, ao abrir o sheet salvar `op` no URL: `setSearchParams({...current, op: <key>})`.
- No mount, ler `op` da URL e procurar em `allOpportunities`. Se achar, abrir o sheet automaticamente. Se a lista ainda não carregou, aguardar `loading=false` (efeito separado).
- Ao fechar, remover `op` do URL.

## 4. Seção "Pra você" no topo de Descobrir

**O que fazer:**
- Importar `useMatchEditais` + `usePalcos.matchByPerfil`.
- Resolver projeto ativo: usar `useProjects` (contexto) + perfil cultural do projeto (já presente em `ProjectCulturalProfile`/tabela). Para o MVP da seção: usar `profile` (specialties, city) como proxy se não houver projeto selecionado.
- Renderizar até 6 cards com badge "Pra você" (calculado deterministicamente, **sem IA**) acima da lista filtrada, dentro de um collapsible "Recomendados para o seu perfil". Esconder se filtros estão ativos.
- Adicionar payload `project_id` (ativo) no `AISearchPanel.handleSearch`.

## 5. Cores hardcoded → tokens semânticos

**O que fazer:**
- Em `index.css`, garantir tokens `--success`, `--warning`, `--info` (HSL). Verificar se já existem; senão adicionar.
- Em `OpportunityCard.tsx` e `useEditalApplications.ts` (constantes `APPLICATION_STATUS_COLORS`/`RESULTADO_COLORS`), substituir `bg-green-500/20`, `bg-amber-500/25`, `bg-red-500/25`, etc. por classes utilitárias compostas com tokens (`bg-success/15 text-success-foreground border-success/30`, etc.).

## 6. "Marcar como inscrito" sempre + EditalResultModal

**O que fazer:**
- Em `EditalInscricao.tsx`, exibir o botão "Marcar como inscrito" no header (próximo ao badge de progresso) sempre que `application.status` esteja em `interesse`/`preparando`. Manter o banner verde de 100% como reforço.
- Em `Carreira.tsx`, na lista de inscrições, quando `status === 'inscrito'`, mostrar mais um item no `ApplicationStatusMenu` ou um botão "Registrar resultado" que monta `<EditalResultModal>` (já existe). Após salvar, status vira `resultado` e os campos `resultado/valor_aprovado` ficam visíveis no card.

## 7. Chips de filtros ativos no mobile + esconder toggle irrelevante

**O que fazer:**
- Componente novo `ActiveFiltersChips` que recebe `filters` e `onClear(field)`. Renderiza chips só dos campos ≠ default.
- Renderizar logo abaixo do `MobileStickyHeader` quando `tab === 'descobrir'`.
- Esconder/ocultar `OpportunityFilters` controles que não fazem sentido em "inscricoes" — solução simples: chips só aparecem em descobrir; sheet de filtros no header também só em descobrir.

## Observabilidade

Adicionar `trackAppEvent` em:
- `carreira_recommended_clicked` (clique em "Pra você")
- `carreira_deep_link_opened` (?op=…)
- `carreira_result_recorded`

## Arquivos afetados

- `src/pages/Carreira.tsx` (refator — extrair `useCarreiraFilters`, adicionar `?op=`, "Pra você", chips, integração `EditalResultModal`)
- `src/pages/EditalInscricao.tsx` (guarda palco + botão sempre visível)
- `src/components/carreira/OpportunityCard.tsx` (loading prop + tokens)
- `src/components/carreira/OpportunityDetailSheet.tsx` (loading prop)
- `src/components/carreira/ActiveFiltersChips.tsx` (novo)
- `src/components/carreira/RecommendedSection.tsx` (novo)
- `src/components/carreira/AISearchPanel.tsx` (passar `project_id`)
- `src/hooks/useEditalApplications.ts` (cores → tokens; expor `edital.tipo` no select)
- `src/index.css` (tokens success/warning/info se faltarem)
- (opcional) `src/hooks/useCarreiraFilters.ts` (extração)

## Fora de escopo

- Migração de schema separando palcos da tabela `editais` (descrita no diagnóstico como ideal mas exige plano dedicado e migração de dados — fica para iteração seguinte).
- Notificações de prazo (`useNotifications` push de "X dias para fechar") — vale plano separado para configurar agendamento.
- Export CSV exposto em `/carreira` (trivial mas fora dos 7 priorizados).
