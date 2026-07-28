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
