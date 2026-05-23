
# Correções de segurança: SECURITY DEFINER

Objetivo: alinhar os privilégios `EXECUTE` das funções `SECURITY DEFINER` em `public` ao princípio do menor privilégio, sem quebrar nenhuma funcionalidade existente.

## Diagnóstico atual

23 funções `SECURITY DEFINER` em `public`. Classifiquei cada uma pela necessidade real:

### A. Manter público (perfil público `/u/:username` é por design)
Sem mudança:
- `get_public_profile(text)`
- `get_public_profile_history(text)`
- `get_public_profile_ratings(uuid)`

### B. Manter `authenticated` (já com `has_role` interno ou uso por usuário logado)
Sem mudança:
- `get_auth_email`, `has_role`, `get_member_projects`, `get_project_for_member`, `get_professional_project_count`, `get_genre_reference_examples`, `list_user_applications`
- Admin-gated: `get_extract_metrics`, `get_oportunidades_search_metrics`, `get_summary_variant_stats`, `report_reference_coverage`

### C. Trigger / infra / service-role only — revogar de **anon, authenticated e PUBLIC**
- `handle_new_user()` — já sem privilégios; nada a fazer.
- `recalcular_benchmark_genero(text)` — já sem privilégios.
- `upsert_reference_tracks(jsonb)` — já sem privilégios.
- `get_file_download_url(uuid)` — já sem privilégios.
- `reconcile_invitations_for_new_user()` — **hoje executável por anon/auth/public**. É função de trigger em `auth.users`. Vou revogar tudo (continua funcionando via trigger, que ignora `EXECUTE`).
- `expire_old_invitations()` — **hoje executável por anon/auth/public**. É chamada por cron/edge function com service_role. Vou revogar tudo.

### D. Funções usadas só por usuário logado — revogar de **anon**
- `count_reference_tracks_by_genre(text)`
- `find_nearest_reference_tracks(...)`
- `revoke_project_invitation(uuid)`

## Migration que será criada

```sql
-- Trigger / infra: nenhum role nominal precisa chamar
REVOKE EXECUTE ON FUNCTION public.reconcile_invitations_for_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_old_invitations()           FROM PUBLIC, anon, authenticated;

-- Funções de usuário logado: tirar acesso do anon
REVOKE EXECUTE ON FUNCTION public.count_reference_tracks_by_genre(text)                FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.find_nearest_reference_tracks(
  numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric,
  text, integer, boolean, numeric, numeric, numeric, numeric, numeric, numeric, text, text
)                                                                                      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_project_invitation(uuid)                      FROM PUBLIC, anon;

-- Garantir explicitamente que authenticated mantém acesso nessas três
GRANT EXECUTE ON FUNCTION public.count_reference_tracks_by_genre(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_nearest_reference_tracks(
  numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric,
  text, integer, boolean, numeric, numeric, numeric, numeric, numeric, numeric, text, text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_project_invitation(uuid) TO authenticated;
```

## Verificação pós-migration

1. Rodar `supabase--linter` — esperar que os 5 warnings ligados a essas funções desapareçam. Os warnings restantes (perfil público e funções de `authenticated` realmente usadas) são by-design e serão marcados como ignorados no security memory.
2. Conferir privilégios com `has_function_privilege` no `psql/read_query` para as 5 funções alteradas.
3. Rodar `bunx vitest run` para confirmar que nada quebrou.
4. Smoke manual: o trigger de novo usuário continua reconciliando convites (`reconcile_invitations_for_new_user` roda como trigger, EXECUTE não é necessário para o caller).

## Fora do escopo

- Não vou tocar nas funções de perfil público nem nas admin-gated por `has_role`.
- Não vou mover funções para outro schema (`extension in public` é warning isolado e exige reinstalação da extensão `pg_trgm`/`citext`; trato em ciclo separado se você quiser).
- Não vou alterar `SECURITY DEFINER` → `SECURITY INVOKER`, porque várias dependem de bypass de RLS proposital.
