alter publication supabase_realtime add table public.tasks;
alter table public.tasks replica identity full;