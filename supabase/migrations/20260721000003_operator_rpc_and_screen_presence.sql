create table if not exists public.screen_presence (
  session_id uuid primary key references public.game_sessions(id) on delete cascade,
  screen_name text not null default 'main_screen',
  last_seen timestamptz not null default now()
);

alter table public.screen_presence enable row level security;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'screen_presence'
    )
  then
    alter publication supabase_realtime add table public.screen_presence;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'screen_presence'
      and policyname = 'Allow anonymous screen presence reads'
  ) then
    create policy "Allow anonymous screen presence reads"
      on public.screen_presence
      for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'screen_presence'
      and policyname = 'Allow anonymous screen presence inserts'
  ) then
    create policy "Allow anonymous screen presence inserts"
      on public.screen_presence
      for insert
      to anon
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'screen_presence'
      and policyname = 'Allow anonymous screen presence updates'
  ) then
    create policy "Allow anonymous screen presence updates"
      on public.screen_presence
      for update
      to anon
      using (true)
      with check (true);
  end if;
end $$;

create or replace function public.adjust_team_score(
  p_session_id uuid,
  p_team integer,
  p_delta integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_score integer;
begin
  if p_team = 1 then
    update public.game_sessions
    set team1_score = greatest(0, coalesce(team1_score, 0) + p_delta)
    where id = p_session_id
    returning team1_score into v_new_score;
  elsif p_team = 2 then
    update public.game_sessions
    set team2_score = greatest(0, coalesce(team2_score, 0) + p_delta)
    where id = p_session_id
    returning team2_score into v_new_score;
  else
    raise exception 'Invalid team %', p_team;
  end if;

  return coalesce(v_new_score, 0);
end;
$$;
