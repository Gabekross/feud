create table if not exists public.sound_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  sound_type text not null,
  command text not null,
  track_id text,
  src text,
  seek_time numeric,
  volume numeric,
  playback_rate numeric,
  loop boolean,
  created_at timestamptz not null default now()
);

alter table public.sound_events enable row level security;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'sound_events'
    )
  then
    alter publication supabase_realtime add table public.sound_events;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sound_events'
      and policyname = 'Allow anonymous sound event reads'
  ) then
    create policy "Allow anonymous sound event reads"
      on public.sound_events
      for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sound_events'
      and policyname = 'Allow anonymous sound event inserts'
  ) then
    create policy "Allow anonymous sound event inserts"
      on public.sound_events
      for insert
      to anon
      with check (true);
  end if;
end $$;
