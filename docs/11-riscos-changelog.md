# 11 · Matriz de riscos e changelog

## Matriz de riscos aceitos

| Risco | Severidade | Status | Mitigação |
|-------|-----------|--------|-----------|
| `project_invitations` SELECT público | Média | Aceito | Token 32 bytes (256 bits); só metadados expostos |
| `platform_invitations` SELECT público | Média | Aceito | Mesma justificativa |
| Realtime sem policy em `realtime.messages` | Baixa | Aceito | RLS na tabela `project_messages` cobre o caso |
| Pro liberado para todos no beta | Informativo | Temporário | `isPro = true` em `ProfileContext`; remove com monetização |
| `verify_jwt = false` em todas as Edge Functions | Baixa | Aceito | Validação manual permite fluxos públicos por token + JWT no mesmo deploy |
| Bucket `avatars` público | Baixa | Aceito | Necessário para perfis públicos; uploads escopados por pasta do user |
| Bucket `creative-assets` público | Baixa | Aceito | Necessário para share de briefings; uploads via service role |
| Traduções incompletas em alguns módulos | Baixa | Em progresso | Páginas principais traduzidas |

## Changelog

### v4.0 — Maio 2026 (atual)

- Documentação dividida em 11 arquivos temáticos em `docs/`.
- Atualizada para refletir: Carreira unificada (`/carreira`), `/studio` removido, `/criativo` redirecionando para `/projects`, novo wizard de Direção Visual com deep-link, `/admin/reference-tracks`, pipeline de referências do DNA Musical, calibração por feedback (`genre_mismatch_feedback`), enriquecimento de vizinhos (`enrich-neighbor-context`), cron `check-opportunity-links`.
- Inventário de Edge Functions: **30** (anterior: 18).
- Novas tabelas documentadas: `visual_briefings`, `visual_briefing_shares`, `palcos_curados`, `music_reference_tracks`, `genre_mismatch_feedback`, `music_external_metadata`, `ai_usage`.
- Padrão registrado: uploads pesados vão para `creative-assets` (evita `statement_timeout` em JSONB).
- Princípios fixos consolidados: persona única (Artista), light mode only, pt-BR, privacidade financeira.

### v3.1 — Abril 2026

- Lançamento do Módulo de Editais e do Módulo Criativo (este último depois absorvido pela Direção Visual dentro do projeto).
- Release Checklist expandido para 7 seções.
- WhatsApp deeplink, chip "Dúvida técnica", auto-preenchimento de editais, `AIMarkdownContent`.

### v3.0 — Abril 2026

- Remoção do `ThemeContext` (modo escuro descartado).
- Limpeza de `as any` em chamadas Supabase.
- Tratamento de `profile === null` no `ProtectedRoute`.
- Catch-all `/*` → `/dashboard`.
- Refator de `generate-daily-tasks` (escopo do JWT, upsert com `source_key`, throttle 1h).
- Bug crítico de duplicação de tasks resolvido (309 → 43 via unique index parcial).
