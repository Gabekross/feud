create table public.game_categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  is_public boolean not null default false,
  source_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index game_categories_owner_slug_key
  on public.game_categories (coalesce(owner_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

create table public.game_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.game_categories(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  answer text not null check (char_length(trim(answer)) between 1 and 160),
  image_path text not null,
  image_url text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  source_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index game_items_category_order_idx
  on public.game_items (category_id, sort_order, created_at);

create or replace function public.set_clear_board_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_game_categories_updated_at
before update on public.game_categories
for each row execute function public.set_clear_board_updated_at();

create trigger set_game_items_updated_at
before update on public.game_items
for each row execute function public.set_clear_board_updated_at();

alter table public.game_categories enable row level security;
alter table public.game_items enable row level security;

grant select on public.game_categories, public.game_items to anon;
grant select, insert, update, delete on public.game_categories, public.game_items to authenticated;

create policy "Categories are visible to their owner or everyone"
on public.game_categories for select
using (is_public or owner_id = (select auth.uid()));

create policy "Hosts create private categories and admins may create public categories"
on public.game_categories for insert to authenticated
with check (
  (owner_id = (select auth.uid()) and is_public = false)
  or exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  )
);

create policy "Owners and admins update categories"
on public.game_categories for update to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  )
)
with check (
  (owner_id = (select auth.uid()) and is_public = false)
  or exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  )
);

create policy "Owners and admins delete categories"
on public.game_categories for delete to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  )
);

create policy "Items follow category visibility"
on public.game_items for select
using (
  owner_id = (select auth.uid())
  or exists (
    select 1 from public.game_categories
    where game_categories.id = game_items.category_id
      and game_categories.is_public = true
  )
);

create policy "Owners and admins create items"
on public.game_items for insert to authenticated
with check (
  (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.game_categories
      where game_categories.id = category_id
        and game_categories.owner_id = (select auth.uid())
    )
  )
  or exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  )
);

create policy "Owners and admins update items"
on public.game_items for update to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  )
)
with check (
  owner_id = (select auth.uid())
  or exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  )
);

create policy "Owners and admins delete items"
on public.game_items for delete to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('game-images', 'game-images', true, 12582912, array['image/jpeg', 'image/png', 'image/webp']);

create policy "Users upload game images to their folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'game-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users update game images in their folder"
on storage.objects for update to authenticated
using (
  bucket_id = 'game-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'game-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users delete game images in their folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'game-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
