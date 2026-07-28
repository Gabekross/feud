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
