create extension if not exists pgcrypto;

alter table public.game_sessions
  add column if not exists operator_token text,
  add column if not exists screen_token text,
  add column if not exists audio_token text,
  add column if not exists cards_token text;

update public.game_sessions
set
  operator_token = coalesce(operator_token, encode(gen_random_bytes(18), 'hex')),
  screen_token = coalesce(screen_token, encode(gen_random_bytes(18), 'hex')),
  audio_token = coalesce(audio_token, encode(gen_random_bytes(18), 'hex')),
  cards_token = coalesce(cards_token, encode(gen_random_bytes(18), 'hex'));
