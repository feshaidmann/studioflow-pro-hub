## Diagnóstico

Os links que dão "página não encontrada" são, em quase 100% dos casos, **URLs externas** vindas da busca por IA em `oportunidades-search` (e algumas linhas legadas de `editais`). Eles podem quebrar por dois motivos:

1. **Alucinação no momento da busca** — o modelo inventa um caminho plausível mas inexistente.
2. **Link válido na origem que depois caiu** — edital expirou, órgão reorganizou o site, etc.

Hoje o app simplesmente faz `<a href={op.link} target="_blank">` sem nenhuma checagem. Não temos como impedir 100% (o destino é externo e fora do nosso controle), mas podemos **(a) bloquear lixo na entrada**, **(b) detectar quebra ao longo do tempo** e **(c) dar um caminho alternativo claro quando o link falha**.

## Plano

### 1. Validar link no momento da ingestão (preventivo)

Em `supabase/functions/oportunidades-search/index.ts`, antes de devolver/persistir cada resultado:

- Disparar `fetch(link, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(4000) })`.
- Se o servidor responder `405/501` (não aceita HEAD), refazer com `GET` + `Range: bytes=0-1024`.
- Considerar válido apenas `status` em `[200, 201, 202, 203, 204, 206, 301, 302, 303, 307, 308]` após redirect resolvido.
- Se inválido: tentar `URL` saneada (remover query suja, espaço final). Se ainda inválido, **descartar o item** da lista (não persistir nem mostrar).
- Rodar checagens em paralelo (`Promise.allSettled`) com limite de 8 concorrentes.

Resultado: editais alucinados não chegam ao usuário.

### 2. Persistir status do link (detecção contínua)

Migration adicionando em `public.editais` e `public.palcos_curados`:

```text
link_status        text     default 'unknown'   -- 'ok' | 'broken' | 'unknown'
link_checked_at    timestamptz
```

Edge function nova `check-opportunity-links`:
- Lê editais com `link != ''` e `link_checked_at` há mais de 7 dias **ou** `link_status='unknown'`.
- Faz a mesma validação HEAD/GET acima, em lotes.
- Atualiza `link_status` e `link_checked_at`.
- Limita a ~200 URLs por execução.

Cron diário (via `cron.schedule` + `pg_net`) às 04:00 BRT.

### 3. Fallback claro na UI quando o link está quebrado

Em `OpportunityCard` e `OpportunityDetailSheet`:

- Se `link_status === 'broken'`: trocar o botão "Abrir oficial" por **"Buscar no Google"** apontando para `https://www.google.com/search?q=${encodeURIComponent(orgao + ' ' + titulo + ' edital')}`, com um chip discreto **"Link oficial indisponível"**.
- Se `link_status === 'ok'` ou `'unknown'`: comportamento atual (`<a target="_blank">`).
- Acrescentar tooltip explicando: "Última verificação: dd/mm".

### 4. Reportar link quebrado (loop curto)

Botão "Reportar link quebrado" no detail sheet → `update editais set link_status='broken'` (somente o próprio user_id) + analytics `carreira_link_reported_broken`. Permite que o usuário corrija o que o cron ainda não pegou.

### 5. Limpeza de dados existentes

Após o deploy, rodar uma única vez `check-opportunity-links` para popular `link_status` em todas as oportunidades atuais (13 editais + 15 palcos — barato).

## Detalhes técnicos

**Arquivos novos**
- `supabase/functions/check-opportunity-links/index.ts`
- 1 migration (colunas + índice parcial em `link_status='broken'`)

**Arquivos editados**
- `supabase/functions/oportunidades-search/index.ts` — validação por item
- `src/hooks/useEditais.ts` e `src/hooks/usePalcos.ts` — incluir `link_status`, `link_checked_at` no select
- `src/components/carreira/types.ts` — propagar `link_status` para `Opportunity`
- `src/components/carreira/OpportunityCard.tsx` e `OpportunityDetailSheet.tsx` — UI condicional + botão "Reportar"
- `src/hooks/useEditalApplications.ts` / RPC `list_user_applications` — trazer `link_status` no payload achatado

**Cron**
- 1 schedule novo `check-opportunity-links-daily` via tool `insert`.

## Fora deste escopo

- Crawler que tenta achar a nova URL quando o link quebra (custoso, alucinação alta).
- Cache server-side de PDFs do edital.
- Notificação ao usuário quando um edital salvo perde o link (pode entrar depois reaproveitando a infra de notificações).

Confirma para eu rodar a migration e implementar?
