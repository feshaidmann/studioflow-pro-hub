-- Pre-release bookmark support for playlist_monitors.
-- Allows artists to save a playlist as a reference before their track is on Spotify.
-- When the track is published, they can add the URI to activate live monitoring.

-- 1. Make track_spotify_uri nullable (was NOT NULL)
ALTER TABLE public.playlist_monitors
  ALTER COLUMN track_spotify_uri DROP NOT NULL;

-- 2. Extend status CHECK to include 'bookmarked'
ALTER TABLE public.playlist_monitors
  DROP CONSTRAINT IF EXISTS playlist_monitors_status_check;

ALTER TABLE public.playlist_monitors
  ADD CONSTRAINT playlist_monitors_status_check
    CHECK (status IN ('monitoring', 'found', 'bookmarked'));

-- 3. Prevent duplicate bookmarks for the same (user, playlist) when no URI is set.
--    The existing unique index on (user_id, playlist_id, track_spotify_uri) already
--    handles the case when track_spotify_uri is NOT NULL (PostgreSQL treats NULL as
--    distinct in indexes so we need a separate partial index for the NULL case).
CREATE UNIQUE INDEX IF NOT EXISTS playlist_monitors_bookmark_idx
  ON public.playlist_monitors (user_id, playlist_id)
  WHERE track_spotify_uri IS NULL;
