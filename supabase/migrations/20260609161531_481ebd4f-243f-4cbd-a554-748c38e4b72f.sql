
DROP FUNCTION IF EXISTS public.get_summary_variant_stats();

CREATE FUNCTION public.get_summary_variant_stats()
RETURNS TABLE(
  summary_variant text,
  impressions bigint,
  sample_size bigint,
  thumbs_up_rate numeric,
  thumbs_down_rate numeric,
  saved_rate numeric,
  copied_rate numeric,
  task_created_rate numeric,
  composite_score numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem acessar este painel';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT a.id, a.summary_variant
      FROM public.music_dna_analyses a
     WHERE a.legacy = false
       AND a.summary_variant IN ('A','B')
  ),
  per_analysis AS (
    SELECT b.summary_variant,
           b.id AS analysis_id,
           BOOL_OR(s.signal_type = 'impression')   AS has_impression,
           BOOL_OR(s.signal_type = 'thumbs_up')    AS has_up,
           BOOL_OR(s.signal_type = 'thumbs_down')  AS has_down,
           BOOL_OR(s.signal_type = 'saved')        AS has_saved,
           BOOL_OR(s.signal_type = 'copied')       AS has_copied,
           BOOL_OR(s.signal_type = 'task_created') AS has_task
      FROM base b
      LEFT JOIN public.diagnosis_acceptance_signals s ON s.analysis_id = b.id
     GROUP BY b.summary_variant, b.id
  ),
  agg AS (
    SELECT
      pa.summary_variant,
      COUNT(*)::bigint                                AS sample_size,
      COUNT(*) FILTER (WHERE has_impression)::bigint  AS impressions
    FROM per_analysis pa
    GROUP BY pa.summary_variant
  )
  SELECT
    pa.summary_variant,
    a.impressions,
    a.sample_size,
    ROUND( (COUNT(*) FILTER (WHERE has_up))::numeric
           / NULLIF(a.impressions, 0), 4) AS thumbs_up_rate,
    ROUND( (COUNT(*) FILTER (WHERE has_down))::numeric
           / NULLIF(a.impressions, 0), 4) AS thumbs_down_rate,
    ROUND( (COUNT(*) FILTER (WHERE has_saved))::numeric
           / NULLIF(a.impressions, 0), 4) AS saved_rate,
    ROUND( (COUNT(*) FILTER (WHERE has_copied))::numeric
           / NULLIF(a.impressions, 0), 4) AS copied_rate,
    ROUND( (COUNT(*) FILTER (WHERE has_task))::numeric
           / NULLIF(a.impressions, 0), 4) AS task_created_rate,
    ROUND( AVG(
      (CASE WHEN has_up     THEN 1.0  ELSE 0 END) +
      (CASE WHEN has_down   THEN -1.0 ELSE 0 END) +
      (CASE WHEN has_saved  THEN 0.5  ELSE 0 END) +
      (CASE WHEN has_copied THEN 0.25 ELSE 0 END) +
      (CASE WHEN has_task   THEN 0.5  ELSE 0 END)
    )::numeric, 4) AS composite_score
  FROM per_analysis pa
  JOIN agg a ON a.summary_variant = pa.summary_variant
  GROUP BY pa.summary_variant, a.impressions, a.sample_size
  ORDER BY pa.summary_variant;
END;
$function$;
