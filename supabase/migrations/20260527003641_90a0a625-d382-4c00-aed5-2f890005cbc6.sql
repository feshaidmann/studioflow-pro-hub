
CREATE TABLE public.spotify_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  spotify_album_id text NOT NULL,
  spotify_album_uri text,
  name text NOT NULL,
  release_type text NOT NULL DEFAULT 'album',
  release_date date,
  image_url text,
  total_tracks integer,
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX spotify_releases_user_album_uidx
  ON public.spotify_releases (user_id, spotify_album_id);
CREATE INDEX spotify_releases_user_idx
  ON public.spotify_releases (user_id, release_date DESC NULLS LAST);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spotify_releases TO authenticated;
GRANT ALL ON public.spotify_releases TO service_role;

ALTER TABLE public.spotify_releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own spotify_releases"
  ON public.spotify_releases FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own spotify_releases"
  ON public.spotify_releases FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own spotify_releases"
  ON public.spotify_releases FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users delete own spotify_releases"
  ON public.spotify_releases FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.spotify_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  release_id uuid NOT NULL REFERENCES public.spotify_releases(id) ON DELETE CASCADE,
  spotify_track_id text NOT NULL,
  spotify_track_uri text NOT NULL,
  name text NOT NULL,
  track_number integer,
  duration_ms integer,
  isrc text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX spotify_tracks_user_track_uidx
  ON public.spotify_tracks (user_id, spotify_track_id);
CREATE INDEX spotify_tracks_user_uri_idx
  ON public.spotify_tracks (user_id, spotify_track_uri);
CREATE INDEX spotify_tracks_release_idx
  ON public.spotify_tracks (release_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spotify_tracks TO authenticated;
GRANT ALL ON public.spotify_tracks TO service_role;

ALTER TABLE public.spotify_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own spotify_tracks"
  ON public.spotify_tracks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own spotify_tracks"
  ON public.spotify_tracks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own spotify_tracks"
  ON public.spotify_tracks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users delete own spotify_tracks"
  ON public.spotify_tracks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
