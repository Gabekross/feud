alter table public.session_questions
  add column if not exists round_base_points integer not null default 0,
  add column if not exists round_multiplier integer not null default 1,
  add column if not exists round_awarded_points integer not null default 0,
  add column if not exists round_awarded_team integer,
  add column if not exists score_finalized_at timestamptz;

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
  v_round_number integer;
  v_active_team integer;
  v_round_points integer;
  v_awarded_points integer;
  v_revealed_count integer;
begin
  if p_multiplier not in (1, 2, 3) then
    raise exception 'Invalid multiplier %', p_multiplier;
  end if;

  select sq.id, sq.question_id, sq.round_number
    into v_session_question_id, v_question_id, v_round_number
  from public.session_questions sq
  where sq.session_id = p_session_id
    and sq.is_current = true
  for update;

  if v_session_question_id is null or v_question_id is null then
    raise exception 'No current question to finalize.';
  end if;

  if v_round_number = 6 then
    raise exception 'Fast Money is not scored with regular-round finalization.';
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

  select
    coalesce(sum(coalesce(a.points, 0)), 0)::integer,
    count(*)::integer
    into v_round_points, v_revealed_count
  from public.session_answer_states sas
  join public.answers a on a.id = sas.answer_id
  where sas.session_id = p_session_id
    and sas.revealed = true
    and a.question_id = v_question_id;

  if v_revealed_count = 0 then
    raise exception 'Reveal at least one answer before finalizing the round.';
  end if;

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
  set
    score_finalized = true,
    round_base_points = v_round_points,
    round_multiplier = p_multiplier,
    round_awarded_points = v_awarded_points,
    round_awarded_team = v_active_team,
    score_finalized_at = now()
  where id = v_session_question_id;

  round_points := v_round_points;
  awarded_points := v_awarded_points;
  active_team := v_active_team;
  return next;
end;
$$;
