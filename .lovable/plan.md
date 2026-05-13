## Objetivo

1. Remover o hack de gravar palcos como linhas em `editais` (com `tipo='palco'` + `session_key`).
2. Notificar artistas 7 e 1 dia antes do prazo de candidaturas ativas.

---

## Parte 1 — Separar palcos de editais

### Decisão de design

`edital_applications` já tem coluna `tipo` ('fomento' | 'palco') e **não tem FK** em `edital_id`. Vamos manter a tabela única de candidaturas (pipeline unificado) e usar `tipo` para resolver o alvo:

- `tipo='fomento'` → `edital_id` referencia `editais.id`
- `tipo='palco'`   → `edital_id` armazena o `palcos_curados.id`

Vantagens: zero impacto no pipeline (`useEditalApplications`, status, resultado, docs), elimina linhas-fantasma em `editais`, mantém RLS por `user_id`.

### Migração de schema

```sql
-- 1. Renomear coluna para refletir polimorfismo (mantém dados)
ALTER TABLE public.edital_applications RENAME COLUMN edital_id TO opportunity_id;

-- 2. Garantir tipo válido
ALTER TABLE public.edital_applications
  ADD CONSTRAINT edital_applications_tipo_check CHECK (tipo IN ('fomento','palco'));

-- 3. Índice composto
CREATE INDEX IF NOT EXISTS idx_edital_apps_user_tipo
  ON public.edital_applications(user_id, tipo);

-- 4. RPC para hidratar candidaturas com dados do edital OU palco
CREATE OR REPLACE FUNCTION public.list_user_applications()
RETURNS TABLE (
  id uuid, user_id uuid, opportunity_id uuid, tipo text, status text,
  notas text, data_inscricao date, data_resultado date, resultado text,
  valor_aprovado numeric, motivo_recusa text, licoes_aprendidas text,
  project_id uuid, created_at timestamptz, updated_at timestamptz,
  titulo text, orgao text, estado text, area text, prazo date, link text, resumo text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.user_id, a.opportunity_id, a.tipo, a.status,
         a.notas, a.data_inscricao, a.data_resultado, a.resultado,
         a.valor_aprovado, a.motivo_recusa, a.licoes_aprendidas,
         a.project_id, a.created_at, a.updated_at,
         COALESCE(e.titulo, p.nome)         AS titulo,
         COALESCE(e.orgao, p.organizador)   AS orgao,
         COALESCE(e.estado, p.estado)       AS estado,
         COALESCE(e.area, 'Música')         AS area,
         COALESCE(e.prazo, p.prazo)         AS prazo,
         COALESCE(e.link, p.link)           AS link,
         COALESCE(e.resumo, p.resumo)       AS resumo
    FROM edital_applications a
    LEFT JOIN editais e        ON a.tipo='fomento' AND e.id = a.opportunity_id
    LEFT JOIN palcos_curados p ON a.tipo='palco'   AND p.id = a.opportunity_id
   WHERE a.user_id = auth.uid()
   ORDER BY a.updated_at DESC;
$$;

-- 5. Limpar shadow rows de palco em editais (apenas as criadas pelo hack)
DELETE FROM public.editais
 WHERE tipo = 'palco' AND session_key LIKE 'palco:%';
```

> Observação: a deleção é segura porque toda candidatura existente vai migrar para `opportunity_id = palcos_curados.id` num passo prévio (UPDATE join via `editais.session_key`).

```sql
-- 5a. (rodar ANTES do DELETE) Reapontar candidaturas legadas para palcos_curados
UPDATE public.edital_applications a
   SET opportunity_id = p.id, tipo = 'palco'
  FROM public.editais e
  JOIN public.palcos_curados p
    ON p.id::text = REPLACE(e.session_key, 'palco:', '')
 WHERE a.opportunity_id = e.id
   AND e.tipo = 'palco';
```

### Mudanças de código (frontend)

- `src/hooks/useEditalApplications.ts`: trocar `select("*, edital:editais(...)")` por `supabase.rpc('list_user_applications')`. Tipos da `EditalApplication` ganham campos achatados (`titulo`, `orgao`, `prazo`...).
- `src/pages/Carreira.tsx`:
  - `ensureEditalId` deixa de criar linha em `editais` para palcos. Para palco apenas retorna `{ opportunity_id: palco.id, tipo: 'palco' }`.
  - `createApplication.mutate({ opportunity_id, tipo, ... })`.
  - Card de "Minhas inscrições" usa os campos achatados da RPC (sem `app.edital?.titulo`).
  - Detail sheet em palcos continua abrindo o `OpportunityDetailSheet` (já feito).
- `src/pages/EditalInscricao.tsx`: o guard de palco continua válido como fallback, mas em prática nunca será aberto porque palcos não geram registro em `editais`.

---

## Parte 2 — Notificações D-7 / D-1

### Edge function nova: `notify-edital-deadlines`

`supabase/functions/notify-edital-deadlines/index.ts`
- Lê `edital_applications` com `status IN ('interesse','preparando','inscrito')`.
- Resolve `prazo` via join (mesma RPC ou query direta).
- Para cada um, calcula `dias = prazo - today` (TZ America/Sao_Paulo).
- Se `dias IN (7, 1)`, insere em `public.notifications` com `link = '/carreira?op=<tipo>:<id>'` e `type = 'carreira_deadline'`.
- Dedup: chave `link + type + truncate(created_at to day)` — query antes de inserir, ou índice único parcial.

### Migração auxiliar

```sql
-- Índice de dedup diária (1 notificação por candidatura por dia)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_notif_carreira_deadline_per_day
 ON public.notifications (user_id, link, type, ((created_at AT TIME ZONE 'America/Sao_Paulo')::date))
 WHERE type = 'carreira_deadline';
```

### Cron diário (pg_cron + pg_net)

Inserido via tool `insert` (não migration, contém URL+anon key):

```sql
SELECT cron.schedule(
  'notify-edital-deadlines-daily',
  '0 12 * * *',  -- 09:00 BRT
  $$ SELECT net.http_post(
       url:='https://icdedfqsiorzzuhzvfgl.supabase.co/functions/v1/notify-edital-deadlines',
       headers:='{"Content-Type":"application/json","apikey":"<anon>"}'::jsonb,
       body:='{}'::jsonb) $$
);
```

### Push opcional

Se o usuário tem subscription em `push_subscriptions`, a função também chama `send-push-notification` (já existente) com o mesmo payload. Sem subscription, fica só no sino.

---

## Arquivos impactados

**Migrações:**
- 1 migration estrutural (rename, check, índice, RPC, DELETE precedido de UPDATE).
- 1 migration auxiliar (índice único de dedup).

**Edge functions:**
- `supabase/functions/notify-edital-deadlines/index.ts` (novo).

**Frontend:**
- `src/hooks/useEditalApplications.ts` — usar RPC.
- `src/pages/Carreira.tsx` — `ensureEditalId` simplificado, ler campos achatados.
- `src/pages/EditalInscricao.tsx` — manter guard só como fallback.
- `src/integrations/supabase/types.ts` — auto-regenerado.

**Cron:**
- 1 chamada `insert` para `cron.schedule`.

---

## Fora deste escopo

- Push real para usuários sem `push_subscriptions` ativo (fica só no sino).
- Notificação D-3 (podemos adicionar depois trocando o IN do filtro).
- Configuração por usuário do timing das notificações.

Confirma para eu rodar a migration e implementar?
