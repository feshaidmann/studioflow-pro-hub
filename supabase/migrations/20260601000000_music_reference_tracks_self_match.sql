-- ============================================================
-- Migration: music_reference_tracks + find_nearest_reference_tracks
-- + seed data + self-match validation (similarity >= 0.70)
-- ============================================================

-- 1. Prerequisites: app_role type, user_roles, has_role
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- 2. music_reference_tracks table (inclui coluna quarantined)
CREATE TABLE IF NOT EXISTS public.music_reference_tracks (
  id               uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  band             text        NOT NULL,
  filename         text        NOT NULL,
  genre            text        NOT NULL DEFAULT '',
  source_batch     text        NOT NULL DEFAULT '',
  analysis_date    timestamptz,
  duration_sec     numeric,
  tempo_bpm        numeric,
  tempo_confidence numeric,
  key_index        integer,
  key_name         text,
  mode             text,
  danceability     numeric,
  energy           numeric,
  loudness_rms_db  numeric,
  lufs_integrated  numeric,
  lufs_method      text,
  dynamic_range_db numeric,
  speechiness      numeric,
  acousticness     numeric,
  instrumentalness numeric,
  liveness         numeric,
  valence          numeric,
  spectral_centroid   numeric,
  spectral_bandwidth  numeric,
  spectral_rolloff    numeric,
  spectral_flatness   numeric,
  zero_crossing_rate  numeric,
  spectral_contrast   numeric[],
  mfcc                numeric[],
  chroma_cens         numeric[],
  segments_count   integer,
  beat_times       jsonb NOT NULL DEFAULT '[]'::jsonb,
  quarantined      boolean NOT NULL DEFAULT false,
  quarantine_reason text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT music_reference_tracks_band_filename_unique UNIQUE (band, filename)
);

CREATE INDEX IF NOT EXISTS idx_music_reference_tracks_genre
  ON public.music_reference_tracks (genre);
CREATE INDEX IF NOT EXISTS idx_music_reference_tracks_band
  ON public.music_reference_tracks (band);
CREATE INDEX IF NOT EXISTS idx_music_reference_tracks_batch
  ON public.music_reference_tracks (source_batch);
CREATE INDEX IF NOT EXISTS idx_music_reference_tracks_active
  ON public.music_reference_tracks (genre)
  WHERE quarantined = false;

ALTER TABLE public.music_reference_tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view reference tracks" ON public.music_reference_tracks;
CREATE POLICY "Authenticated users can view reference tracks"
  ON public.music_reference_tracks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert reference tracks" ON public.music_reference_tracks;
CREATE POLICY "Admins can insert reference tracks"
  ON public.music_reference_tracks FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update reference tracks" ON public.music_reference_tracks;
CREATE POLICY "Admins can update reference tracks"
  ON public.music_reference_tracks FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete reference tracks" ON public.music_reference_tracks;
CREATE POLICY "Admins can delete reference tracks"
  ON public.music_reference_tracks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS set_music_reference_tracks_updated_at ON public.music_reference_tracks;
CREATE TRIGGER set_music_reference_tracks_updated_at
  BEFORE UPDATE ON public.music_reference_tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. cosine_similarity_f8: produto escalar / (|a| * |b|)
CREATE OR REPLACE FUNCTION public.cosine_similarity_f8(a float8[], b float8[])
RETURNS float8
LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE SET search_path = public
AS $$
DECLARE
  dot    float8 := 0.0;
  norm_a float8 := 0.0;
  norm_b float8 := 0.0;
  len_a  int;
  len_b  int;
  i      int;
