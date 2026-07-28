create extension if not exists pgcrypto;

create table if not exists public.game_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  visibility text not null default 'private' check (visibility in ('private', 'public', 'assigned')),
  status text not null default 'active' check (status in ('active', 'archived')),
  team1_name text not null default 'Team 1',
  team2_name text not null default 'Team 2',
  event_title text not null default 'GABEKROSS FAMILY FEUD',
  event_footer_text text not null default 'Powered by Gabekross',
  show_event_footer boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_template_questions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.game_templates(id) on delete cascade,
  round_number integer not null,
  question_id uuid not null references public.questions(id) on delete restrict,
  fm_index integer,
  sort_order integer not null default 0,
  unique (template_id, round_number, fm_index)
);

create table if not exists public.game_template_assignments (
  template_id uuid not null references public.game_templates(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (template_id, user_id)
);

alter table public.game_templates enable row level security;
alter table public.game_template_questions enable row level security;
alter table public.game_template_assignments enable row level security;

do $$
begin
  drop policy if exists "Users can read available templates" on public.game_templates;
  create policy "Users can read available templates"
    on public.game_templates
    for select
    to authenticated
    using (
      status = 'active'
      and (
        visibility = 'public'
        or created_by = auth.uid()
        or public.is_platform_admin()
        or exists (
          select 1
          from public.game_template_assignments gta
          where gta.template_id = id
            and gta.user_id = auth.uid()
        )
      )
    );

  drop policy if exists "Admins can manage templates" on public.game_templates;
  create policy "Admins can manage templates"
    on public.game_templates
    for all
    to authenticated
    using (public.is_platform_admin())
    with check (public.is_platform_admin());

  drop policy if exists "Users can read available template questions" on public.game_template_questions;
  create policy "Users can read available template questions"
    on public.game_template_questions
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.game_templates gt
        where gt.id = template_id
          and gt.status = 'active'
          and (
            gt.visibility = 'public'
            or gt.created_by = auth.uid()
            or public.is_platform_admin()
            or exists (
              select 1
              from public.game_template_assignments gta
              where gta.template_id = gt.id
                and gta.user_id = auth.uid()
            )
          )
      )
    );

  drop policy if exists "Admins can manage template questions" on public.game_template_questions;
  create policy "Admins can manage template questions"
    on public.game_template_questions
    for all
    to authenticated
    using (public.is_platform_admin())
    with check (public.is_platform_admin());

  drop policy if exists "Users can read own template assignments" on public.game_template_assignments;
  create policy "Users can read own template assignments"
    on public.game_template_assignments
    for select
    to authenticated
    using (user_id = auth.uid() or public.is_platform_admin());

  drop policy if exists "Admins can manage template assignments" on public.game_template_assignments;
  create policy "Admins can manage template assignments"
    on public.game_template_assignments
    for all
    to authenticated
    using (public.is_platform_admin())
    with check (public.is_platform_admin());
end $$;
