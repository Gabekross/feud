alter table public.game_sessions enable row level security;
alter table public.session_questions enable row level security;

do $$
begin
  drop policy if exists "Anyone can read game sessions" on public.game_sessions;
  create policy "Anyone can read game sessions"
    on public.game_sessions
    for select
    using (true);

  drop policy if exists "Authenticated users can create game sessions" on public.game_sessions;
  create policy "Authenticated users can create game sessions"
    on public.game_sessions
    for insert
    to authenticated
    with check (
      owner_user_id = auth.uid()
      or created_by = auth.uid()
      or public.is_platform_admin()
    );

  drop policy if exists "Anyone can update game sessions" on public.game_sessions;
  create policy "Anyone can update game sessions"
    on public.game_sessions
    for update
    using (true)
    with check (true);

  drop policy if exists "Owners and admins can delete game sessions" on public.game_sessions;
  create policy "Owners and admins can delete game sessions"
    on public.game_sessions
    for delete
    to authenticated
    using (
      owner_user_id = auth.uid()
      or public.is_platform_admin()
    );
end $$;

do $$
begin
  drop policy if exists "Anyone can read session questions" on public.session_questions;
  create policy "Anyone can read session questions"
    on public.session_questions
    for select
    using (true);

  drop policy if exists "Owners and admins can insert session questions" on public.session_questions;
  create policy "Owners and admins can insert session questions"
    on public.session_questions
    for insert
    to authenticated
    with check (
      exists (
        select 1
        from public.game_sessions
        where id = session_id
          and (
            owner_user_id = auth.uid()
            or public.is_platform_admin()
          )
      )
    );

  drop policy if exists "Anyone can update session questions" on public.session_questions;
  create policy "Anyone can update session questions"
    on public.session_questions
    for update
    using (true)
    with check (true);

  drop policy if exists "Owners and admins can delete session questions" on public.session_questions;
  create policy "Owners and admins can delete session questions"
    on public.session_questions
    for delete
    to authenticated
    using (
      exists (
        select 1
        from public.game_sessions
        where id = session_id
          and (
            owner_user_id = auth.uid()
            or public.is_platform_admin()
          )
      )
    );
end $$;
