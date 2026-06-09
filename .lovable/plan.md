
# Redesenho UX do módulo Carreira

Foco: reduzir ruído visual, separar fluxos diferentes (Editais vs Palcos), tornar "Descobrir vs Acompanhar" inequívoco e permitir excluir candidaturas.

## Diagnóstico

Hoje a página `/carreira` carrega num só plano:
- 2 abas (Descobrir / Minhas Inscrições)
- Chips de tipo (Todas/Editais/Palcos) + Sheet de filtros avançados (status, UF, gênero, prazo) + chips de filtros ativos + busca textual + busca por IA + recomendações
- Cards com 3 ações concorrentes (Interesse, Salvar, Detalhes)
- Editais (fluxo "inscrição com análise IA") e Palcos (fluxo "proposta/EPK") aparecem misturados, mas têm linguagem, prazos e CTAs diferentes
- Em "Minhas Inscrições" não há como **excluir** uma candidatura criada por engano

## Nova arquitetura de informação

```text
/carreira
├── Header (Trophy "Carreira") + ação "Documentos"
│
├── 🔮 BUSCA IA (hero, sempre visível, colapsável após 1ª busca)
│      [ Descreva sua busca… ]  [Buscar com IA]
│      └─ exibe resumo + injeta resultados na lista abaixo
│
├── Tabs primárias  ──── Explorar  |  Minhas candidaturas (N)
│
└── ── Explorar ─────────────────────────────────────────────
    ├── Sub-tabs: Editais de fomento  |  Palcos & festivais
    │     (cada sub-tab traz só os filtros que fazem sentido
    │      para aquele tipo — palcos não tem "valor", editais
    │      não tem "gênero")
    │
    ├── Barra única compacta:  [busca]  [UF ▾]  [Prazo ▾]  [⚙ Mais]
    │     · chips de filtros ativos abaixo só se houver algum
    │
    ├── ⭐ Recomendados para você (carrossel horizontal, 3-5 itens)
    │
    └── Lista de cards (densidade reduzida — ver abaixo)

└── ── Minhas candidaturas ───────────────────────────────────
    ├── 3 colunas/segmento: Em preparação · Inscrita · Resultado
    ├── Cada card: título, organizador, prazo, status menu, …
    └── Menu "⋯" por card: Abrir · Mudar status · **Excluir** (confirmação)
```

## Mudanças por componente

### Página `src/pages/Carreira.tsx`
- Hero de busca IA passa a ser o primeiro bloco (acima das tabs); recolhe-se a 1 linha após primeira busca, com botão "Nova busca IA".
- Tabs primárias: `Explorar` / `Minhas candidaturas` (badge com contagem).
- Em Explorar, **sub-tabs** `Editais` / `Palcos` substituem os chips "Todas/Editais/Palcos". Remove a opção "Todas" — usuário escolhe um tipo (cada um tem fluxo próprio).
- `RecommendedSection` aparece só na sub-tab ativa, filtrado pelo tipo.
- Filtros: barra compacta com busca + 2 selects principais (UF, Prazo); resto migra para Sheet "Mais filtros" disparado por ícone (já existe `AdvancedFiltersSheet`).
- Remove `ActiveFiltersChips` quando não houver filtros ativos (hoje já some, mas reduzir verbosidade do header).

### `src/components/carreira/OpportunityCard.tsx` (refino)
- Reduzir a 1 CTA primário ("Tenho interesse" → leva direto ao fluxo de inscrição/proposta) + menu "⋯" com "Salvar", "Abrir link", "Ver detalhes".
- Badge único de status (Aberto / Encerra em Xd / Encerrado) — remover badges duplicados de tipo (já implícito pela sub-tab).
- Layout em 2 linhas: título + organizador / prazo + UF.

### `src/components/carreira/ApplicationsList` (atual lista em Minhas Inscrições)
- Adicionar agrupamento por **estágio** (Em preparação | Inscrita | Resultado).
- Adicionar menu "⋯" no card com ação **Excluir candidatura** (já existe `useDeleteApplication` em `useEditalApplications`, só não está exposto na UI). Confirmação via `AlertDialog`.

### `AISearchPanel`
- Visual de hero (gradiente sutil, ícone Sparkles, placeholder mais inspirador).
- Estado pós-busca compacto: 1 linha com "🔮 N resultados para '…'  · Limpar".

### Sub-tabs específicos
- Editais: filtros relevantes = UF, prazo, valor, modalidade.
- Palcos: filtros relevantes = UF, gênero, capacidade.
- (Reaproveita `AdvancedFiltersSheet`, apenas oculta campos não-aplicáveis por tipo.)

## Banco de dados
Nenhuma migração necessária. `useDeleteApplication` já existe e a policy de `edital_applications` já permite delete pelo dono.

## URLs / deep-links
Mantém compatibilidade:
- `?tab=inscricoes` continua válido
- `?tipo=edital|palco` agora controla **sub-tab** dentro de Explorar
- `?op=tipo:key` continua abrindo o sheet de detalhe
- Rotas legadas (`/editais`, `/palcos`) continuam redirecionando

## Detalhes técnicos

Arquivos a editar:
- `src/pages/Carreira.tsx` — reestruturação do JSX e estado de sub-tab
- `src/components/carreira/OpportunityCard.tsx` — densidade + menu de ações
- `src/components/carreira/AISearchPanel.tsx` — modo hero/compacto
- `src/components/carreira/AdvancedFiltersSheet.tsx` — prop `tipo` para ocultar campos
- `src/components/carreira/OpportunityFilters.tsx` — slim down (barra única)
- Novo `src/components/carreira/ApplicationsBoard.tsx` — agrupamento por estágio + menu excluir
- `src/contexts/LanguageContext.tsx` — chaves pt/en novas

Sem mudanças em hooks/data; reaproveita `useEditais`, `usePalcos`, `useEditalApplications` (createApp, updateApp, **deleteApp**).

## Resultado esperado
- 1 hero (IA) + 2 tabs + 2 sub-tabs = hierarquia clara
- Cards 30-40% mais leves, 1 CTA por card
- Pipeline em "Minhas candidaturas" com agrupamento e exclusão
- Editais e Palcos visualmente separados, com filtros pertinentes a cada um
