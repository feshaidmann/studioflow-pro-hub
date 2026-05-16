## Objetivo

Conseguir depurar em < 2 min por que a auto-extração de um edital falhou: ver causa provável classificada, número de tentativas (retry), tempo gasto e taxa agregada de falha.

## Escopo

### 1. Edge function `extract-edital-fields` — logs estruturados

Hoje só há `console.error`. Vamos:

- Capturar `started_at` e calcular `duration_ms`.
- Classificar a causa em uma das chaves: `auth_error`, `bad_request`, `no_perplexity_key`, `perplexity_upstream_error`, `perplexity_timeout`, `empty_response`, `invalid_json`, `no_fields_extracted`, `unknown_error`.
- Em qualquer erro/anomalia, gravar uma linha em `public.function_logs` (tabela já existe, só admins leem) via cliente service-role:
  ```ts
  await supabaseService.from("function_logs").insert({
    function_name: "extract-edital-fields",
    level: "error" | "warn",
    message: <causa amigável>,
    details: { cause, http_status, duration_ms, user_id, has_url, has_titulo, perplexity_status, raw_excerpt }
  });
  ```
- Retornar no JSON de resposta (mesmo em sucesso parcial) `{ cause: "no_fields_extracted" | ..., http_status, duration_ms, campos, ... }` para o front classificar sem reparsear erro.
- Sucesso pleno também loga (level=`info`) com `cause: "ok"` e `fields_count`, mas isso só se útil pra calcular taxa — fica como nota; se inflar a tabela, marcamos `level=info` e podemos filtrar depois.

### 2. Hook `useRascunhoEdital.extractFields` — telemetria + retry tracking

- Manter um contador `attemptsRef` por par `(editalId, url)` na sessão (Map em ref + persistência leve em `sessionStorage` opcional). Inicia em 0; cada chamada incrementa antes de invocar.
- Em cada chamada, fire-and-forget:
  - `trackAppEvent("edital_extract_attempt", { attempt, has_url, has_titulo, edital_id })`
  - `trackAppEvent("edital_extract_succeeded", { attempt, duration_ms, fields_count })` quando ok com fields > 0
  - `trackAppEvent("edital_extract_failed", { attempt, cause, http_status, duration_ms, edital_id })` quando erro ou `fields_count = 0`
- Devolver/expor estado novo `lastError: { cause, message, attempt } | null` (substitui o toast genérico, que vira mais específico por causa).
- Manter o toast atual, mas mensagem por causa (mapa pt-BR):
  - `no_perplexity_key` → "Integração de IA indisponível no momento"
  - `perplexity_upstream_error` → "A IA não respondeu — tente novamente"
  - `empty_response` / `invalid_json` → "A IA não retornou um formulário válido"
  - `no_fields_extracted` → "Não conseguimos identificar campos automaticamente"
  - etc.

### 3. UI `EditalInscricao.tsx` — fallback card mais informativo

No card que aparece quando `!extractedFields && !extracting && autoExtractedRef.current`:
- Exibir badge da causa (texto curto), número da tentativa ("Tentativa 2") e botão "Tentar novamente" já existente.
- Manter link "Abrir edital oficial".
- Sem mudança de fluxo — apenas mais contexto pro usuário e pro debug.

### 4. RPC admin `get_extract_metrics(p_days int)`

`SECURITY DEFINER`, com `has_role(auth.uid(), 'admin')`. Lê `analytics_events` filtrando `event_name IN ('edital_extract_attempt','edital_extract_succeeded','edital_extract_failed')` nos últimos `p_days` dias e retorna:

| coluna | descrição |
|---|---|
| total_attempts | nº de attempts |
| total_success | nº de sucessos |
| total_failed | nº de falhas |
| failure_rate | failed / attempts |
| retry_rate | proporção de attempts com `properties->>'attempt' >= '2'` |
| avg_attempts_to_success | média de attempts em sucessos |
| failures_by_cause | jsonb agrupado: `{ "no_fields_extracted": 12, ... }` |

Sem UI nova — o admin consulta via `/admin` (já há páginas admin com `supabase.rpc`); a UI dedicada fica fora de escopo deste passo, mas a RPC já habilita o debug pelo painel SQL ou um card simples num próximo loop.

### Fora de escopo
- Painel visual dedicado das métricas (próximo passo).
- Retry automático com backoff (apenas instrumentação por enquanto).
- Logs para outras edge functions.

## Detalhes técnicos

**Arquivos a alterar**
- `supabase/functions/extract-edital-fields/index.ts` — classificação de causa + insert em `function_logs` via service-role + payload de resposta com `cause`/`duration_ms`.
- `src/hooks/useRascunhoEdital.ts` — contador de attempt, classificação, `trackAppEvent`, `lastError` no retorno.
- `src/pages/EditalInscricao.tsx` — usar `lastError.cause` + `attempt` no card de fallback.
- Migração: criar RPC `public.get_extract_metrics(p_days int)`.

**Tabelas/secrets usados (já existem)**
- `public.function_logs` (RLS já permite só admin SELECT; service-role insere)
- `public.analytics_events` (insert via `trackAppEvent`)
- Secret `SUPABASE_SERVICE_ROLE_KEY` (já configurado)

**Classificação de causa (pseudo)**
```ts
function classify(stage, status, payload): Cause {
  if (stage === "auth") return "auth_error";
  if (stage === "input") return "bad_request";
  if (stage === "no_key") return "no_perplexity_key";
  if (stage === "perplexity_fetch") {
    if (status === 0) return "perplexity_timeout";
    return "perplexity_upstream_error";
  }
  if (stage === "parse") {
    if (!payload?.raw) return "empty_response";
    return "invalid_json";
  }
  if (stage === "validate" && (payload?.campos?.length ?? 0) === 0)
    return "no_fields_extracted";
  return "unknown_error";
}
```

## Validação
- Forçar falha (chave inválida temporária ou URL absurda) → `function_logs` recebe linha com `cause` correta; toast pt-BR específico aparece.
- Disparar 2 tentativas seguidas → ver `attempt: 2` em `analytics_events` e badge "Tentativa 2" na UI.
- Rodar `select * from public.get_extract_metrics(7);` como admin → ver `failure_rate` e `failures_by_cause` agregados.
