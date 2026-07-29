alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.events;
alter table public.notifications replica identity full;
alter table public.events replica identity full;