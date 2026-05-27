-- Vincular análise do Music DNA a uma faixa do catálogo Spotify (1↔1)
ALTER TABLE public.music_dna_analyses
  ADD COLUMN IF NOT EXISTS spotify_track_id uuid
  REFERENCES public.spotify_tracks(id) ON DELETE SET NULL;

-- Garantir 1↔1: uma faixa do catálogo só pode estar vinculada a uma análise
CREATE UNIQUE INDEX IF NOT EXISTS music_dna_analyses_spotify_track_uidx
  ON public.music_dna_analyses (spotify_track_id)
  WHERE spotify_track_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS music_dna_analyses_user_spotify_track_idx
  ON public.music_dna_analyses (user_id, spotify_track_id);