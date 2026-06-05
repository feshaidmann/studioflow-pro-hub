# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**StudioFlow Pro** is a SaaS music-management platform for independent Brazilian artists. It centralizes creative, administrative, and career operations. The target persona is exclusively the **independent artist** — there are no Producer or Studio account roles; engineers and mixers enter only as invited collaborators on projects.

- **Live URL:** https://app.jamsessionproject.com.br
- **Phase:** Public beta — all users have `isPro = true` unlocked during validation
- **UI:** Light mode only, macOS minimalist aesthetic — no dark mode, no dark-mode variants
- **Locale:** pt-BR for all currency, dates, and CSV exports (semicolon delimiter + UTF-8 BOM)

## Commands

```bash
npm run dev          # Dev server at localhost:8080
npm run build        # Production build → dist/
npm run build:dev    # Development build (includes debug info)
npm run lint         # ESLint check
npm run preview      # Serve the dist/ folder locally

npm test             # Run all tests once (Vitest)
npm run test:watch   # Run tests in watch mode

# Run a single test file
npx vitest run src/hooks/__tests__/useSomeHook.test.ts

# Run tests matching a pattern
npx vitest run --reporter=verbose -t "pattern"

# Coverage report (outputs to coverage/)
npx vitest run --coverage
```

## Architecture

### Provider Tree

`App.tsx` wraps the entire app in this order (outermost first):

```
QueryClientProvider → LanguageProvider → AuthProvider → ProfileProvider
  → ProjectProvider → TooltipProvider → BrowserRouter → RateLimitDialogProvider
```

### React Contexts

| Context | Key exports |
|---------|-------------|
| `AuthContext` | `user`, `loading`, `signOut` |
| `ProfileContext` | `profile`, `needsProfileSetup`, `isPro`, `loading` |
| `ProjectContext` | `selectedProject`, `mixTracks`, deep-link via `?id=` query param |
| `LanguageContext` | `t()` translation function, `language` (pt/en) |

### Routing

All authenticated routes live inside `AppRoutes` → `ProtectedRoute` → `AppLayout`. Public routes (`/`, `/auth`, `/u/:username`, `/invite/:token`, `/briefing/share/:token`, `/legal`) sit outside the guard.

Legacy routes (`/editais`, `/palcos`, `/master`) issue silent `<Navigate>` redirects and must be kept for URL compatibility. The `/carreira` page unifies Editais and Palcos, switching between them via `?tipo=edital|palco`.

`AppLayout` uses `key={pathname}` at specific points to force remounting when switching between wizard-style routes (Visual Direction, Edital application) — this prevents stale state from persisting across navigations.

All pages except `Welcome` and `Auth` are `React.lazy()`-loaded.

### Data Fetching

- **TanStack React Query v5** for all server state: `staleTime: 2 min`, `retry: 1`, `refetchOnWindowFocus: false` (Supabase Realtime handles live updates, so auto-refetch is noise).
- **Supabase client** is a singleton at `src/integrations/supabase/client.ts`.
- **`src/integrations/supabase/types.ts`** is auto-generated from the schema — **never edit it manually**; regenerate via `supabase gen types typescript`.

### Feature Modules

Components are organized by domain under `src/components/<domain>/`. Each page in `src/pages/` maps to a route and composes from its matching component folder. Key domain areas:

- **`project-hub/`** — Tabbed project detail (Overview, Tasks, Team, Finance, Release, Visual Direction, Chat)
- **`carreira/`** — Unified Editais + Palcos UI; uses `?tipo=` query param to switch tabs
- **`music-dna/`** — Timbral analysis interface; drives `src/lib/audioAnalysis.ts` (FFT-based, 52KB) via `acousticMatch.worker.ts` (Web Worker)
- **`visual-direction/`** — Wizard interface; 3 steps (`perfil → geracao → revisao`) in URL as `?step=`
- **`finance/`** — Strictly protected; guest collaborators must never see financial data

### Key Utilities (`src/lib/`)

