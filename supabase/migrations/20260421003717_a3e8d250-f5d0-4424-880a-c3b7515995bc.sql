CREATE TABLE public.creative_captions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NULL,
  track_name TEXT NOT NULL DEFAULT '',
  artist_name TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'Instagram Feed',
  campaign_phase TEXT NOT NULL DEFAULT 'lançamento',
  objective TEXT NOT NULL DEFAULT 'ouvir agora',
  tone TEXT NOT NULL DEFAULT 'autêntico',
  length TEXT NOT NULL DEFAULT 'médio',
  hashtags_mode TEXT NOT NULL DEFAULT 'poucas',
  prompt TEXT NOT NULL DEFAULT '',
  dna_context TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.creative_captions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own creative captions"
ON public.creative_captions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own creative captions"
ON public.creative_captions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own creative captions"
ON public.creative_captions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own creative captions"
ON public.creative_captions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_creative_captions_user_created_at
ON public.creative_captions (user_id, created_at DESC);

CREATE INDEX idx_creative_captions_project_id
ON public.creative_captions (project_id)
WHERE project_id IS NOT NULL;

CREATE TRIGGER update_creative_captions_updated_at
BEFORE UPDATE ON public.creative_captions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();