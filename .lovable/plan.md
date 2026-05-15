## Objetivo

Refatorar a landing pública (`src/pages/Welcome.tsx`, 513 linhas em arquivo único) atacando os 4 eixos pedidos: visual/design, conteúdo/copy, performance/código e mobile-first. Sem alterar lógica de auth/redirect.

## Diagnóstico atual

- **Tudo num arquivo só**: 513 linhas, 6 seções, 3 grandes constantes (`MOCK_PROJECT`, `PAIN_POINTS`, `MODULES`) e 2 blocos de SVG do Google duplicados.
- **Visual**: animações por `style={{ animationDelay }}` espalhadas, cores cruas (`text-emerald-600`, `text-amber-600`, `bg-amber-500/15`) que violam a regra de tokens semânticos do projeto (light mode macOS, neutro `220 14% 96%`, radius `0.875rem`).
- **Copy**: hero com quebra de linha forçada via `<br>`, "8 módulos" hard-coded, badge "Feito para o artista independente brasileiro" repete a credencial do rodapé, beta notice ao final repete "artistas do mercado independente brasileiro".
- **Mobile (434px)**: hero `text-[2.15rem]` ocupa muito; mock card com `grid sm:grid-cols-2` empilha bem mas tem padding apertado; CTA duplicado (topo + final) sem ancoragem; rodapé com 4 blocos sequenciais cria scroll longo.
- **Performance**: nenhum `lazy`, dois SVGs do Google inline, sem `loading="lazy"`, sem `aria-label` em vários botões, falta `<title>`/SEO meta (single H1 ok).

## Estrutura proposta

Quebrar em componentes pequenos sob `src/components/welcome/`:

```text
src/pages/Welcome.tsx           (~80 linhas — só auth guard + composição)
src/components/welcome/
  WelcomeHero.tsx               (badge, h1, sub, CTAs primários)
  WelcomeProductPreview.tsx     (mock "Noite Clara")
  WelcomePainPoints.tsx         (4 dores → soluções)
  WelcomeModules.tsx            (grid de módulos)
  WelcomeFinalCTA.tsx           (CTA final + credenciais + beta + legais)
  GoogleIcon.tsx                (SVG reutilizável — remove duplicação)
  welcome.data.ts               (MOCK_PROJECT, PAIN_POINTS, MODULES)
```

## Mudanças de design (light mode macOS, tokens semânticos)

- Substituir cores cruas por tokens: criar `--success`, `--warning`, `--info` em `index.css` (HSL) e usar `text-success`, `bg-warning/10` etc. Mapear:
  - `emerald-*` → `success`
  - `amber-*` → `warning`
  - `violet/blue/sky/rose/orange-*` dos módulos → manter via paleta categórica nova `--cat-1..6` em tokens, OU simplificar para mono-accent (primary + muted) — proposta: **mono-accent** para coerência macOS.
- Reduzir hero: `text-[2rem] md:text-5xl`, remover `<br>` e deixar a quebra fluir natural.
- Unificar animações em uma classe utilitária `.welcome-fade` com `animation-delay` via CSS variable (`style={{ '--delay': '60ms' }}`) — remove os 8 inlines.
- Mock card: usar `rounded-[0.875rem]` (token padrão) em vez de `rounded-2xl`.
- Remover gradient roxo do background (`263 60% 40%`) — não condiz com macOS minimal; manter só radial sutil em `--primary`.

## Mudanças de copy

- Hero: "Sua música merece mais que WhatsApp e planilha" (sem `<br>`, mais curto).
- Sub-hero: encurtar para 1 frase ("Gestão de lançamento, financeiro, equipe e editais — num só app, feito para artista independente.").
- Remover badge topo redundante; deixar a credencial só no rodapé.
- "8 módulos" → derivar do array (`MODULES.length`).
- Beta notice + credencial: fundir em uma única linha discreta no rodapé.

## Mobile-first (434px)

- CTAs full-width já ok; aumentar `tap target` mínimo para `h-12` no Google.
- Mock card: padding `p-3.5` → `p-3` no mobile, fontes do checklist `text-[11px]` → manter mas com `leading-tight`.
- Rodapé: agrupar credencial + beta + legais em 1 bloco compacto (3 linhas → 2).
- Hero: reduzir `pt-12` → `pt-8` no mobile.

## Performance

- Extrair `GoogleIcon` (remove ~10 linhas duplicadas e ~600 bytes de SVG repetido).
- `React.lazy` para `WelcomePainPoints`, `WelcomeModules`, `WelcomeFinalCTA` (abaixo do fold) com `<Suspense fallback={null}>`.
- Memoizar `MOCK_PROJECT` cálculos (`spentPct`, `doneTasks`) em `useMemo`.
- Adicionar `<title>` e `<meta name="description">` via tag direta (projeto não usa Helmet) ou simples `useEffect` de document.title.

## Fora de escopo

- Não tocar `Auth.tsx`, `AuthContext`, `ProfileContext`, redirects.
- Não alterar i18n: todas strings continuam em pt-BR hard-coded como já estão (poucas chaves `t()` usadas).
- Não mexer em Dashboard.

## Validação

- Build automático.
- Verificar viewport 434px no preview e checar que CTA primário aparece sem scroll.
- Conferir que tokens novos não quebram outras telas (busca por `text-emerald-`, `text-amber-` no projeto antes de remover — mantê-los se usados em outros lugares, só adicionar tokens novos).
