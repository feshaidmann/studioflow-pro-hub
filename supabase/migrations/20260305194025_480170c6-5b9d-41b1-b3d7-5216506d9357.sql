
-- Migration 1: tasks table
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  due_date date,
  completed boolean NOT NULL DEFAULT false,
  auto_generated boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Migration 2: track_templates + template_tracks
CREATE TABLE public.track_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.track_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own templates" ON public.track_templates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.template_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.track_templates(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0
);
ALTER TABLE public.template_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own template_tracks" ON public.template_tracks FOR ALL
  USING (EXISTS (SELECT 1 FROM public.track_templates WHERE id = template_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.track_templates WHERE id = template_id AND user_id = auth.uid()));

-- Migration 3: notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  type text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Migration 4: profiles + transactions additions
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS track_view_mode text NOT NULL DEFAULT 'basic';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT true;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS track_id text;
