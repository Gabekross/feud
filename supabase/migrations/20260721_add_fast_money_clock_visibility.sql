alter table public.game_sessions
add column if not exists fm_show_clock boolean not null default true;
