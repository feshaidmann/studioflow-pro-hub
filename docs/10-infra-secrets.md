# 10 · Infraestrutura, deploy e secrets

## Pipeline de deploy

| Componente | Método |
|-----------|--------|
| Frontend | `vite build` → Lovable Cloud (automático) |
| Edge Functions | Deploy automático ao salvar (Lovable Cloud) |
| Migrations | Executadas via migration tool |

## Ambientes

| Ambiente | URL |
|----------|-----|
| Preview | `https://id-preview--13754490-93be-4386-ad4d-a7a95dda27bb.lovable.app` |
| Publicação Lovable | `https://studioflow-pro-hub.lovable.app` |
| Domínio custom | `https://app.jamsessionproject.com.br` |

## Variáveis de ambiente (frontend `.env`)

> Auto-geradas — **não editar manualmente**.

| Variável | Sensível |
|----------|----------|
| `VITE_SUPABASE_URL` | Não (pública) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Não |
| `VITE_SUPABASE_PROJECT_ID` | Não |

## Secrets (Edge Functions)

| Secret | Uso |
|--------|-----|
| `SUPABASE_URL` | Todas |
| `SUPABASE_ANON_KEY` | Contexto de usuário |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin / cron / uploads pesados (`admin-stats`, `respond-*`, `match-editais`, `import-reference-tracks`, `export-acoustic-catalog`, `generate-visual-direction`, `check-opportunity-links`, `notify-edital-deadlines`) |
| `SUPABASE_DB_URL` | Migrações |
| `LOVABLE_API_KEY` | Toda chamada IA |
| `RESEND_API_KEY` | E-mails transacionais |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push |
| `PERPLEXITY_API_KEY` | `extract-edital-fields` |

> `SUPABASE_SERVICE_ROLE_KEY` jamais é exposto ao frontend.

## DNS e e-mail (HostGator: rejeitado)

A delegação de NS para HostGator foi avaliada e **rejeitada**. Motivos resumidos:

- Provedor não permite ajustar todos os records SPF/DKIM/DMARC necessários para Resend.
- Latência de propagação inconsistente.
- Risco de quebrar entrega transacional e auth flows.

A recomendação canônica é manter os NS no provedor que dá controle total dos registros (Cloudflare ou similar) ao migrar para domínio próprio definitivo.

## Service Worker

`public/sw.js` registra Web Push e cache mínimo. Atualizações são forçadas a cada deploy via versão no nome do cache.
