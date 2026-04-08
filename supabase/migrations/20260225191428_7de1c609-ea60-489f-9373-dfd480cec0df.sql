
CREATE TABLE public.mix_tracks (
  id            text        PRIMARY KEY,
  project_id    uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL,
  name          text        NOT NULL DEFAULT '',
  high_pass_hz  integer     NOT NULL DEFAULT 80,
  eq_notes      text        NOT NULL DEFAULT '',
  comp_gr_db    numeric     NOT NULL DEFAULT 0,
  sidechain_trigger text    NOT NULL DEFAULT '—',
  gain_dbfs     numeric     NOT NULL DEFAULT 0,
  done          boolean     NOT NULL DEFAULT false,
  track_source  text        NOT NULL DEFAULT '',
  musician_id   text        NOT NULL DEFAULT '',
  musician_fee  numeric     NOT NULL DEFAULT 0,
  fee_paid      boolean     NOT NULL DEFAULT false,
  position      integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mix_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mix_tracks"
  ON public.mix_tracks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mix_tracks"
  ON public.mix_tracks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mix_tracks"
  ON public.mix_tracks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mix_tracks"
  ON public.mix_tracks FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_mix_tracks_updated_at
  BEFORE UPDATE ON public.mix_tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
