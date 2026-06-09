-- Remove expired editais where the user never started the application process.
--
-- "Not started" means ALL of the following:
--   • no edital_applications record (never moved to pipeline)
--   • no rascunho with progresso > 0 (never filled any form fields)
--   • inscrito IS NOT TRUE (not marked as already subscribed)
--
-- Complement to cleanup_broken_expired_opportunities(): that function only
-- removes rows where link_status = 'broken'. This sweep removes ALL expired
-- rows with no meaningful user engagement, regardless of link status.
--
-- Cascade behaviour:
--   alertas_editais.edital_id  → ON DELETE CASCADE  (alerts auto-removed)
--   rascunhos_editais.edital_id → ON DELETE SET NULL (rascunhos kept but unlinked)
-- Empty rascunhos (progresso = 0) are deleted explicitly in step 1a so they
-- don't accumulate as orphans with edital_id = NULL.

-- ── 1. One-time cleanup (runs at migration time) ──────────────────────────────

DO $$
DECLARE
  del_rascunhos bigint;
  del_editais   bigint;
BEGIN
  -- 1a. Zero-progress rascunhos whose edital is about to be deleted
  WITH removed AS (
    DELETE FROM public.rascunhos_editais re
    WHERE re.progresso = 0
      AND EXISTS (
        SELECT 1 FROM public.editais e
        WHERE e.id = re.edital_id
          AND e.prazo IS NOT NULL
          AND e.prazo < CURRENT_DATE
          AND (e.inscrito IS NULL OR e.inscrito = false)
          AND NOT EXISTS (
            SELECT 1 FROM public.edital_applications ea
            WHERE ea.opportunity_id = e.id
          )
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO del_rascunhos FROM removed;

  -- 1b. Expired editais with no user engagement
  WITH removed AS (
    DELETE FROM public.editais e
    WHERE e.prazo IS NOT NULL
      AND e.prazo < CURRENT_DATE
      AND (e.inscrito IS NULL OR e.inscrito = false)
      AND NOT EXISTS (
        SELECT 1 FROM public.edital_applications ea
        WHERE ea.opportunity_id = e.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.rascunhos_editais re
        WHERE re.edital_id = e.id
          AND re.progresso > 0
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO del_editais FROM removed;

  RAISE NOTICE
    'Unstarted-expired cleanup: % empty rascunhos, % editais removed',
    del_rascunhos, del_editais;
END $$;


-- ── 2. Reusable function for recurring cleanup ────────────────────────────────

CREATE OR REPLACE FUNCTION public.cleanup_expired_unstarted_editais()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  del_rascunhos bigint;
  del_editais   bigint;
BEGIN
  -- Delete zero-progress rascunhos first to avoid orphaned rows
  WITH removed AS (
    DELETE FROM public.rascunhos_editais re
    WHERE re.progresso = 0
      AND EXISTS (
        SELECT 1 FROM public.editais e
        WHERE e.id = re.edital_id
          AND e.prazo IS NOT NULL
          AND e.prazo < CURRENT_DATE
          AND (e.inscrito IS NULL OR e.inscrito = false)
          AND NOT EXISTS (
            SELECT 1 FROM public.edital_applications ea
            WHERE ea.opportunity_id = e.id
          )
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO del_rascunhos FROM removed;

  WITH removed AS (
    DELETE FROM public.editais e
    WHERE e.prazo IS NOT NULL
      AND e.prazo < CURRENT_DATE
      AND (e.inscrito IS NULL OR e.inscrito = false)
      AND NOT EXISTS (
        SELECT 1 FROM public.edital_applications ea
        WHERE ea.opportunity_id = e.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.rascunhos_editais re
        WHERE re.edital_id = e.id
          AND re.progresso > 0
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO del_editais FROM removed;

  RETURN jsonb_build_object(
    'rascunhos_removed', del_rascunhos,
    'editais_removed',   del_editais,
    'ran_at',            now()
  );
END $$;

COMMENT ON FUNCTION public.cleanup_expired_unstarted_editais() IS
  'Deletes expired editais (prazo < today) where the user never engaged:
   no pipeline application, no draft with any progress, not marked inscribed.
   Also removes zero-progress rascunhos before the editais to avoid orphans.
   Safe to call repeatedly.';


-- ── 3. Schedule weekly via pg_cron (every Monday 06:00 UTC / 03:00 BRT) ──────
-- Wrapped so the migration does not fail if pg_cron is unavailable.

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'cleanup-expired-unstarted-editais';

  PERFORM cron.schedule(
    'cleanup-expired-unstarted-editais',
    '0 6 * * 1',
    'SELECT public.cleanup_expired_unstarted_editais()'
  );

  RAISE NOTICE 'pg_cron job "cleanup-expired-unstarted-editais" scheduled.';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available (%), skipping schedule creation.', SQLERRM;
END $$;
