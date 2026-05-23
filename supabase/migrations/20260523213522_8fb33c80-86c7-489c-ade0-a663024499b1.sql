
-- Trigger / infra: nenhum role nominal precisa executar diretamente
REVOKE EXECUTE ON FUNCTION public.reconcile_invitations_for_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_old_invitations()             FROM PUBLIC, anon, authenticated;

-- Funções usadas apenas por usuário autenticado: remover acesso anônimo
REVOKE EXECUTE ON FUNCTION public.count_reference_tracks_by_genre(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.find_nearest_reference_tracks(
  numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric,
  text, integer, boolean, numeric, numeric, numeric, numeric, numeric, numeric, text, text
) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_project_invitation(uuid) FROM PUBLIC, anon;

-- Garantir explicitamente que authenticated continua com acesso
GRANT EXECUTE ON FUNCTION public.count_reference_tracks_by_genre(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_nearest_reference_tracks(
  numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric,
  text, integer, boolean, numeric, numeric, numeric, numeric, numeric, numeric, text, text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_project_invitation(uuid) TO authenticated;
