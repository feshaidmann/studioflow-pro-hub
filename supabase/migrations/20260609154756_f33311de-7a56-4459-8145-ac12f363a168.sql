
CREATE OR REPLACE FUNCTION public.get_ai_invocations_metrics(
  p_hours integer DEFAULT 168,
  p_function_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since timestamptz := now() - make_interval(hours => GREATEST(p_hours, 1));
  v_bucket text := CASE WHEN p_hours <= 48 THEN 'hour' ELSE 'day' END;
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem acessar estas métricas';
  END IF;

  WITH base AS (
    SELECT *
      FROM public.ai_invocations
     WHERE created_at >= v_since
       AND (p_function_name IS NULL OR p_function_name = '' OR function_name = p_function_name)
  ),
  totals AS (
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'success')::int AS success,
      COUNT(*) FILTER (WHERE status <> 'success')::int AS errors,
      COUNT(DISTINCT user_id)::int AS unique_users,
      ROUND(COALESCE(SUM(cost_usd), 0)::numeric, 4) AS total_cost_usd,
      COALESCE(SUM(tokens_input), 0)::bigint AS tokens_input,
      COALESCE(SUM(tokens_output), 0)::bigint AS tokens_output
    FROM base
  ),
  series AS (
    SELECT
      date_trunc(v_bucket, created_at) AS bucket,
      COUNT(*) FILTER (WHERE status = 'success')::int AS success,
      COUNT(*) FILTER (WHERE status <> 'success')::int AS errors,
      COUNT(*)::int AS total
    FROM base
    GROUP BY 1
    ORDER BY 1
  ),
  top_users AS (
    SELECT
      b.user_id,
      p.display_name,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE b.status = 'success')::int AS success,
      COUNT(*) FILTER (WHERE b.status <> 'success')::int AS errors,
      MAX(b.created_at) AS last_seen,
      ROUND(COALESCE(SUM(b.cost_usd), 0)::numeric, 4) AS cost_usd
    FROM base b
    LEFT JOIN public.profiles p ON p.id = b.user_id
    WHERE b.user_id IS NOT NULL
    GROUP BY b.user_id, p.display_name
    ORDER BY total DESC
    LIMIT 20
  ),
  top_functions AS (
    SELECT
      function_name,
      COUNT(*)::int AS total,
      COUNT(DISTINCT user_id)::int AS unique_users,
      COUNT(*) FILTER (WHERE status <> 'success')::int AS errors,
      ROUND(COALESCE(SUM(cost_usd), 0)::numeric, 4) AS cost_usd
    FROM base
    GROUP BY function_name
    ORDER BY total DESC
    LIMIT 20
  )
  SELECT jsonb_build_object(
    'since', v_since,
    'bucket', v_bucket,
    'totals', (SELECT to_jsonb(t) FROM totals t),
    'series', COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.bucket) FROM series s), '[]'::jsonb),
    'top_users', COALESCE((SELECT jsonb_agg(to_jsonb(u)) FROM top_users u), '[]'::jsonb),
    'top_functions', COALESCE((SELECT jsonb_agg(to_jsonb(f)) FROM top_functions f), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_invocations_metrics(integer, text) TO authenticated;
