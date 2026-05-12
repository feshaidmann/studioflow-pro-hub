CREATE TABLE IF NOT EXISTS public.music_external_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_key text NOT NULL,
  track_key text NOT NULL,
  mbid text,
  deezer_id bigint,
  deezer_preview_url text,
  deezer_cover_url text,
  musicbrainz_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  listenbrainz_similar jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artist_key, track_key)
);

CREATE INDEX IF NOT EXISTS idx_mem_artist_track ON public.music_external_metadata (artist_key, track_key);

ALTER TABLE public.music_external_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read external metadata"
  ON public.music_external_metadata
  FOR SELECT
  TO authenticated
  USING (true);
