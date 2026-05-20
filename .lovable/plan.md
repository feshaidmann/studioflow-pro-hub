# Métricas de impacto na landing `/`

Adicionar uma seção com 4 KPIs públicos (artistas ativos, editais abertos, projetos publicados, profissionais cadastrados) entre o `WelcomeHero` e o `WelcomeProductPreview`, alimentada por uma Edge Function pública com cache de 1h.

## 1. Edge Function `public-stats`

Arquivo: `supabase/functions/public-stats/index.ts`

- `verify_jwt = false` em `supabase/config.toml` (bloco específico da função; não tocar em `project_id`).
- CORS padrão (`npm:@supabase/supabase-js@2/cors`), handler `OPTIONS`.
- Client com `SUPABASE_SERVICE_ROLE_KEY` (leitura agregada bypassa RLS sem expor dados).
- 4 queries paralelas com `Promise.allSettled` (`head: true, count: 'exact'`):
  - `artistsActive`: `projects` distintos por `user_id` nos últimos 90 dias. Como Supabase JS não tem `countDistinct`, usar `select('user_id').gte('created_at', since)` e contar `new Set()` no edge.
  - `editaisAtivos`: `editais` com `status='Aberto'` e `prazo > now()`.
  - `projectsPublished`: `projects` com `completed = true`.
  - `professionalsAvailable`: `profiles` com `allow_global_listing = true` (a tabela `professionals` legada não tem essa flag; `profiles` é a fonte correta — confirmar nas próximas etapas lendo o schema antes de codar).
- Em qualquer falha individual → log `console.error` e zero para aquele campo. Nunca lança 5xx.
- Resposta JSON com `generatedAt: new Date().toISOString()`.
- Headers: `Cache-Control: public, max-age=3600, s-maxage=3600` + CORS + `Content-Type: application/json`.

## 2. Componente `ImpactMetrics`

Arquivo: `src/components/welcome/ImpactMetrics.tsx`

- Hook local: ao montar, ler `sessionStorage["sf_impact_stats_v1"]`. Se `generatedAt` < 1h, hidratar sem fetch. Caso contrário `supabase.functions.invoke("public-stats")`, gravar no storage.
- Estados: `loading` (skeleton), `ready` (4 cards), `error` → retorna `null` (graceful fail, não renderiza nada).
- Layout: `grid grid-cols-2 md:grid-cols-4 gap-3`. Cada card reusa o padrão de `WelcomeModules` (`rounded-[var(--radius)] border border-border/50 bg-card/60 backdrop-blur-sm`).
- Ícones lucide: `Music`, `Trophy`, `Rocket`, `Users` em `bg-primary/10 text-primary`.
- Número formatado pt-BR via `Intl.NumberFormat('pt-BR')`. Sem animação de contagem.
- Skeleton usa `@/components/ui/skeleton` (4 blocos do mesmo tamanho do card final).
- Acessibilidade: cada card como `<div role="group" aria-label="...">`, número em `<p>` `text-2xl font-semibold`.

## 3. Integração em `Welcome.tsx`

- Import direto (não lazy — está acima da dobra).
- Inserir entre `<WelcomeHero />` e `<WelcomeProductPreview />`.
- Wrapper com `welcome-fade` e `--delay: 90ms` para alinhar com a cadência existente.

## 4. Verificação

- `supabase--deploy_edge_functions(["public-stats"])` após criar.
- Testar com `supabase--curl_edge_functions` (GET, sem auth header explícito — passar `Authorization: ""` para garantir que não usa o token da sessão de preview).
- Conferir no preview: 4 cards visíveis sem login, segundo reload em < 1h não dispara nova request (network tab).

## Detalhes técnicos

```text
Welcome.tsx
 ├── WelcomeHero
 ├── ImpactMetrics  ◀ novo (eager)
 ├── WelcomeProductPreview
 └── Suspense → WelcomePainPoints / WelcomeModules / WelcomeFinalCTA
```

Cache key: `sf_impact_stats_v1` → `{ data: {...}, cachedAt: number }`. TTL: `Date.now() - cachedAt < 3_600_000`.

## Fora do escopo

- Não alterar hero, modules, pain points, product preview, final CTA.
- Não tocar em `admin-stats` (privada).
- Sem analytics extra — PostHog continua via `initAnalytics`.
