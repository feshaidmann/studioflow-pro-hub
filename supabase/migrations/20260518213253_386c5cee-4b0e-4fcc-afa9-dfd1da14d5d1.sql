
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_captador boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS captador_verificado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS captador_palco_tipos text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS captador_generos text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS captador_regioes text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS captador_porte text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS captador_taxa text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_profiles_captador_palco_tipos ON public.profiles USING GIN (captador_palco_tipos);
CREATE INDEX IF NOT EXISTS idx_profiles_captador_generos ON public.profiles USING GIN (captador_generos);
CREATE INDEX IF NOT EXISTS idx_profiles_captador_regioes ON public.profiles USING GIN (captador_regioes);
CREATE INDEX IF NOT EXISTS idx_profiles_is_captador ON public.profiles (is_captador) WHERE is_captador = true;
