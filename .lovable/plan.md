## Correções de segurança (sem novo secret)

Como não vamos adicionar `CRON_SECRET`, os 3 cron functions vão validar `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` (variável já disponível). Os jobs em `cron.job` serão reescritos para passar esse header — usando o valor já hardcoded no comando do `pg_cron` (mesma sensibilidade do anon que está lá hoje, mas agora exigindo service role).

### 1. Edge functions — autenticação

- `edital-monitor`, `notify-edital-deadlines`, `check-opportunity-links`:
  - Rejeitar (401) se `Authorization` ≠ `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`.
- `send-push-notification`:
  - Exigir JWT do usuário; forçar `user_id === caller.sub` (somente self-notification).
- `search-platform-professionals`:
  - Remover `email` e `phone` do SELECT (mantém função pública para o marketplace).

### 2. Migration — RLS e RPCs

- **`project_invitations`**: dropar policy `Public can read invitation by token`. Criar RPC `public.get_invitation_by_token(p_token text) RETURNS TABLE(...)` `SECURITY DEFINER`, retornando apenas campos necessários para a tela (`id, status, professional_name, professional_email, professional_role, fee, deadline, schedule_notes, expires_at, project_name, project_artist`). `GRANT EXECUTE ... TO anon, authenticated`.
- **`platform_invitations`**: dropar policy `Public read platform_invitation by token`. Criar RPC análoga `get_platform_invitation_by_token(p_token text)` (mesma estratégia).
- **`profiles`**: alterar `Public can view listed profiles` para `TO authenticated` (drop anon). Atualizar RPC `get_public_profile` para incluir `work_links` (assim `PublicProfile.tsx` deixa de precisar do `from('profiles')` direto para anônimos).

### 3. Atualizações no cliente

- `src/pages/InviteResponse.tsx`: substituir `supabase.from('project_invitations').select(...).eq('token', token)` por `supabase.rpc('get_invitation_by_token', { p_token: token })`.
- `src/pages/PublicProfile.tsx`: usar `work_links` retornado pela RPC; remover o fetch direto em `profiles`.

### 4. pg_cron — reagendar com service role

Via `supabase--insert`, executar:
```sql
SELECT cron.unschedule('edital-monitor-6h');
SELECT cron.unschedule('notify-edital-deadlines-daily');
SELECT cron.unschedule('check-opportunity-links-daily');
SELECT cron.schedule('edital-monitor-6h', '0 */6 * * *', $$
  SELECT net.http_post(
    url := 'https://icdedfqsiorzzuhzvfgl.supabase.co/functions/v1/edital-monitor',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <SERVICE_ROLE_JWT>'),
    body := '{}'::jsonb
  );
$$);
-- idem para os outros dois
```
O JWT do service role precisa ser fornecido pelo usuário (não tenho acesso ao valor). Vou deixar o comando pronto e pedir para o usuário rodar via SQL editor caso prefira não compartilhar — ou substituir o placeholder no insert tool.

### 5. Findings que serão **ignorados** com explicação no security memory

- **`realtime_messages_no_policies`** — o chat usa `postgres_changes`, então RLS de `public.project_messages` já filtra payloads; `realtime` é schema reservado.
- **`marketplace_curated_providers_contact_data`** — exposição intencional para autenticados navegando no marketplace.
- **`SUPA_anon_security_definer_function_executable` / `authenticated_…`** — RPCs públicos (`get_public_profile`, `get_marketplace_providers`, etc.) são intencionalmente chamáveis sem privilégios elevados; elas mesmas filtram dados.
- **`SUPA_extension_in_public`** — extensões padrão do Supabase, não trocaremos schema.

### Arquivos afetados

- `supabase/functions/edital-monitor/index.ts`
- `supabase/functions/notify-edital-deadlines/index.ts`
- `supabase/functions/check-opportunity-links/index.ts`
- `supabase/functions/send-push-notification/index.ts`
- `supabase/functions/search-platform-professionals/index.ts`
- `src/pages/InviteResponse.tsx`
- `src/pages/PublicProfile.tsx`
- Nova migration (RLS + RPCs)
- Reschedule pg_cron + atualização de security memory
