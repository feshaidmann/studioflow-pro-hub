ALTER TABLE public.music_dna_analyses
  ADD COLUMN IF NOT EXISTS danceability numeric(5,4),
  ADD COLUMN IF NOT EXISTS energy numeric(5,4),
  ADD COLUMN IF NOT EXISTS key_number integer,
  ADD COLUMN IF NOT EXISTS key_name text,
  ADD COLUMN IF NOT EXISTS loudness_db numeric(6,3),
  ADD COLUMN IF NOT EXISTS mode_number integer,
  ADD COLUMN IF NOT EXISTS mode_name text,
  ADD COLUMN IF NOT EXISTS speechiness numeric(5,4),
  ADD COLUMN IF NOT EXISTS acousticness numeric(5,4),
  ADD COLUMN IF NOT EXISTS instrumentalness numeric(5,4),
  ADD COLUMN IF NOT EXISTS liveness numeric(5,4),
  ADD COLUMN IF NOT EXISTS valence numeric(5,4),
  ADD COLUMN IF NOT EXISTS tempo_bpm numeric(6,2),
  ADD COLUMN IF NOT EXISTS duration_ms integer,
  ADD COLUMN IF NOT EXISTS time_signature integer,
  ADD COLUMN IF NOT EXISTS lufs_integrated numeric(6,2),
  ADD COLUMN IF NOT EXISTS dynamic_range_db numeric(5,2),
  ADD COLUMN IF NOT EXISTS fonte_analise text DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS mbid text,
  ADD COLUMN IF NOT EXISTS isrc text,
  ADD COLUMN IF NOT EXISTS deezer_id bigint,
  ADD COLUMN IF NOT EXISTS spotify_id text;

CREATE TABLE IF NOT EXISTS public.music_dna_benchmarks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  genero text NOT NULL UNIQUE,
  total_faixas integer DEFAULT 0,
  avg_danceability numeric(5,4),
  avg_energy numeric(5,4),
  avg_loudness_db numeric(6,3),
  avg_speechiness numeric(5,4),
  avg_acousticness numeric(5,4),
  avg_instrumentalness numeric(5,4),
  avg_liveness numeric(5,4),
  avg_valence numeric(5,4),
  avg_tempo_bpm numeric(6,2),
  avg_lufs numeric(6,2),
  top_keys jsonb DEFAULT '{}',
  atualizado_em timestamptz DEFAULT now()
);

ALTER TABLE public.music_dna_benchmarks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'music_dna_benchmarks'
      AND policyname = 'Benchmarks são públicos'
  ) THEN
    CREATE POLICY "Benchmarks são públicos"
      ON public.music_dna_benchmarks
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'music_dna_benchmarks'
      AND policyname = 'Apenas administradores gerenciam benchmarks'
  ) THEN
    CREATE POLICY "Apenas administradores gerenciam benchmarks"
      ON public.music_dna_benchmarks
      FOR ALL
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;