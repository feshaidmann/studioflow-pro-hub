
CREATE TABLE public.task_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rule_type text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  parameters jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, rule_type)
);

ALTER TABLE public.task_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own task_rules"
  ON public.task_rules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
