
SELECT cron.schedule(
  'expire-invitations-hourly',
  '7 * * * *',
  $$SELECT public.expire_old_invitations();$$
);