- `audioAnalysis.ts` — FFT feature extraction (BPM, LUFS, spectral centroid, MFCC, etc.)
- `genreClassifier.ts` — Genre ML classification with per-user calibration
- `analytics.ts` — PostHog wrapper; use this instead of calling PostHog directly
- `chunkErrorHandler.ts` — Handles dynamic import failures (auto-reload on stale deploy)
- `reloadGuard.ts` — Prevents infinite hard-refresh loops
- `editaisLinkGuard.ts` — URL validation for external edital links

### Supabase Edge Functions

41 Deno-runtime functions under `supabase/functions/`. Each shares `_shared/cors.ts`. Key functions:

- `music-dna-analyze` — AI audio analysis
- `edital-ai-assistant` — Career opportunity AI (actions: `generate_memorial`, `adapt_language`, `review_budget`, `generate_checklist`, `suggest_project_fit`)
- `generate-visual-direction` — Produces 6 image variations via Gemini Image Preview, uploads to `creative-assets` bucket
- `oportunidades-search` — Searches and ranks opportunities

AI calls go through the **Lovable AI Gateway** with `LOVABLE_API_KEY`. Models in use: `google/gemini-2.5-flash` (short chats, task gen), `google/gemini-2.5-pro` (complex analysis), `google/gemini-3-flash-preview` (contextual assistants), `google/gemini-3.1-flash-image-preview` (image gen).

Fair-use quotas: **20 calls/day, 80/week** per user per function, tracked in `ai_usage`. Exceeding the limit returns `rate_limit`, which the frontend handles via `RateLimitDialog` (see `src/hooks/useRateLimitDialog.tsx`).

### Database (PostgreSQL via Supabase)

All tables have RLS enabled. Core tables to know:

- `profiles` — Artist profile; `id` mirrors `auth.users.id`; `needsProfileSetup` triggers onboarding redirect
- `projects` — 6-stage workflow (`briefing → pre-producao → gravacao → mix → master → lancado`)
- `tasks` — Manual and auto-generated; soft-deleted via `dismissed`; unique partial index on `(user_id, source_key) WHERE source_key != ''`
- `transactions` — Only `status = 'paid'` transactions count toward financial totals
- `editais` / `palcos_curados` — Career opportunities with `link_status` validation
- `ai_usage` — Rate-limit counters; checked before every AI invocation
- `music_dna_benchmarks` — A **view** over `music_reference_tracks`; queried via RPC `get_benchmark_for_genre(genero)` with fallback to `genre_parent`

`public/data/reference_projection.json` (v2) feeds the `TimbralMap` component. Regenerate with `scripts/build_reference_projection.py` (UMAP 2D) whenever `music_reference_tracks` changes significantly.

### i18n

All user-facing strings go through `t()` from `LanguageContext`. Keys live in the context file itself. When adding new text, add both `pt` and `en` keys. Do not hardcode Portuguese strings in JSX.

### AI Response Rendering

Always use the `AIMarkdownContent` component to render model-produced markdown — it ensures consistent typography, source spoilers, and code block handling.

## Permanent Constraints

- The `/studio` route **must not be re-added** — Master Analyzer lives as a modal inside the project "Upload" stage.
- Automatic email/WhatsApp invites are **disabled in MVP** — only manual copy/paste link flow.
- Do **not** delegate NS to HostGator (documented infrastructure constraint).
- CSV exports must use **semicolon delimiter + UTF-8 BOM** for Excel pt-BR compatibility.
- `JOURNEY_ORDER` in `src/constants/journeyOrder.ts` is the canonical order of tools in the mobile drawer — preserve it when adding new navigation items.

## Testing

Tests live in `src/**/__tests__/` and `src/test/`. Setup file: `src/test/setup.ts` (includes `matchMedia` polyfill and `@testing-library/jest-dom`). Coverage is measured on `src/lib`, `src/hooks`, `src/contexts`, and `src/components` (excluding `src/components/ui/`). Minimum threshold: 20% lines and functions.
