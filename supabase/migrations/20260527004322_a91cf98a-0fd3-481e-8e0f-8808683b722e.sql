
CREATE TABLE public.playlist_monitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  playlist_id text NOT NULL,
  playlist_name text NOT NULL,
  playlist_image_url text,
  playlist_external_url text,
  playlist_owner_name text,
  track_spotify_uri text NOT NULL,
  track_name text NOT NULL,
  status text NOT NULL DEFAULT 'monitoring' CHECK (status IN ('monitoring','found')),
  found_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX playlist_monitors_unique_idx
  ON public.playlist_monitors (user_id, playlist_id, track_spotify_uri);

CREATE INDEX playlist_monitors_user_status_idx
  ON public.playlist_monitors (user_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.playlist_monitors TO authenticated;
GRANT ALL ON public.playlist_monitors TO service_role;

ALTER TABLE public.playlist_monitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own playlist_monitors"
  ON public.playlist_monitors
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
