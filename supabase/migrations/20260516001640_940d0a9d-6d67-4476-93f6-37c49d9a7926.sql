-- 1) Tabela de versões da música
CREATE TABLE public.music_track_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  track_slug text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, track_slug)
);

ALTER TABLE public.music_track_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own track versions"
ON public.music_track_versions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_music_track_versions_updated_at
BEFORE UPDATE ON public.music_track_versions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_track_versions_user ON public.music_track_versions(user_id);

-- 2) Estender music_dna_analyses
ALTER TABLE public.music_dna_analyses
  ADD COLUMN IF NOT EXISTS track_version_id uuid REFERENCES public.music_track_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS version_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS summary_variant text NOT NULL DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS summary_variant_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS legacy boolean NOT NULL DEFAULT false;

-- Backfill: análises existentes são marcadas como legacy (não poluem métricas A/B)
UPDATE public.music_dna_analyses
   SET legacy = true
 WHERE summary_variant_assigned_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_music_dna_analyses_track_version
  ON public.music_dna_analyses(track_version_id);

-- 3) Sinais de aceitação
CREATE TABLE public.diagnosis_acceptance_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  analysis_id uuid NOT NULL REFERENCES public.music_dna_analyses(id) ON DELETE CASCADE,
  summary_variant text NOT NULL,
  signal_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (analysis_id, signal_type),
  CONSTRAINT diagnosis_signal_type_valid CHECK (
    signal_type IN ('thumbs_up','thumbs_down','saved','copied','task_created')
  ),
  CONSTRAINT diagnosis_signal_variant_valid CHECK (
    summary_variant IN ('A','B')
  )
);

ALTER TABLE public.diagnosis_acceptance_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own diagnosis signals"
ON public.diagnosis_acceptance_signals
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own diagnosis signals"
ON public.diagnosis_acceptance_signals
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own diagnosis signals"
ON public.diagnosis_acceptance_signals
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all diagnosis signals"
ON public.diagnosis_acceptance_signals
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_diag_signals_variant ON public.diagnosis_acceptance_signals(summary_variant);
CREATE INDEX idx_diag_signals_analysis ON public.diagnosis_acceptance_signals(analysis_id);

-- 4) RPC admin: estatísticas A/B
CREATE OR REPLACE FUNCTION public.get_summary_variant_stats()
RETURNS TABLE(
  summary_variant text,
  sample_size bigint,
  thumbs_up_rate numeric,
  thumbs_down_rate numeric,
  saved_rate numeric,
  copied_rate numeric,
  task_created_rate numeric,
  composite_score numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
           BOOL_OR(s.signal_type = 'thumbs_up')    AS has_up,
           BOOL_OR(s.signal_type = 'thumbs_down')  AS has_down,
           BOOL_OR(s.signal_type = 'saved')        AS has_saved,
           BOOL_OR(s.signal_type = 'copied')       AS has_copied,
           BOOL_OR(s.signal_type = 'task_created') AS has_task
      FROM base b
      LEFT JOIN public.diagnosis_acceptance_signals s ON s.analysis_id = b.id
     GROUP BY b.summary_variant, b.id
  )
  SELECT
    pa.summary_variant,
    COUNT(*)::bigint AS sample_size,
    ROUND( (COUNT(*) FILTER (WHERE has_up))::numeric    / NULLIF(COUNT(*),0), 4) AS thumbs_up_rate,
    ROUND( (COUNT(*) FILTER (WHERE has_down))::numeric  / NULLIF(COUNT(*),0), 4) AS thumbs_down_rate,
    ROUND( (COUNT(*) FILTER (WHERE has_saved))::numeric / NULLIF(COUNT(*),0), 4) AS saved_rate,
    ROUND( (COUNT(*) FILTER (WHERE has_copied))::numeric/ NULLIF(COUNT(*),0), 4) AS copied_rate,
    ROUND( (COUNT(*) FILTER (WHERE has_task))::numeric  / NULLIF(COUNT(*),0), 4) AS task_created_rate,
    ROUND( AVG(
      (CASE WHEN has_up    THEN 1.0  ELSE 0 END) +
      (CASE WHEN has_down  THEN -1.0 ELSE 0 END) +
      (CASE WHEN has_saved THEN 0.5  ELSE 0 END) +
      (CASE WHEN has_copied THEN 0.25 ELSE 0 END) +
      (CASE WHEN has_task  THEN 0.5  ELSE 0 END)
    )::numeric, 4) AS composite_score
  FROM per_analysis pa
  GROUP BY pa.summary_variant
  ORDER BY pa.summary_variant;
END;
$$;