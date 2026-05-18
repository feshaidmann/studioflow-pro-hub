CREATE OR REPLACE FUNCTION public.get_oportunidades_search_metrics(p_days integer DEFAULT 14)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since timestamptz := now() - make_interval(days => GREATEST(p_days, 1));
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem acessar estas métricas';
  END IF;

  WITH logs AS (
    SELECT created_at, level, message, details
      FROM public.function_logs
     WHERE function_name = 'oportunidades-search'
       AND created_at >= v_since
  ),
  events AS (
    SELECT created_at, event_name, properties, user_id
      FROM public.analytics_events
     WHERE event_name IN ('oportunidades_search_invoked','oportunidades_search_succeeded','oportunidades_search_failed')
       AND created_at >= v_since
  ),
  daily AS (
    SELECT
      date_trunc('day', created_at)::date AS day,
      COUNT(*) FILTER (WHERE event_name = 'oportunidades_search_invoked')::int  AS invoked,
      COUNT(*) FILTER (WHERE event_name = 'oportunidades_search_succeeded')::int AS succeeded,
      COUNT(*) FILTER (WHERE event_name = 'oportunidades_search_failed')::int   AS failed
    FROM events
    GROUP BY 1
  ),
  durations AS (
    SELECT
      date_trunc('day', created_at)::date AS day,
      NULLIF(properties->>'duration_ms','')::numeric AS duration_ms
    FROM events
    WHERE event_name IN ('oportunidades_search_succeeded','oportunidades_search_failed')
      AND properties ? 'duration_ms'
  ),
  daily_perf AS (
    SELECT
      day,
      ROUND(percentile_cont(0.5)  WITHIN GROUP (ORDER BY duration_ms)::numeric, 0) AS p50_ms,
      ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)::numeric, 0) AS p95_ms,
      ROUND(AVG(duration_ms)::numeric, 0)                                          AS avg_ms,
      COUNT(*)::int AS samples
    FROM durations
    WHERE duration_ms IS NOT NULL
    GROUP BY day
  ),
  series AS (
    SELECT
      COALESCE(d.day, p.day) AS day,
      COALESCE(d.invoked, 0) AS invoked,
      COALESCE(d.succeeded, 0) AS succeeded,
      COALESCE(d.failed, 0) AS failed,
      COALESCE(p.p50_ms, 0) AS p50_ms,
      COALESCE(p.p95_ms, 0) AS p95_ms,
      COALESCE(p.avg_ms, 0) AS avg_ms,
      COALESCE(p.samples, 0) AS samples
    FROM daily d
    FULL OUTER JOIN daily_perf p ON p.day = d.day
  ),
  causes AS (
    SELECT
      COALESCE(NULLIF(properties->>'cause',''), 'unknown') AS cause,
      COUNT(*)::int AS n
    FROM events
    WHERE event_name = 'oportunidades_search_failed'
    GROUP BY 1
    ORDER BY n DESC
    LIMIT 10
  ),
  totals AS (
    SELECT
      COUNT(*) FILTER (WHERE event_name = 'oportunidades_search_invoked')::int  AS invoked,
      COUNT(*) FILTER (WHERE event_name = 'oportunidades_search_succeeded')::int AS succeeded,
      COUNT(*) FILTER (WHERE event_name = 'oportunidades_search_failed')::int   AS failed,
      COUNT(DISTINCT user_id)::int AS unique_users
    FROM events
  ),
  perf_total AS (
    SELECT
      ROUND(percentile_cont(0.5)  WITHIN GROUP (ORDER BY duration_ms)::numeric, 0) AS p50_ms,
      ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)::numeric, 0) AS p95_ms,
      ROUND(percentile_cont(0.99) WITHIN GROUP (ORDER BY duration_ms)::numeric, 0) AS p99_ms,
      ROUND(AVG(duration_ms)::numeric, 0) AS avg_ms,
      COUNT(*)::int AS samples
    FROM durations
    WHERE duration_ms IS NOT NULL
  ),
  recent_errors AS (
    SELECT created_at, message, details
    FROM logs
    WHERE level = 'error'
    ORDER BY created_at DESC
    LIMIT 20
  )
  SELECT jsonb_build_object(
    'since', v_since,
    'totals', (SELECT to_jsonb(t) FROM totals t),
    'perf',   (SELECT to_jsonb(p) FROM perf_total p),
    'daily',  COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.day) FROM series s), '[]'::jsonb),
    'failure_causes', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM causes c), '[]'::jsonb),
    'recent_errors',  COALESCE((SELECT jsonb_agg(to_jsonb(e)) FROM recent_errors e), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;