alter table public.game_sessions
  add column if not exists rules_mode text not null default 'full',
  add column if not exists rules_step integer not null default 0,
  add column if not exists rules_return_screen_state text not null default 'standby';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'game_sessions_screen_state_check'
  ) then
    alter table public.game_sessions
      drop constraint game_sessions_screen_state_check;
  end if;

  alter table public.game_sessions
    add constraint game_sessions_screen_state_check
    check (screen_state in ('standby', 'team_intro', 'fast_money_intro', 'winner', 'board', 'rules'));
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'game_sessions_rules_mode_check'
  ) then
    alter table public.game_sessions
      drop constraint game_sessions_rules_mode_check;
  end if;

  alter table public.game_sessions
    add constraint game_sessions_rules_mode_check
    check (rules_mode in ('full', 'quick'));
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'game_sessions_rules_return_screen_state_check'
  ) then
    alter table public.game_sessions
      drop constraint game_sessions_rules_return_screen_state_check;
  end if;

  alter table public.game_sessions
    add constraint game_sessions_rules_return_screen_state_check
    check (rules_return_screen_state in ('standby', 'team_intro', 'fast_money_intro', 'winner', 'board'));
end $$;
