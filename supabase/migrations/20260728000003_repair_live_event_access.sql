-- Tokenized display links may be anonymous, while signed-in operators use the
-- authenticated role. Both roles need access to the transient live-event tables.
do $$
begin
  if to_regclass('public.sound_events') is not null then
    execute 'drop policy if exists "Allow anonymous sound event reads" on public.sound_events';
    execute 'drop policy if exists "Allow anonymous sound event inserts" on public.sound_events';
    execute 'drop policy if exists "Allow live sound event reads" on public.sound_events';
    execute 'drop policy if exists "Allow live sound event inserts" on public.sound_events';

    execute 'create policy "Allow live sound event reads"
      on public.sound_events
      for select
      to anon, authenticated
      using (true)';

    execute 'create policy "Allow live sound event inserts"
      on public.sound_events
      for insert
      to anon, authenticated
      with check (true)';

    execute 'grant select, insert on public.sound_events to anon, authenticated';
  end if;

  if to_regclass('public.screen_presence') is not null then
    execute 'drop policy if exists "Allow anonymous screen presence reads" on public.screen_presence';
    execute 'drop policy if exists "Allow anonymous screen presence inserts" on public.screen_presence';
    execute 'drop policy if exists "Allow anonymous screen presence updates" on public.screen_presence';
    execute 'drop policy if exists "Allow live screen presence reads" on public.screen_presence';
    execute 'drop policy if exists "Allow live screen presence inserts" on public.screen_presence';
    execute 'drop policy if exists "Allow live screen presence updates" on public.screen_presence';

    execute 'create policy "Allow live screen presence reads"
      on public.screen_presence
      for select
      to anon, authenticated
      using (true)';

    execute 'create policy "Allow live screen presence inserts"
      on public.screen_presence
      for insert
      to anon, authenticated
      with check (true)';

    execute 'create policy "Allow live screen presence updates"
      on public.screen_presence
      for update
      to anon, authenticated
      using (true)
      with check (true)';

    execute 'grant select, insert, update on public.screen_presence to anon, authenticated';
  end if;
end $$;
