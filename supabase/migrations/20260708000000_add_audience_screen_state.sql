alter table public.game_sessions
  add column if not exists screen_state text not null default 'standby';

alter table public.game_sessions
  add column if not exists event_title text not null default 'GABEKROSS FAMILY FEUD';

alter table public.game_sessions
  add column if not exists event_footer_text text not null default 'Powered by Gabekross';

alter table public.game_sessions
  add column if not exists show_event_footer boolean not null default true;

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

  if not exists (
    select 1
    from pg_constraint
    where conname = 'game_sessions_screen_state_check'
  ) then
    alter table public.game_sessions
      add constraint game_sessions_screen_state_check
      check (screen_state in ('standby', 'team_intro', 'fast_money_intro', 'winner', 'board'));
  end if;
end $$;
