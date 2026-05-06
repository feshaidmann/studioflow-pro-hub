CREATE TABLE public.analytics_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  event_name text NOT NULL,
  project_id uuid,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  session_id text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_events_event_created ON public.analytics_events (event_name, created_at DESC);
CREATE INDEX idx_analytics_events_user_created ON public.analytics_events (user_id, created_at DESC);
CREATE INDEX idx_analytics_events_project ON public.analytics_events (project_id);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own analytics events"
  ON public.analytics_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all analytics events"
  ON public.analytics_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.analytics_funnel_daily
WITH (security_invoker = true)
AS
SELECT
  date_trunc('day', created_at)::date AS day,
  event_name,
  COUNT(*)::bigint AS total,
  COUNT(DISTINCT user_id)::bigint AS unique_users
FROM public.analytics_events
GROUP BY 1, 2
ORDER BY 1 DESC, 2;