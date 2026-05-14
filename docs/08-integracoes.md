# 08 · Realtime, Storage, Push e Compartilhamento

## Supabase Realtime

| Tabela | Publicação | Uso |
|--------|-----------|-----|
| `project_messages` | `supabase_realtime` | Chat realtime do projeto |
| `notifications` | `supabase_realtime` | Atualização in-app de novas notificações |

> Não há policy específica em `realtime.messages` — controle é feito pela RLS da tabela espelhada (`project_messages` exige autor/dono/membro).

## Storage

| Bucket | Público | Conteúdo |
|--------|---------|----------|
| `avatars` | Leitura sim | Avatares dos usuários |
| `project-files` | Não | Stems, mixes, capas, contratos |
| `creative-assets` | Leitura sim | Imagens da Direção Visual, exports e snapshots de catálogos |

Regras detalhadas em [05-seguranca.md](./05-seguranca.md#storage). Toda função que precise persistir blobs grandes deve seguir o padrão de upload em [06-edge-functions.md](./06-edge-functions.md#padrão-de-upload-pesado).

## Web Push Notifications

- Subscriptions em `push_subscriptions` (endpoint, p256dh, auth).
- Service Worker em `public/sw.js`.
- Envio via `send-push-notification` usando VAPID (secret `VAPID_PRIVATE_KEY`).
- Disparado por: novas mensagens de chat, mudanças de estágio do projeto, deadlines de edital.
- Hook `usePushNotifications` lida com permissão e registro.

## WhatsApp sharing

- Sem integração backend.
- Botão usa deeplink `https://wa.me/?text=...` com resumo do projeto.
- Disponível na visão geral do projeto e no checklist de lançamento.

## Resend (e-mail transacional)

- Configurado para auth (verificação, reset) e notificações importantes.
- Sender padrão: `onboarding@resend.dev` enquanto o domínio próprio não está delegado.
- Convites por e-mail estão **desligados no MVP** — somente link manual.
- Edge functions configuram Resend com a secret `RESEND_API_KEY`.

## Analytics e feedback

- PostHog (`posthog-js`) inicializa em `src/lib/analytics.ts`. `identifyUser` no login, `resetAnalytics` no logout.
- `usePageTracking` registra navegação interna e popula `page_views`.
- Botão flutuante `FeedbackButton` grava em `beta_feedback` (RLS do dono + leitura admin).
- Banner do beta (`BetaBanner`) é gerenciado por `useBetaBanner`.

## Integrações externas (read-only, com cache)

`enrich-neighbor-context` consulta:

- Deezer API (preview e cover)
- MusicBrainz (tags, MBID)
- ListenBrainz (artistas similares)

Resultados ficam em `music_external_metadata` com TTL de 30 dias.
