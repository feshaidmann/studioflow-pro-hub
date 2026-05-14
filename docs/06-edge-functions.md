# 06 · Edge Functions

Total atual: **30 funções** Deno deployadas via Lovable Cloud. Todas usam `verify_jwt = false` com validação manual de JWT no código.

## Inventário

### Plataforma

| Função | Auth | Descrição |
|--------|------|-----------|
| `admin-stats` | JWT + admin | Métricas agregadas (usuários, custos de IA, etc.) |
| `respond-to-invite` | Token público | Aceite/recusa de convite de projeto |
| `respond-to-platform-invite` | Token público | Aceite/recusa de convite de plataforma |
| `send-project-invite` | JWT | Gera link tokenizado (sem envio automático no MVP) |
| `send-platform-invite` | JWT | Gera link tokenizado de plataforma |
| `send-push-notification` | JWT | Envia Web Push via VAPID |
| `search-platform-professionals` | Público | Busca global de profissionais opt-in |

### Projetos e áudio

| Função | Auth | Descrição | Modelo |
|--------|------|-----------|--------|
| `audio-analyze` | Pública | LUFS / True Peak / compatibilidade streaming | — |
| `project-ai-assistant` | JWT | Assistente IA do projeto | Gemini Flash |
| `ai-task-assistant` | JWT | Chat IA contextual do dashboard | Gemini Flash |
| `generate-daily-tasks` | JWT | Gera tarefas para o usuário autenticado | Gemini Flash |

### Carreira (editais + palcos)

| Função | Auth | Descrição |
|--------|------|-----------|
| `oportunidades-search` | JWT | Busca unificada (editais + palcos) |
| `edital-search` | JWT | Busca de editais legacy (interno) |
| `palco-search` | JWT | Busca de palcos legacy (interno) |
| `match-editais` | JWT | Match de editais com perfil cultural |
| `extract-edital-fields` | JWT | Extrai campos do formulário a partir do link |
| `edital-ai-assistant` | JWT | Assistente IA para inscrição |
| `edital-monitor` | Cron | Detecta novas publicações |
| `notify-edital-deadlines` | Cron | Notifica prazos |
| `check-opportunity-links` | Cron | Revalida `link_status` (editais + palcos) |

### DNA Musical e referências

| Função | Auth | Descrição |
|--------|------|-----------|
| `music-dna-analyze` | JWT | Análise de DNA Musical |
| `enrich-neighbor-context` | JWT | Cache de Deezer/MusicBrainz/ListenBrainz |
| `import-reference-tracks` | JWT + admin | Importação de referências curadas |
| `export-acoustic-catalog` | JWT + admin | Snapshot público em `creative-assets` |
| `generate-track-intelligence` | JWT | Geração de relatório técnico de faixa |

### Direção Visual

| Função | Auth | Descrição |
|--------|------|-----------|
| `suggest-visual-direction` | JWT | Sugestões de moodboard antes da geração |
| `generate-visual-direction` | JWT | Gera 6 imagens, faz upload em `creative-assets` e persiste só URLs |
| `share-visual-briefing` | JWT | Cria token de compartilhamento |
| `get-visual-briefing-share` | Token público | Retorna briefing pelo token |
| `export-visual-briefing` | JWT | Export PDF/HTML |

## `config.toml`

`verify_jwt = false` é o default. Funções específicas podem ter overrides (`import_map`, etc.) — nunca alterar `project_id`.

## Rastreamento de custos de IA

Cada chamada à API IA registra em `ai_invocations`: `function_name`, `model`, `tokens_input`, `tokens_output`, `cost_usd`, `status`, `user_id` (nullable em chamadas de sistema).

Quotas fair-use ficam em `ai_usage` (20 chamadas/dia, 80/semana por função/usuário). O componente `RateLimitDialog` é disparado quando o erro `rate_limit` é detectado pelo helper `extractRateLimitInfo` em `useRateLimitDialog`.

## Padrão de resposta de erro

Funções devem retornar `{ error: string, ... }` com status apropriado. Para rate-limit, incluir `error: "rate_limit"`, `limit_type`, `limit`, `used`, `resets_at`, `message`.

## Padrão de upload pesado

Resultados grandes (imagens, PDFs) **não vão para JSONB**. O fluxo correto é:

1. Gerar o blob in-memory.
2. Fazer `storage.from("creative-assets").upload(...)`.
3. Persistir apenas `getPublicUrl().publicUrl` no banco.

Isso evita `statement_timeout` em UPDATEs e mantém o JSONB enxuto.
