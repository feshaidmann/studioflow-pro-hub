ALTER TABLE public.professional_ratings
  ADD COLUMN IF NOT EXISTS professional_id uuid;

ALTER TABLE public.mix_tracks
  ADD COLUMN IF NOT EXISTS professional_id uuid;

CREATE INDEX IF NOT EXISTS idx_professional_ratings_professional_id
  ON public.professional_ratings(professional_id);

CREATE INDEX IF NOT EXISTS idx_mix_tracks_professional_id
  ON public.mix_tracks(professional_id);

CREATE INDEX IF NOT EXISTS idx_professional_ratings_user_prof
  ON public.professional_ratings(user_id, professional_id);