BEGIN
  IF a IS NULL OR b IS NULL THEN RETURN NULL; END IF;
  len_a := array_length(a, 1);
  len_b := array_length(b, 1);
  IF len_a IS NULL OR len_b IS NULL OR len_a <> len_b THEN RETURN NULL; END IF;
  FOR i IN 1..len_a LOOP
    dot    := dot    + a[i] * b[i];
    norm_a := norm_a + a[i] * a[i];
    norm_b := norm_b + b[i] * b[i];
  END LOOP;
  IF norm_a = 0.0 OR norm_b = 0.0 THEN RETURN 0.0; END IF;
  RETURN LEAST(1.0, GREATEST(-1.0, dot / (sqrt(norm_a) * sqrt(norm_b))));
END;
$$;

-- 4. find_nearest_reference_tracks (versão final: MFCC + chroma + filtro quarantined)
DROP FUNCTION IF EXISTS public.find_nearest_reference_tracks(
  numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,
  numeric,numeric,numeric,numeric,numeric,text,integer,boolean,
  numeric,numeric,numeric,numeric,text
);
DROP FUNCTION IF EXISTS public.find_nearest_reference_tracks(
  numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,
  text,integer,boolean,numeric,numeric,numeric,numeric,numeric,numeric,text,text
);

CREATE OR REPLACE FUNCTION public.find_nearest_reference_tracks(
  p_tempo_bpm          numeric  DEFAULT NULL::numeric,
  p_lufs_integrated    numeric  DEFAULT NULL::numeric,
  p_dynamic_range_db   numeric  DEFAULT NULL::numeric,
  p_spectral_centroid  numeric  DEFAULT NULL::numeric,
  p_spectral_flatness  numeric  DEFAULT NULL::numeric,
  p_spectral_rolloff   numeric  DEFAULT NULL::numeric,
  p_spectral_bandwidth numeric  DEFAULT NULL::numeric,
  p_zero_crossing_rate numeric  DEFAULT NULL::numeric,
  p_mfcc               float8[] DEFAULT NULL::float8[],
  p_chroma_cens        float8[] DEFAULT NULL::float8[],
  p_energy             numeric  DEFAULT NULL::numeric,
  p_danceability       numeric  DEFAULT NULL::numeric,
  p_valence            numeric  DEFAULT NULL::numeric,
  p_acousticness       numeric  DEFAULT NULL::numeric,
  p_instrumentalness   numeric  DEFAULT NULL::numeric,
  p_speechiness        numeric  DEFAULT NULL::numeric,
  p_liveness           numeric  DEFAULT NULL::numeric,
  p_key_name           text     DEFAULT NULL::text,
  p_mode               text     DEFAULT NULL::text,
  p_genre              text     DEFAULT NULL::text,
  p_limit              integer  DEFAULT 6,
  p_strict_genre       boolean  DEFAULT false
)
RETURNS TABLE(
  band              text,
  filename          text,
  genre             text,
  tempo_bpm         numeric,
  key_name          text,
  mode              text,
  lufs_integrated   numeric,
  dynamic_range_db  numeric,
  energy            numeric,
  danceability      numeric,
  valence           numeric,
  acousticness      numeric,
  instrumentalness  numeric,
  spectral_centroid numeric,
  speechiness       numeric,
  liveness          numeric,
  spectral_flatness    numeric,
  zero_crossing_rate   numeric,
  similarity_score  numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH d AS (
    SELECT t.*,
      (
        CASE
          WHEN p_mfcc IS NOT NULL AND t.mfcc IS NOT NULL
               AND array_length(p_mfcc, 1) = 13
               AND array_length(t.mfcc::float8[], 1) = 13
          THEN (1.0 - GREATEST(0.0, public.cosine_similarity_f8(p_mfcc, t.mfcc::float8[]))) * 2.5
          ELSE 0.0
        END
        + CASE
            WHEN p_chroma_cens IS NOT NULL AND t.chroma_cens IS NOT NULL
                 AND array_length(p_chroma_cens, 1) = 12
                 AND array_length(t.chroma_cens::float8[], 1) = 12
            THEN (1.0 - GREATEST(0.0, public.cosine_similarity_f8(p_chroma_cens, t.chroma_cens::float8[]))) * 1.5
            ELSE 0.0
          END
        + COALESCE(ABS(t.tempo_bpm - p_tempo_bpm) / 40.0, 0.0) * 1.5
        + COALESCE(ABS(t.lufs_integrated - p_lufs_integrated) / 8.0, 0.0) * 1.5
        + COALESCE(ABS(t.spectral_centroid - p_spectral_centroid) / 2000.0, 0.0) * 1.0
        + COALESCE(ABS(t.dynamic_range_db - p_dynamic_range_db) / 10.0, 0.0) * 0.8
        + COALESCE(ABS(t.spectral_flatness - p_spectral_flatness) * 3.0, 0.0) * 0.5
        + COALESCE(ABS(t.zero_crossing_rate - p_zero_crossing_rate) * 4.0, 0.0) * 0.3
        + COALESCE(ABS(t.spectral_rolloff - p_spectral_rolloff) / 3000.0, 0.0) * 0.3
        + COALESCE(ABS(t.spectral_bandwidth - p_spectral_bandwidth) / 1500.0, 0.0) * 0.2
        + COALESCE(ABS(t.energy - p_energy) * 0.2, 0.0)
        + COALESCE(ABS(t.danceability - p_danceability) * 0.2, 0.0)
        + COALESCE(ABS(t.valence - p_valence) * 0.15, 0.0)
        + COALESCE(ABS(t.acousticness - p_acousticness) * 0.15, 0.0)
        + COALESCE(ABS(t.instrumentalness - p_instrumentalness) * 0.1, 0.0)
        + COALESCE(ABS(t.speechiness - p_speechiness) * 0.2, 0.0)
        + COALESCE(ABS(t.liveness - p_liveness) * 0.15, 0.0)
      )
      *
      CASE
        WHEN p_key_name IS NOT NULL AND p_mode IS NOT NULL
             AND t.key_name = p_key_name AND t.mode = p_mode THEN 0.80
        WHEN p_key_name IS NOT NULL AND t.key_name = p_key_name THEN 0.90
        ELSE 1.0
      END
      *
      CASE WHEN p_genre IS NOT NULL AND t.genre ILIKE p_genre THEN 0.70 ELSE 1.0 END
      AS total_distance
    FROM public.music_reference_tracks t
    WHERE t.quarantined = false
      AND (
        t.mfcc IS NOT NULL
        OR (t.lufs_integrated IS NOT NULL
            AND t.spectral_centroid IS NOT NULL
            AND t.dynamic_range_db IS NOT NULL)
      )
      AND (NOT p_strict_genre OR p_genre IS NULL OR t.genre ILIKE p_genre)
  )
  SELECT
    d.band, d.filename, d.genre, d.tempo_bpm, d.key_name, d.mode,
    d.lufs_integrated, d.dynamic_range_db, d.energy, d.danceability,
    d.valence, d.acousticness, d.instrumentalness, d.spectral_centroid,
    d.speechiness, d.liveness, d.spectral_flatness, d.zero_crossing_rate,
    ROUND((1.0 / (1.0 + GREATEST(d.total_distance, 0.0)))::numeric, 4) AS similarity_score
  FROM d
  ORDER BY d.total_distance ASC
  LIMIT GREATEST(p_limit, 1);
$function$;

-- 5. Seed track para o self-match test
INSERT INTO public.music_reference_tracks (
  band, filename, genre, source_batch,
  tempo_bpm, key_name, mode,
  lufs_integrated, dynamic_range_db,
  energy, danceability, valence, acousticness, instrumentalness, speechiness, liveness,
  spectral_centroid, spectral_bandwidth, spectral_rolloff, spectral_flatness, zero_crossing_rate,
  mfcc,
  chroma_cens,
  quarantined
) VALUES (
  'Seed Artist', 'seed_track.mp3', 'MPB', 'self_match_test',
  120.0, 'C', 'major',
  -14.0, 8.0,
  0.75, 0.70, 0.60, 0.20, 0.01, 0.05, 0.10,
  2400.0, 1800.0, 6000.0, 0.08, 0.06,
  ARRAY[1.0,2.0,3.0,4.0,5.0,6.0,7.0,8.0,9.0,10.0,11.0,12.0,13.0]::numeric[],
  ARRAY[0.5,0.6,0.7,0.8,0.9,1.0,0.9,0.8,0.7,0.6,0.5,0.4]::numeric[],
  false
)
ON CONFLICT (band, filename) DO UPDATE SET
  genre            = EXCLUDED.genre,
  source_batch     = EXCLUDED.source_batch,
  tempo_bpm        = EXCLUDED.tempo_bpm,
  key_name         = EXCLUDED.key_name,
  mode             = EXCLUDED.mode,
  lufs_integrated  = EXCLUDED.lufs_integrated,
  dynamic_range_db = EXCLUDED.dynamic_range_db,
  energy           = EXCLUDED.energy,
  danceability     = EXCLUDED.danceability,
  valence          = EXCLUDED.valence,
  acousticness     = EXCLUDED.acousticness,
  instrumentalness = EXCLUDED.instrumentalness,
  speechiness      = EXCLUDED.speechiness,
  liveness         = EXCLUDED.liveness,
  spectral_centroid   = EXCLUDED.spectral_centroid,
  spectral_bandwidth  = EXCLUDED.spectral_bandwidth,
  spectral_rolloff    = EXCLUDED.spectral_rolloff,
  spectral_flatness   = EXCLUDED.spectral_flatness,
  zero_crossing_rate  = EXCLUDED.zero_crossing_rate,
  mfcc             = EXCLUDED.mfcc,
  chroma_cens      = EXCLUDED.chroma_cens,
  quarantined      = false,
  updated_at       = now();

-- 6. Self-match validation: a faixa que está no banco deve retornar similaridade >= 0.70
DO $$
DECLARE
  v_score    numeric;
  v_band     text;
  v_filename text;
BEGIN
  SELECT similarity_score, band, filename
    INTO v_score, v_band, v_filename
    FROM public.find_nearest_reference_tracks(
      p_tempo_bpm          := 120.0,
      p_lufs_integrated    := -14.0,
      p_dynamic_range_db   := 8.0,
      p_spectral_centroid  := 2400.0,
      p_spectral_flatness  := 0.08,
      p_spectral_rolloff   := 6000.0,
      p_spectral_bandwidth := 1800.0,
      p_zero_crossing_rate := 0.06,
      p_mfcc               := ARRAY[1.0,2.0,3.0,4.0,5.0,6.0,7.0,8.0,9.0,10.0,11.0,12.0,13.0]::float8[],
      p_chroma_cens        := ARRAY[0.5,0.6,0.7,0.8,0.9,1.0,0.9,0.8,0.7,0.6,0.5,0.4]::float8[],
      p_energy             := 0.75,
      p_danceability       := 0.70,
      p_valence            := 0.60,
      p_acousticness       := 0.20,
      p_instrumentalness   := 0.01,
      p_speechiness        := 0.05,
      p_liveness           := 0.10,
      p_key_name           := 'C',
      p_mode               := 'major',
      p_genre              := 'MPB',
      p_limit              := 1
    )
   LIMIT 1;

  IF v_score IS NULL THEN
    RAISE EXCEPTION 'Self-match FAILED: nenhum resultado retornado (verifique seed e filtros)';
  END IF;

  IF v_score < 0.70 THEN
    RAISE EXCEPTION 'Self-match FAILED: similarity = % (esperado >= 0.70) para %/%',
      v_score, v_band, v_filename;
  END IF;

  RAISE NOTICE 'Self-match PASSED: similarity = % para %/%', v_score, v_band, v_filename;
END $$;
