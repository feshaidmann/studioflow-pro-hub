-- Cleanup broken-link editais and palcos_curados whose registration deadline
-- has already passed. Also removes the associated pipeline applications — they
-- would otherwise appear in list_user_applications() with all NULL opportunity
-- fields (LEFT JOIN returns NULL when the referenced row is gone).
--
-- Criteria for deletion:
--   link_status = 'broken'          -- link was confirmed unreachable
--   prazo IS NOT NULL               -- open-ended ("Ano todo") opportunities are kept
--   prazo < CURRENT_DATE            -- registration window is closed

-- ── 1. One-time cleanup (runs at migration time) ──────────────────────────────

DO $$
DECLARE
  del_apps_editais  bigint;
  del_apps_palcos   bigint;
  del_editais       bigint;
  del_palcos        bigint;
BEGIN
  -- 1a. Pipeline applications referencing broken+expired editais (fomento)
  WITH removed AS (
    DELETE FROM public.edital_applications
    WHERE tipo = 'fomento'
      AND opportunity_id IN (
        SELECT id FROM public.editais
        WHERE link_status = 'broken'
          AND prazo IS NOT NULL
          AND prazo < CURRENT_DATE
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO del_apps_editais FROM removed;

  -- 1b. Pipeline applications referencing broken+expired palcos
  WITH removed AS (
    DELETE FROM public.edital_applications
    WHERE tipo = 'palco'
      AND opportunity_id IN (
        SELECT id FROM public.palcos_curados
        WHERE link_status = 'broken'
          AND prazo IS NOT NULL
          AND prazo < CURRENT_DATE
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO del_apps_palcos FROM removed;

  -- 1c. Broken+expired editais (user-owned)
  WITH removed AS (
    DELETE FROM public.editais
    WHERE link_status = 'broken'
      AND prazo IS NOT NULL
      AND prazo < CURRENT_DATE
    RETURNING id
  )
  SELECT COUNT(*) INTO del_editais FROM removed;

  -- 1d. Broken+expired palcos_curados (admin-curated)
  WITH removed AS (
    DELETE FROM public.palcos_curados
    WHERE link_status = 'broken'
      AND prazo IS NOT NULL
      AND prazo < CURRENT_DATE
    RETURNING id
  )
  SELECT COUNT(*) INTO del_palcos FROM removed;

  RAISE NOTICE
    'Broken-link cleanup: % applications (fomento), % applications (palco), % editais, % palcos_curados removed',
    del_apps_editais, del_apps_palcos, del_editais, del_palcos;
END $$;


-- ── 2. Reusable function for recurring cleanup ────────────────────────────────

CREATE OR REPLACE FUNCTION public.cleanup_broken_expired_opportunities()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  del_apps_editais  bigint;
  del_apps_palcos   bigint;
  del_editais       bigint;
  del_palcos        bigint;
BEGIN
  WITH removed AS (
    DELETE FROM public.edital_applications
    WHERE tipo = 'fomento'
      AND opportunity_id IN (
        SELECT id FROM public.editais
        WHERE link_status = 'broken'
          AND prazo IS NOT NULL
          AND prazo < CURRENT_DATE
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO del_apps_editais FROM removed;

  WITH removed AS (
    DELETE FROM public.edital_applications
    WHERE tipo = 'palco'
      AND opportunity_id IN (
        SELECT id FROM public.palcos_curados
        WHERE link_status = 'broken'
          AND prazo IS NOT NULL
          AND prazo < CURRENT_DATE
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO del_apps_palcos FROM removed;

  WITH removed AS (
    DELETE FROM public.editais
    WHERE link_status = 'broken'
      AND prazo IS NOT NULL
      AND prazo < CURRENT_DATE
    RETURNING id
  )
  SELECT COUNT(*) INTO del_editais FROM removed;

  WITH removed AS (
    DELETE FROM public.palcos_curados
    WHERE link_status = 'broken'
      AND prazo IS NOT NULL
      AND prazo < CURRENT_DATE
    RETURNING id
  )
  SELECT COUNT(*) INTO del_palcos FROM removed;

  RETURN jsonb_build_object(
    'applications_editais_removed', del_apps_editais,
    'applications_palcos_removed',  del_apps_palcos,
    'editais_removed',              del_editais,
    'palcos_curados_removed',       del_palcos,
    'ran_at',                       now()
  );
END $$;

COMMENT ON FUNCTION public.cleanup_broken_expired_opportunities() IS
  'Deletes editais and palcos_curados with broken links whose registration deadline (prazo) has passed, along with any orphaned pipeline applications. Safe to call repeatedly.';


-- ── 3. Scheduled weekly cleanup via pg_cron (runs every Monday at 03:00 BRT) ─
-- Wrapped in a DO block so the migration does not fail if pg_cron is not
-- enabled on this Supabase project (the one-time cleanup above still runs).

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  -- Remove any pre-existing schedule with this name before (re-)creating.
  -- Select from cron.job first to avoid unschedule() raising when not found.
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'cleanup-broken-expired-opportunities';

  PERFORM cron.schedule(
    'cleanup-broken-expired-opportunities',  -- job name
    '0 6 * * 1',                             -- every Monday 06:00 UTC (03:00 BRT)
    'SELECT public.cleanup_broken_expired_opportunities()'
  );

  RAISE NOTICE 'pg_cron job "cleanup-broken-expired-opportunities" scheduled.';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available (%), skipping schedule creation.', SQLERRM;
END $$;
