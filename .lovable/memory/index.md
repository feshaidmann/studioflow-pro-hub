# Project Memory

## Core
- **Platform:** StudioFlow. Focus: Independent Artist only (no 'Producer' role).
- **UI & Design:** Light mode ONLY, macOS minimalist. Neutral gray bg (`220 14% 96%`), `0.875rem` rounded corners, glassmorphism. NO dark mode, NO neon/gamer effects.
- **Localization:** Português apenas (pt-BR). Sem suporte a inglês. Currency/numbers: `1.234,56`. CSV: `;` delimiter, UTF-8 BOM.
- **Finance Privacy:** Strictly owner-only. Guests NEVER see financial metrics (enforced via RLS and `SECURITY DEFINER` RPCs).
- **Constraints:** Do NOT re-add `/studio` module. HostGator NS delegation is rejected. Automated email/WhatsApp invites disabled for MVP. Do NOT re-add English/bilingual support.

## Memories
- [Target User Persona](mem://arquitetura/personas-de-usuario) — Focus on Independent Artist, automatic artist registration
- [Agenda Module](mem://funcionalidades/agenda-de-eventos) — Shows, rehearsals, auto-creation of financial receipts for Shows
- [Agenda Conflicts](mem://funcionalidades/agenda-e-deteccao-de-conflitos) — Conflict detection requires explicit confirmation to save
- [AI Usage Limits](mem://funcionalidades/limites-de-uso-da-ia) — Fair-use quotas in 'ai_usage' (20 daily, 80 weekly)
- [JamSession AI Assistant](mem://funcionalidades/assistente-tecnico-jamsession) — Enthusiastic studio mentor persona, strict technical scope
- [Demo Data Generation](mem://funcionalidades/dados-de-demonstracao) — Brazilian localized demo data for artists (violão, sanfona, etc.)
- [Team & Contacts](mem://funcionalidades/gestao-de-equipe-e-parceiros) — Instrumentista specialty vs automatic roles (Producer/Mix/Master)
- [Portuguese Only](mem://funcionalidades/sistema-bilingue-i18n) — Bilingual removed, PT-only via simplified LanguageContext
- [Public Audio API](mem://api/endpoint-publico-analise-audio) — Supabase Edge Function for unauthenticated LUFS/True Peak processing
- [Contacts Privacy](mem://auth/escopo-de-contatos-profissionais-e-privacidade) — Scoped by user_id via RLS, opt-in for global discovery
- [Project Navigation](mem://navegacao/acesso-direto-ao-projeto-via-url-params) — Deep-linking via '?id=' parameter for automatic selection
- [Master Analyzer](mem://funcionalidades/workflow-do-master-analyzer-integrado) — Integrated in Upload stage, decoupled from project completion
- [Partner Evaluation](mem://funcionalidades/sistema-de-avaliacao-de-parceiros) — Triggered exclusively at 'Lançado' stage, feeds public profile metrics
- [Project Workflow](mem://funcionalidades/fluxo-de-trabalho-do-projeto) — 6 mandatory stages from 'Iniciado' to 'Lançado' with fixed progression
- [Financial MVP](mem://funcionalidades/gestao-financeira-mvp) — Only confirmed paid transactions count towards totals
- [Navigation Structure](mem://navegacao/estrutura-e-onboarding) — Mobile bottom nav priorities, unmounted AppLayout 'key' for performance
- [Finance Export](mem://funcionalidades/exportacao-e-paginacao-financeira) — Pagination (20) and pt-BR CSV export via papaparse
- [Design Tokens](mem://estilo/identidade-visual-e-temas) — macOS aesthetic, light mode only, neutral gray backgrounds
- [Invite System](mem://funcionalidades/sistema-de-convites-dual) — Manual copy-paste links only, immediate status updates
- [Project Chat](mem://funcionalidades/chat-de-projeto) — Supabase Realtime chat for authenticated project members
- [Web Push Notifications](mem://funcionalidades/notificacoes-push) — VAPID/Service Worker for chat and stage updates
- [Guest Flow](mem://auth/fluxo-de-acesso-de-convidado) — Redirection and secure limited-access RPC for non-financial project data
- [Professional Categories](mem://funcionalidades/categorias-profissionais-suportadas) — Supported specialties from Marketing to Video
- [Public Profile](mem://funcionalidades/perfil-e-identidade-publica) — /u/:username exposes bio, specialties, projects, and evaluations
- [Resend Integration](mem://integracoes/envio-de-email-resend) — Edge Functions config, onboarding@resend.dev sender
- [HostGator Constraint](mem://integracoes/hostgator-email-rejeitado) — Why HostGator NS delegation is forbidden
- [Analytics & Feedback](mem://funcionalidades/feedback-beta-e-analytics) — Posthog integration and beta_feedback table
- [Onboarding Flow](mem://auth/onboarding-flow) — Mandatory profile setup, ProfileContext security guard
- [Checklist Tasks](mem://funcionalidades/gestao-de-tarefas-checklist) — Soft-delete, 1h throttle, UNIQUE INDEX deduplication
- [Music DNA Flow](mem://funcionalidades/dna-musical/fluxo-de-analise) — Web Audio API extraction, contrast analysis, session cache
- [Music DNA Tone](mem://funcionalidades/dna-musical/persona-e-tom) — Technical engineering persona with accessible summary critique
- [Music DNA Tasks](mem://funcionalidades/dna-musical/integracao-e-tarefas) — [DNA] prefix task conversion and manual feedback loop
- [Studio Module Deprecated](mem://funcionalidades/modulo-de-estudio-depreciado) — Rationale for removing /studio and keeping MasterAnalyzerModal
