create table if not exists public.session_answer_states (
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  answer_id uuid not null references public.answers(id) on delete cascade,
  revealed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, answer_id)
);

create index if not exists session_answer_states_answer_id_idx
  on public.session_answer_states(answer_id);

alter table public.session_answer_states enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'session_answer_states'
      and policyname = 'Allow anonymous session answer state reads'
  ) then
    create policy "Allow anonymous session answer state reads"
      on public.session_answer_states
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'session_answer_states'
      and policyname = 'Allow anonymous session answer state inserts'
  ) then
    create policy "Allow anonymous session answer state inserts"
      on public.session_answer_states
      for insert
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'session_answer_states'
      and policyname = 'Allow anonymous session answer state updates'
  ) then
    create policy "Allow anonymous session answer state updates"
      on public.session_answer_states
      for update
      using (true)
      with check (true);
  end if;
end $$;
