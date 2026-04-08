
-- Create project_messages table
CREATE TABLE public.project_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

-- Read: project owner OR the sender themselves
CREATE POLICY "Members can read project messages"
  ON public.project_messages
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_messages.project_id
        AND user_id = auth.uid()
    )
  );

-- Write: authenticated user inserts own messages
CREATE POLICY "Members can send project messages"
  ON public.project_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_messages;
