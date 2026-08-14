-- ============================================================
-- ONDATA 3 — Mente e benessere
--   - Diario privato (solo l'atleta e l'ADMIN, non il mister)
--   - Check-in pre-allenamento ("come arrivi oggi?") + push pomeridiana
--   - Push "tra un'ora si gioca" per la routine pre-partita
--   - Indisponibilità/infortuni: sospende promemoria e alert per l'atleta
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede calendar.sql e push.sql già eseguiti.)
-- ============================================================

-- ---------- Diario privato ----------
create table if not exists public.athlete_diary (
  id         uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  mood       int check (mood between 1 and 5),
  energy     int check (energy between 1 and 5),
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists athlete_diary_athlete_idx on public.athlete_diary(athlete_id, created_at desc);

alter table public.athlete_diary enable row level security;
drop policy if exists "diary select" on public.athlete_diary;
drop policy if exists "diary insert own" on public.athlete_diary;
drop policy if exists "diary delete own" on public.athlete_diary;
create policy "diary select" on public.athlete_diary for select using (
  public.is_admin() or exists (
    select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id
    where p.id = auth.uid() and a.id = athlete_diary.athlete_id
  )
);
create policy "diary insert own" on public.athlete_diary for insert with check (
  exists (
    select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id
    where p.id = auth.uid() and a.id = athlete_id
  )
);
create policy "diary delete own" on public.athlete_diary for delete using (
  public.is_admin() or exists (
    select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id
    where p.id = auth.uid() and a.id = athlete_diary.athlete_id
  )
);

-- ---------- Check-in pre-allenamento ----------
create table if not exists public.checkins (
  id            uuid primary key default gen_random_uuid(),
  athlete_id    uuid not null references public.athletes(id) on delete cascade,
  checkin_date  date not null default ((now() at time zone 'Europe/Rome')::date),
  energy        int not null check (energy between 1 and 5),
  created_at    timestamptz not null default now(),
  unique (athlete_id, checkin_date)
);
alter table public.checkins enable row level security;
drop policy if exists "checkins read" on public.checkins;
drop policy if exists "checkins write own" on public.checkins;
create policy "checkins read" on public.checkins for select using (public.is_approved());
create policy "checkins write own" on public.checkins for all using (
  exists (select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id where p.id = auth.uid() and a.id = athlete_id)
) with check (
  exists (select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id where p.id = auth.uid() and a.id = athlete_id)
);

-- ---------- Indisponibilità / infortuni ----------
create table if not exists public.unavailability (
  id         uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  until      date not null,
  reason     text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
alter table public.unavailability enable row level security;
drop policy if exists "unavailability read" on public.unavailability;
drop policy if exists "unavailability write" on public.unavailability;
create policy "unavailability read" on public.unavailability for select using (public.is_approved());
create policy "unavailability write" on public.unavailability for all using (
  public.is_staff() or exists (select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id where p.id = auth.uid() and a.id = athlete_id)
) with check (
  public.is_staff() or exists (select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id where p.id = auth.uid() and a.id = athlete_id)
);

-- Un'atleta è indisponibile oggi?
create or replace function public.athlete_is_unavailable(p_athlete_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.unavailability u
    where u.athlete_id = p_athlete_id and u.until >= (now() at time zone 'Europe/Rome')::date
  );
$$;

-- ---------- Promemoria eventi: escludi chi è indisponibile ----------
create or replace function public.send_event_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare
  e record;
  label text;
  sent integer := 0;
begin
  perform public.generate_recurring_events();
  if extract(hour from now() at time zone 'Europe/Rome') < 20 then
    return 0;
  end if;

  for e in
    select * from public.events
    where not cancelled and not reminder_sent
      and (starts_at at time zone 'Europe/Rome')::date = (now() at time zone 'Europe/Rome')::date + 1
  loop
    label := case e.kind when 'match' then 'Partita' when 'training' then 'Allenamento' else 'Evento' end
             || coalesce(' ' || e.title, '');
    insert into public.notifications (user_id, type, title, body, view)
    select p.id, 'event',
      'Domani: ' || label || ' 🏐',
      to_char(e.starts_at at time zone 'Europe/Rome', 'HH24:MI') || coalesce(' · ' || e.location, ''),
      'calendario'
    from public.profiles p
    where p.status = 'approved'
      and not (p.athlete_id is not null and exists (
        select 1 from public.athletes a where a.identifier = p.athlete_id and public.athlete_is_unavailable(a.id)
      ));

    update public.events set reminder_sent = true where id = e.id;
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;

-- ---------- Check-in pomeridiano (allenamenti di oggi) ----------
alter table public.events add column if not exists checkin_prompt_sent boolean not null default false;

create or replace function public.send_checkin_prompts()
returns integer language plpgsql security definer set search_path = public as $$
declare
  e record;
  sent integer := 0;
begin
  if extract(hour from now() at time zone 'Europe/Rome') < 15 then
    return 0;
  end if;

  for e in
    select * from public.events
    where not cancelled and not checkin_prompt_sent and kind = 'training'
      and (starts_at at time zone 'Europe/Rome')::date = (now() at time zone 'Europe/Rome')::date
  loop
    insert into public.notifications (user_id, type, title, body, view)
    select p.id, 'reminder', 'Come arrivi all''allenamento? 💬',
      'Fai il check-in veloce prima delle ' || to_char(e.starts_at at time zone 'Europe/Rome', 'HH24:MI') || '.',
      'home'
    from public.profiles p
    where p.status = 'approved' and p.category = 'atleta'
      and not exists (
        select 1 from public.athletes a where a.identifier = p.athlete_id and public.athlete_is_unavailable(a.id)
      );
    update public.events set checkin_prompt_sent = true where id = e.id;
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;

-- ---------- Push "tra un'ora si gioca" (routine pre-partita) ----------
alter table public.events add column if not exists prematch_prompt_sent boolean not null default false;

create or replace function public.send_prematch_prompts()
returns integer language plpgsql security definer set search_path = public as $$
declare
  e record;
  sent integer := 0;
begin
  for e in
    select * from public.events
    where not cancelled and not prematch_prompt_sent and kind = 'match'
      and starts_at between now() and now() + interval '75 minutes'
  loop
    insert into public.notifications (user_id, type, title, body, view)
    select p.id, 'reminder', 'Tra poco si gioca 🏐',
      'Prepara la testa: apri la routine pre-partita di 3 minuti.', 'home'
    from public.profiles p
    where p.status = 'approved' and p.category = 'atleta'
      and not exists (
        select 1 from public.athletes a where a.identifier = p.athlete_id and public.athlete_is_unavailable(a.id)
      );
    update public.events set prematch_prompt_sent = true where id = e.id;
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'a360-checkin-prompts') then perform cron.unschedule('a360-checkin-prompts'); end if;
  perform cron.schedule('a360-checkin-prompts', '5 * * * *', $job$select public.send_checkin_prompts()$job$);
  if exists (select 1 from cron.job where jobname = 'a360-prematch-prompts') then perform cron.unschedule('a360-prematch-prompts'); end if;
  perform cron.schedule('a360-prematch-prompts', '*/15 * * * *', $job$select public.send_prematch_prompts()$job$);
end $$;
