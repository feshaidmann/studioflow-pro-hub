
-- Generate a one-time cron token and store it in vault
DO $$
DECLARE
  v_secret text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'cron_secret') THEN
    v_secret := encode(extensions.gen_random_bytes(32), 'hex');
    PERFORM vault.create_secret(v_secret, 'cron_secret', 'Token used to authenticate pg_cron HTTP calls to edge functions');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.verify_cron_token(p_token text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM vault.decrypted_secrets
     WHERE name = 'cron_secret'
       AND decrypted_secret = p_token
  );
$$;

REVOKE ALL ON FUNCTION public.verify_cron_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_cron_token(text) TO service_role;
