alter table public.game_sessions
  add column if not exists fm_player1_name text not null default 'Player 1';

alter table public.game_sessions
  add column if not exists fm_player2_name text not null default 'Player 2';
