alter table public.session_questions
add column if not exists score_finalized boolean not null default false;
