create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'host' check (role in ('admin', 'host')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

alter table public.game_sessions
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists game_sessions_owner_user_id_idx
  on public.game_sessions(owner_user_id);

create or replace function public.is_platform_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_user_id
      and role = 'admin'
  );
$$;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_count integer;
begin
  select count(*) into profile_count from public.profiles;

  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when profile_count = 0 then 'admin' else 'host' end
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

with ranked_users as (
  select
    id,
    email,
    row_number() over (order by created_at asc) as user_rank
  from auth.users
)
insert into public.profiles (id, email, role)
select
  id,
  email,
  case
    when not exists (select 1 from public.profiles) and user_rank = 1 then 'admin'
    else 'host'
  end
from ranked_users
on conflict (id) do nothing;

do $$
begin
  drop policy if exists "Profiles are readable by signed in users" on public.profiles;
  create policy "Profiles are readable by signed in users"
    on public.profiles
    for select
    to authenticated
    using (true);

  drop policy if exists "Admins can update profiles" on public.profiles;
  create policy "Admins can update profiles"
    on public.profiles
    for update
    to authenticated
    using (public.is_platform_admin())
    with check (public.is_platform_admin());
end $$;

do $$
begin
  drop policy if exists "Allow anonymous question updates" on public.questions;
  drop policy if exists "Allow anonymous answer inserts" on public.answers;
  drop policy if exists "Allow anonymous answer deletes" on public.answers;

  drop policy if exists "Authenticated users can read questions" on public.questions;
  create policy "Authenticated users can read questions"
    on public.questions
    for select
    using (true);

  drop policy if exists "Admins can insert questions" on public.questions;
  create policy "Admins can insert questions"
    on public.questions
    for insert
    to authenticated
    with check (public.is_platform_admin());

  drop policy if exists "Admins can update questions" on public.questions;
  create policy "Admins can update questions"
    on public.questions
    for update
    to authenticated
    using (public.is_platform_admin())
    with check (public.is_platform_admin());

  drop policy if exists "Admins can delete questions" on public.questions;
  create policy "Admins can delete questions"
    on public.questions
    for delete
    to authenticated
    using (public.is_platform_admin());

  drop policy if exists "Authenticated users can read answers" on public.answers;
  create policy "Authenticated users can read answers"
    on public.answers
    for select
    using (true);

  drop policy if exists "Admins can insert answers" on public.answers;
  create policy "Admins can insert answers"
    on public.answers
    for insert
    to authenticated
    with check (public.is_platform_admin());

  drop policy if exists "Admins can update answers" on public.answers;
  create policy "Admins can update answers"
    on public.answers
    for update
    to authenticated
    using (public.is_platform_admin())
    with check (public.is_platform_admin());

  drop policy if exists "Admins can delete answers" on public.answers;
  create policy "Admins can delete answers"
    on public.answers
    for delete
    to authenticated
    using (public.is_platform_admin());
end $$;
