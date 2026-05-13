CREATE OR REPLACE FUNCTION public.report_reference_coverage()
RETURNS TABLE(
  genre text,
  total integer,
  active integer,
  quarantined integer,
  healthy_pct numeric,
  distinct_bands_active integer,
  avg_dims_filled numeric,
  pct_above_floor numeric,
  tracks_per_band_avg numeric,
  tracks_per_band_max integer,
  monopoly_risk numeric,
  lufs_stddev numeric,
  bpm_stddev numeric,
  centroid_stddev numeric,
  dr_stddev numeric,
  quality_score numeric,
  quality_label text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem acessar este relatório';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      COALESCE(NULLIF(t.genre, ''), '(sem gênero)') AS genre,
      t.band,
      t.quarantined,
      -- Conta quantas das 15 dimensões usadas pelo find_nearest_reference_tracks
      -- estão preenchidas para esta faixa
      (
        (CASE WHEN t.lufs_integrated   IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN t.dynamic_range_db  IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN t.spectral_centroid IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN t.spectral_rolloff  IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN t.spectral_flatness IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN t.zero_crossing_rate IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN t.spectral_bandwidth IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN t.tempo_bpm         IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN t.energy            IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN t.danceability      IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN t.valence           IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN t.acousticness      IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN t.instrumentalness  IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN t.liveness          IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN t.speechiness       IS NOT NULL THEN 1 ELSE 0 END)
      )::int AS dims_filled,
      t.lufs_integrated, t.tempo_bpm, t.spectral_centroid, t.dynamic_range_db
    FROM public.music_reference_tracks t
  ),
  per_band AS (
    SELECT genre, band, COUNT(*)::int AS n
    FROM base
    WHERE quarantined = false
    GROUP BY genre, band
  ),
  band_stats AS (
    SELECT
      genre,
      AVG(n)::numeric AS tracks_per_band_avg,
      MAX(n)::int AS tracks_per_band_max,
      COUNT(*)::int AS distinct_bands_active
    FROM per_band
    GROUP BY genre
  ),
  agg AS (
    SELECT
      b.genre,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE NOT b.quarantined)::int AS active,
      COUNT(*) FILTER (WHERE b.quarantined)::int AS quarantined,
      AVG(b.dims_filled) FILTER (WHERE NOT b.quarantined) AS avg_dims_filled,
      (COUNT(*) FILTER (WHERE NOT b.quarantined AND b.dims_filled >= 8))::numeric
        / NULLIF(COUNT(*) FILTER (WHERE NOT b.quarantined), 0) AS pct_above_floor,
      stddev_samp(b.lufs_integrated)   FILTER (WHERE NOT b.quarantined) AS lufs_stddev,
      stddev_samp(b.tempo_bpm)         FILTER (WHERE NOT b.quarantined) AS bpm_stddev,
      stddev_samp(b.spectral_centroid) FILTER (WHERE NOT b.quarantined) AS centroid_stddev,
      stddev_samp(b.dynamic_range_db)  FILTER (WHERE NOT b.quarantined) AS dr_stddev
    FROM base b
    GROUP BY b.genre
  ),
  joined AS (
    SELECT
      a.genre, a.total, a.active, a.quarantined,
      ROUND((a.active::numeric / NULLIF(a.total, 0))::numeric, 4) AS healthy_pct,
      COALESCE(bs.distinct_bands_active, 0) AS distinct_bands_active,
      ROUND(COALESCE(a.avg_dims_filled, 0)::numeric, 2) AS avg_dims_filled,
      ROUND(COALESCE(a.pct_above_floor, 0)::numeric, 4) AS pct_above_floor,
      ROUND(COALESCE(bs.tracks_per_band_avg, 0)::numeric, 2) AS tracks_per_band_avg,
      COALESCE(bs.tracks_per_band_max, 0) AS tracks_per_band_max,
      ROUND(
        (COALESCE(bs.tracks_per_band_max, 0)::numeric / NULLIF(a.active, 0))::numeric,
        4
      ) AS monopoly_risk,
      ROUND(COALESCE(a.lufs_stddev, 0)::numeric, 3)     AS lufs_stddev,
      ROUND(COALESCE(a.bpm_stddev, 0)::numeric, 3)      AS bpm_stddev,
      ROUND(COALESCE(a.centroid_stddev, 0)::numeric, 1) AS centroid_stddev,
      ROUND(COALESCE(a.dr_stddev, 0)::numeric, 3)       AS dr_stddev
    FROM agg a
    LEFT JOIN band_stats bs ON bs.genre = a.genre
  ),
  scored AS (
    SELECT j.*,
      ROUND((100 * (
        0.30 * COALESCE(j.healthy_pct, 0) +
        0.25 * LEAST(j.active::numeric / 30.0, 1) +
        0.25 * COALESCE(j.pct_above_floor, 0) +
        0.20 * (1 - LEAST(COALESCE(j.monopoly_risk, 0), 1))
      ))::numeric, 1) AS quality_score
    FROM joined j
  )
  SELECT
    s.genre, s.total, s.active, s.quarantined, s.healthy_pct, s.distinct_bands_active,
    s.avg_dims_filled, s.pct_above_floor,
    s.tracks_per_band_avg, s.tracks_per_band_max, s.monopoly_risk,
    s.lufs_stddev, s.bpm_stddev, s.centroid_stddev, s.dr_stddev,
    s.quality_score,
    CASE
      WHEN s.quality_score < 40 THEN 'Crítico'
      WHEN s.quality_score < 60 THEN 'Frágil'
      WHEN s.quality_score < 80 THEN 'Aceitável'
      ELSE 'Sólido'
    END AS quality_label
  FROM scored s
  ORDER BY s.quality_score ASC, s.active DESC;
END;
$$;