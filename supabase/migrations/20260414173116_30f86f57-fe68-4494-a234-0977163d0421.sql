CREATE TABLE public.editais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  orgao text DEFAULT '',
  estado text DEFAULT '',
  area text DEFAULT '',
  status text DEFAULT 'Indefinido',
  abertura date,
  prazo date,
  link text DEFAULT '',
  origem_url text DEFAULT '',
  inferido boolean DEFAULT false,
  session_key text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.editais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own editais"
  ON public.editais FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own editais"
  ON public.editais FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own editais"
  ON public.editais FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own editais"
  ON public.editais FOR DELETE
  USING (auth.uid() = user_id);

CREATE UNIQUE INDEX idx_editais_user_session_key
  ON public.editais (user_id, session_key)
  WHERE session_key != '';