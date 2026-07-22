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

create or replace function public.add_strike_atomic(p_session_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_strikes integer;
begin
  update public.game_sessions
  set strikes = least(coalesce(strike_limit, 3), coalesce(strikes, 0) + 1)
  where id = p_session_id
  returning strikes into v_new_strikes;

  return coalesce(v_new_strikes, 0);
end;
$$;

create or replace function public.finalize_round_score(
  p_session_id uuid,
  p_multiplier integer default 1
)
returns table(round_points integer, awarded_points integer, active_team integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question_id uuid;
  v_session_question_id uuid;
  v_active_team integer;
  v_round_points integer;
  v_awarded_points integer;
begin
  if p_multiplier not in (1, 2, 3) then
    raise exception 'Invalid multiplier %', p_multiplier;
  end if;

  select sq.id, sq.question_id
    into v_session_question_id, v_question_id
  from public.session_questions sq
  where sq.session_id = p_session_id
    and sq.is_current = true
  for update;

  if v_session_question_id is null or v_question_id is null then
    raise exception 'No current question to finalize.';
  end if;

  if exists (
    select 1
    from public.session_questions sq
    where sq.id = v_session_question_id
      and sq.score_finalized = true
  ) then
    raise exception 'This round score has already been finalized.';
  end if;

  select coalesce(gs.active_team, 1)
    into v_active_team
  from public.game_sessions gs
  where gs.id = p_session_id
  for update;

  select coalesce(sum(coalesce(a.points, 0)), 0)::integer
    into v_round_points
  from public.answers a
  where a.question_id = v_question_id
    and a.revealed = true;

  v_awarded_points := v_round_points * p_multiplier;

  if v_active_team = 1 then
    update public.game_sessions
    set team1_score = coalesce(team1_score, 0) + v_awarded_points
    where id = p_session_id;
  elsif v_active_team = 2 then
    update public.game_sessions
    set team2_score = coalesce(team2_score, 0) + v_awarded_points
    where id = p_session_id;
  else
    raise exception 'Invalid active team %', v_active_team;
  end if;

  update public.session_questions
  set score_finalized = true
  where id = v_session_question_id;

  round_points := v_round_points;
  awarded_points := v_awarded_points;
  active_team := v_active_team;
  return next;
end;
$$;

grant execute on function public.adjust_team_score(uuid, integer, integer) to anon;
grant execute on function public.add_strike_atomic(uuid) to anon;
grant execute on function public.finalize_round_score(uuid, integer) to anon;
