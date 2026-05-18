
## Objetivo

Destravar a coleta automática de editais e tornar a persistência manual robusta a duplicatas e a links quebrados. Depois, revalidar via logs/dados que tudo voltou a funcionar.

## Mudanças

### 1. `supabase/functions/edital-monitor/index.ts` — fix do `Buffer`
- Substituir o uso de `Buffer.from(...).toString("base64")` na geração de `session_key` por API nativa do Deno.
- Estratégia: `btoa(unescape(encodeURIComponent(titulo + link)))` truncado em 40 chars (ASCII-safe para títulos com acento).
- Sem outras mudanças de lógica. Deploy imediato da função.

### 2. `src/hooks/useEditais.ts` — upsert + link_status
- Trocar o fluxo "select existentes → filtrar → insert" por um único `upsert(rows, { onConflict: "user_id,session_key", ignoreDuplicates: true })`, eliminando race condition entre abas.
- Persistir `link_status` e `link_checked_at` nas linhas inseridas:
  - Se o item já vier com `link_status` definido pela busca (`edital-search` retorna isso indiretamente), preservar.
  - Caso contrário gravar `link_status: 'unknown'` e deixar o cron diário `check-opportunity-links` reavaliar.
- Ajustar o toast para refletir contagem real de novos vs duplicados (usa `data?.length` do retorno do upsert).
- Manter assinatura pública do hook intacta (sem quebra para `Carreira.tsx`).

### 3. Pré-requisito de schema
- Verificar se existe `UNIQUE (user_id, session_key)` em `public.editais`. Se não existir, criar via migration mínima — sem isso o `onConflict` falha.

### 4. Validação pós-deploy
- Disparar o `edital-monitor` manualmente para a fonte "Editais SP música" (curl) e conferir:
  - Sem erro `Buffer is not defined` nos logs da função.
  - Linhas novas em `editais` com `session_key` iniciando em `ppx_`.
- Inserir um edital fictício duas vezes pelo hook e confirmar que o segundo insert não duplica nem lança erro.
- Conferir `link_status` populado nas novas linhas.

## Fora de escopo (ficam para iterações seguintes)

- Decisão sobre destino de `palco-search` (editais vs palcos_curados).
- Telemetria do `oportunidades-search`.
- Soft-404 no `checkLinkAlive`.
- Atualização do system prompt do `edital-search` para PNAB / Paulo Gustavo.
