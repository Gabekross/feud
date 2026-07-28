do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'answers'
      and policyname = 'Allow anonymous answer inserts'
  ) then
    create policy "Allow anonymous answer inserts"
      on public.answers
      for insert
      to anon
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'answers'
      and policyname = 'Allow anonymous answer deletes'
  ) then
    create policy "Allow anonymous answer deletes"
      on public.answers
      for delete
      to anon
      using (true);
  end if;
end $$;
