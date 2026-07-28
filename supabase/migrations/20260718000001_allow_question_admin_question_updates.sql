do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'questions'
      and policyname = 'Allow anonymous question updates'
  ) then
    create policy "Allow anonymous question updates"
      on public.questions
      for update
      to anon
      using (true)
      with check (true);
  end if;
end $$;
