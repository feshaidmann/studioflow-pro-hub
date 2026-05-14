# 02 · Stack tecnológica e arquitetura

## Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend | React + TypeScript + Vite | React 18.3 · Vite 5 |
| Estilização | Tailwind CSS + shadcn/ui + Radix UI | Tailwind 3.4 |
| Roteamento | React Router DOM | 6.30 |
| Estado/cache | TanStack React Query + Context API | RQ 5.83 |
| Formulários | React Hook Form + Zod | RHF 7.61 · Zod 3.25 |
| Backend | Lovable Cloud (Supabase: Postgres + Auth + Edge Functions + Storage) | supabase-js 2.97 |
| Edge Functions | Deno Runtime | — |
| IA | Lovable AI Gateway (Google Gemini / OpenAI GPT-5) | — |
| Gráficos | Recharts | 2.15 |
| Analytics | PostHog | 1.36+ |
| Push | Sonner (toast) + Web Push API + Service Worker | — |
| CSV | papaparse (export `;` + BOM) | 5.x |
| Build/Deploy | Lovable Cloud (CI/CD automático) | — |

## Estrutura de diretórios

```
src/
├── pages/                  # Telas (rotas)
├── components/
│   ├── ui/                 # Primitivos shadcn/ui
│   ├── agenda/             # Cards e formulários de eventos
│   ├── carreira/           # Editais + palcos unificados
│   ├── dashboard/          # Cards do dashboard
│   ├── editais/            # Inscrição assistida e métricas
│   ├── finance/            # Cards e formulário financeiro
│   ├── music-dna/          # Analisador de DNA Musical
│   ├── professionals/      # Rede de profissionais
│   ├── project-hub/        # Abas do detalhe do projeto
│   ├── visual-direction/   # Wizard de Direção Visual
│   └── admin/              # Componentes administrativos
├── contexts/               # Auth, Profile, Project, Language
├── hooks/                  # Hooks customizados
├── constants/              # journeyOrder, brazilStates, genreOptions, transactionCategories…
├── lib/                    # audioAnalysis, genreClassifier, musicDnaLookup, analytics…
├── workers/                # acousticMatch.worker.ts (Web Worker)
├── integrations/
│   ├── supabase/           # client + types (auto-gerados — não editar)
│   └── lovable/            # AI gateway helper
└── data/                   # Mock e dados de demonstração

supabase/
├── functions/              # 30 Edge Functions
├── migrations/             # SQL versionado
└── config.toml             # project_id + overrides por função
```

## Contextos React

| Contexto | Responsabilidade |
|----------|------------------|
| `AuthContext` | Sessão, listeners de auth, `signOut` |
| `ProfileContext` | Perfil, `needsProfileSetup`, `isPro`, guard de onboarding |
| `ProjectContext` | Projeto selecionado, mix tracks, deep-linking via `?id=` |
| `LanguageContext` | Idioma ativo (PT/EN), função `t()` |

## Hooks customizados (resumo)

CRUD/UI: `useTasks`, `useTaskRules`, `useEvents`, `useProfessionals`, `useProfessionalsList`, `useProjectFiles`, `useProjectChat`, `useProjectAlerts`, `useReleaseChecklist`, `useTrackTemplates`, `useNotifications`, `usePushNotifications`, `usePendingInvites`.

Domínio: `useMusicDNA`, `useMusicDnaBenchmarks`, `useMusicDnaLookup`, `useGenreProfiles`, `useGenreMismatchCalibration`, `useNeighborEnrichment`, `useTrackIntelligence`, `useSavedAnalyses`.

Editais/Carreira: `useEditais`, `useEditalAI`, `useEditalApplications`, `useEditalDocuments`, `useFontesEditais`, `useMatchEditais`, `useApplicationDocs`, `useRascunhoEdital`, `usePalcos`.

Plataforma: `useAdminRole`, `useAuth`, `useProfile`, `useGuestProjects`, `useGuestTasks`, `usePageTracking`, `useDailyTaskAutoGen`, `useBetaBanner`.

## Navegação

```
/ (Welcome — público)
├── /auth · /auth/reset-password
├── /onboarding (router que escolhe onboarding cheio ou guest)
├── /u/:username (Perfil público)
├── /invite/:token (Resposta a convite de projeto)
├── /briefing/share/:token (Briefing de Direção Visual público)
├── /legal (Termos + Privacidade)
└── App protegido (auth + perfil completo)
    ├── /dashboard
    ├── /projects · /projects/:id
    ├── /projects/:id/direcao-visual?step=perfil|geracao|revisao
    ├── /finance
    ├── /agenda
    ├── /professionals
    ├── /carreira (editais + palcos unificados)
    │   ├── /editais → /carreira?tipo=edital  (redirect)
    │   └── /palcos  → /carreira?tipo=palco   (redirect)
    ├── /editais/inscricao/:id
    ├── /music-dna
    ├── /perfil
    ├── /settings
    ├── /tutorial
    ├── /upgrade
    ├── /admin
    └── /admin/reference-tracks
```

Rotas legadas (`/master`, `/criativo`, `/track-intelligence/*`) redirecionam silenciosamente para destinos vivos. O catch-all `/*` envia para `/dashboard`.

## Constante `JOURNEY_ORDER`

Centralizada em `src/constants/journeyOrder.ts`. Define a ordem canônica das ferramentas no drawer "Mais" do mobile (Carreira → DNA Musical → Criativo → Profissionais). Reutilizada no `AppLayout` para garantir que novos itens não quebrem a sequência da jornada.

## Performance e remontagem

`AppLayout` usa `key={pathname}` em pontos específicos para forçar remontagem ao trocar de seção principal — isto evita estado preso em rotas de wizard (Direção Visual, Inscrição em edital).
