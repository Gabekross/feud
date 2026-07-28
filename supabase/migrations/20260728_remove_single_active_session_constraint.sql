do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'one_active_game_session_only'
      and conrelid = 'public.game_sessions'::regclass
  ) then
    alter table public.game_sessions
      drop constraint one_active_game_session_only;
  end if;
end $$;

drop index if exists public.one_active_game_session_only;
