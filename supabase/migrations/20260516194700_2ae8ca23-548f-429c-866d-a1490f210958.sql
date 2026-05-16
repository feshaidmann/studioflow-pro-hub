
CREATE OR REPLACE FUNCTION public.get_extract_metrics(p_days integer DEFAULT 7)
RETURNS TABLE(
  total_attempts bigint,
  total_success bigint,
  total_failed bigint,
  failure_rate numeric,
  retry_rate numeric,
  avg_attempts_to_success numeric,
  failures_by_cause jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since timestamptz := now() - make_interval(days => GREATEST(p_days, 1));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem acessar estas métricas';
  END IF;

  RETURN QUERY
  WITH ev AS (
    SELECT event_name, properties, created_at
      FROM public.analytics_events
     WHERE created_at >= v_since
       AND event_name IN ('edital_extract_attempt','edital_extract_succeeded','edital_extract_failed')
  ),
  attempts AS (SELECT * FROM ev WHERE event_name = 'edital_extract_attempt'),
  successes AS (SELECT * FROM ev WHERE event_name = 'edital_extract_succeeded'),
  failures AS (SELECT * FROM ev WHERE event_name = 'edital_extract_failed'),
  causes AS (
    SELECT COALESCE(NULLIF(properties->>'cause',''), 'unknown_error') AS cause, COUNT(*)::bigint AS n
      FROM failures
     GROUP BY 1
  )
  SELECT
    (SELECT COUNT(*) FROM attempts)::bigint AS total_attempts,
    (SELECT COUNT(*) FROM successes)::bigint AS total_success,
    (SELECT COUNT(*) FROM failures)::bigint AS total_failed,
    ROUND(((SELECT COUNT(*) FROM failures)::numeric / NULLIF((SELECT COUNT(*) FROM attempts),0))::numeric, 4) AS failure_rate,
    ROUND((
      (SELECT COUNT(*) FROM attempts WHERE COALESCE(NULLIF(properties->>'attempt','')::int, 1) >= 2)::numeric
      / NULLIF((SELECT COUNT(*) FROM attempts),0)
    )::numeric, 4) AS retry_rate,
    ROUND(COALESCE(
      (SELECT AVG(COALESCE(NULLIF(properties->>'attempt','')::int, 1)) FROM successes), 0
    )::numeric, 2) AS avg_attempts_to_success,
    COALESCE((SELECT jsonb_object_agg(cause, n) FROM causes), '{}'::jsonb) AS failures_by_cause;
END;
$$;
