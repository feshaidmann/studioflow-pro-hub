## Objetivo

Padronizar como os 4 cards lazy-loaded do Dashboard (`EditalProgressCard`, `UpcomingReleases`, `RecentTransactions`, `GuestProjectsList`) se comportam enquanto carregam, quando falham ao baixar o chunk, e quando o componente lança erro em runtime — com retry e mensagens amigáveis em pt-BR.

## Problema atual

- O `Suspense` usa um `CardSkeleton` genérico (apenas um retângulo cinza), igual em todos os cards — não comunica o que está carregando.
- Não há `ErrorBoundary`. Se o `import()` falhar (rede instável, deploy novo invalidando o chunk) ou o componente lançar, o Dashboard inteiro quebra ou mostra tela em branco.
- Sem retry: o usuário precisa recarregar a página inteira.

## Solução

### 1. Novo componente `LazyCardBoundary` (wrapper único)

`src/components/dashboard/LazyCardBoundary.tsx` — combina `ErrorBoundary` + `Suspense` + skeleton tipado + UI de erro com retry. Substitui o uso direto de `<Suspense>` no Dashboard.

Props:
- `title: string` — rótulo amigável ("Próximos lançamentos", "Editais", etc.) usado no skeleton e na mensagem de erro.
- `icon?: LucideIcon` — opcional, mostrado no skeleton e no erro.
- `minHeight?: string` — para evitar layout shift (ex.: `"8rem"`).
- `children` — o componente lazy.

Comportamento:
- **Loading**: skeleton no formato de Card real (header com ícone + título + linhas de conteúdo), `role="status"`, `aria-busy="true"`, `aria-label="Carregando {title}"`.
- **Erro**: Card com ícone `AlertCircle`, título "Não foi possível carregar {title}", descrição curta ("Verifique sua conexão e tente novamente."), botão **Tentar novamente** que reseta o boundary e força nova tentativa do `import()`.
- **Retry inteligente**: usa `key` interno incrementado no clique para remontar o `Suspense`; se for erro de chunk (`ChunkLoadError` / mensagem com "Failed to fetch dynamically imported module"), oferece também botão **Recarregar página** como fallback.
- Loga o erro no console com prefixo `[LazyCardBoundary:{title}]`.

### 2. `ErrorBoundary` interno

Implementado no mesmo arquivo como class component (React não tem hook nativo para isso). Reseta via `key` controlado pelo wrapper — não precisa de `react-error-boundary` (evita nova dependência).

### 3. `CardSkeleton` tipado

Substitui o `CardSkeleton` atual de `Dashboard.tsx`. Renderiza estrutura de Card (header com ícone+título placeholder usando o `title` real, 3 linhas de Skeleton no body), mantendo paridade visual com o card final.

### 4. Atualização de `Dashboard.tsx`

Trocar os 4 blocos `<Suspense fallback={<CardSkeleton />}>` por:

```tsx
<LazyCardBoundary title="Editais" icon={FileText} minHeight="8rem">
  <EditalProgressCard hidden={isFirstRun} />
</LazyCardBoundary>
```

Aplicado a:
- `editais` → "Editais e Oportunidades", ícone `FileText`
- `releases` → "Próximos lançamentos", ícone `Calendar`
- `transactions` → "Transações recentes", ícone `Receipt`
- `guestProjects` (em outras seções do Dashboard, se houver `<Suspense>`) → "Projetos como parceiro", ícone `Users`

Remover o `CardSkeleton` antigo do topo de `Dashboard.tsx`.

### 5. Mensagens em pt-BR

- Loading sr-only: `"Carregando {title}…"`
- Erro título: `"Não foi possível carregar {title}"`
- Erro descrição (genérico): `"Algo deu errado ao buscar esta seção. Tente novamente."`
- Erro descrição (chunk): `"Não conseguimos baixar esta parte do app. Verifique sua conexão."`
- Botões: `"Tentar novamente"` / `"Recarregar página"`

## Fora de escopo

- Cards não-lazy (`DailyChecklist`, `ProjectAlertsCard`, etc.) — eles já têm seus próprios estados de loading.
- Retry de chamadas de dados dentro dos componentes (responsabilidade dos hooks).
- Telemetria/analytics dos erros — apenas console.log.
- Tradução EN (sistema bilíngue): chaves podem ser adicionadas depois; agora usa strings pt-BR diretas para manter consistência com o resto do Dashboard.

## Arquivos

- **Criar**: `src/components/dashboard/LazyCardBoundary.tsx`
- **Editar**: `src/pages/Dashboard.tsx` (remover `CardSkeleton` local, trocar 4 `<Suspense>` por `<LazyCardBoundary>`, importar ícones lucide adicionais se necessário)
