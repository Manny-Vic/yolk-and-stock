CREATE TABLE public.pos_state (
  owner_id uuid PRIMARY KEY,
  data jsonb NOT NULL,
  client_id text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_state TO authenticated;
GRANT ALL ON public.pos_state TO service_role;
ALTER TABLE public.pos_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own POS data" ON public.pos_state FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner inserts own POS data" ON public.pos_state FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner updates own POS data" ON public.pos_state FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner deletes own POS data" ON public.pos_state FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE public.pos_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pos_backups_owner_idx ON public.pos_backups(owner_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.pos_backups TO authenticated;
GRANT ALL ON public.pos_backups TO service_role;
ALTER TABLE public.pos_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own backups" ON public.pos_backups FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner inserts own backups" ON public.pos_backups FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner deletes own backups" ON public.pos_backups FOR DELETE TO authenticated USING (auth.uid() = owner_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_state;