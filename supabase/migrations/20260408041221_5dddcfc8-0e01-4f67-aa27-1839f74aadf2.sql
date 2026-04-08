ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_moment text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS main_pain text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS onboarding_version integer NOT NULL DEFAULT 1;