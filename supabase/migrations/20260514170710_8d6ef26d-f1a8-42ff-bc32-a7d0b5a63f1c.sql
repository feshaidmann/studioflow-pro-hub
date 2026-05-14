ALTER TABLE public.visual_briefings
  ADD COLUMN IF NOT EXISTS current_step text NOT NULL DEFAULT 'profile';

ALTER TABLE public.visual_briefings
  DROP CONSTRAINT IF EXISTS visual_briefings_current_step_check;

ALTER TABLE public.visual_briefings
  ADD CONSTRAINT visual_briefings_current_step_check
  CHECK (current_step IN ('profile','generation','review','briefing'));