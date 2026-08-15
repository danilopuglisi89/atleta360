-- ============================================================
-- CALENDARIO: partite e allenamenti con orari, luogo, conferme
-- presenza, risultati e promemoria push automatici la sera prima.
--
-- Struttura:
--   events            una riga per evento (anche quelli generati dalla ricorrenza)
--   event_recurrences la routine settimanale ("martedì 18:00 allenamento") che
--                     genera da sola gli eventi delle prossime 5 settimane
--   event_rsvps       conferme presenza ("ci sarò / non ci sarò")
--
-- Promemoria: un job pg_cron gira OGNI ORA; quando in Italia sono le 20
-- o più, crea le notifiche per gli eventi di DOMANI (una sola volta).
-- La push parte da sola dal trigger già esistente su notifications.
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede notifications.sql e push.sql già eseguiti.)
-- ============================================================

create extension if not exists pg_cron;

-- ---------- Eventi ----------
create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('match', 'training', 'other')),
  title         text,                          -- es. "vs Pescia" per le partite, libero per altro
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  location      text,                          -- luogo: nell'app diventa un link a Google Maps
  notes         text,
  result        text,                          -- risultato partita (es. "3-1"), compilato dopo
  cancelled     boolean not null default false,
  recurrence_id uuid,                          -- da quale ricorrenza è nato (null = inserito a mano)
  reminder_sent boolean not null default false,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);
create index if not exists events_starts_idx on public.events(starts_at);
create unique index if not exists events_recurrence_slot_idx
  on public.events(recurrence_id, starts_at) where recurrence_id is not null;

alter table public.events enable row level security;
drop policy if exists "events read" on public.events;
drop policy if exists "events write" on public.events;
create policy "events read"  on public.events for select using (public.is_approved());
create policy "events write" on public.events for all using (public.is_staff()) with check (public.is_staff());

-- ---------- Ricorrenze settimanali (allenamenti di routine) ----------
create table if not exists public.event_recurrences (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null default 'training' check (kind in ('match', 'training', 'other')),
  weekday    int not null check (weekday between 0 and 6),   -- 0 = domenica ... 6 = sabato
  start_time time not null,
  end_time   time,
  location   text,
  notes      text,
  active     boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.event_recurrences enable row level security;
drop policy if exists "recurrences read" on public.event_recurrences;
drop policy if exists "recurrences write" on public.event_recurrences;
create policy "recurrences read"  on public.event_recurrences for select using (public.is_approved());
create policy "recurrences write" on public.event_recurrences for all using (public.is_staff()) with check (public.is_staff());

-- ---------- Conferme presenza ----------
create table if not exists public.event_rsvps (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  status     text not null check (status in ('yes', 'no')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.event_rsvps enable row level security;
drop policy if exists "rsvps read" on public.event_rsvps;
drop policy if exists "rsvps write own" on public.event_rsvps;
create policy "rsvps read" on public.event_rsvps for select using (public.is_approved());
create policy "rsvps write own" on public.event_rsvps for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Le notifiche imparano il tipo 'event' ----------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('dm', 'team_chat', 'assessment', 'approval', 'goal', 'reminder', 'event', 'reaction', 'star'));

-- ---------- Generatore: dalla ricorrenza agli eventi delle prossime 5 settimane ----------
create or replace function public.generate_recurring_events()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  d date;
  made integer := 0;
begin
  for r in select * from public.event_recurrences where active loop
    d := (now() at time zone 'Europe/Rome')::date;
    while d <= (now() at time zone 'Europe/Rome')::date + 35 loop
      if extract(dow from d) = r.weekday then
        insert into public.events (kind, starts_at, ends_at, location, notes, recurrence_id)
        values (
          r.kind,
          (d::text || ' ' || r.start_time::text)::timestamp at time zone 'Europe/Rome',
          case when r.end_time is null then null
               else (d::text || ' ' || r.end_time::text)::timestamp at time zone 'Europe/Rome' end,
          r.location, r.notes, r.id
        )
        on conflict (recurrence_id, starts_at) where recurrence_id is not null do nothing;
        made := made + 1;
      end if;
      d := d + 1;
    end loop;
  end loop;
  return made;
end;
$$;

-- ---------- Promemoria della sera prima ----------
create or replace function public.send_event_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare
  e record;
  label text;
  sent integer := 0;
begin
  -- prima rigenera gli eventi di routine (così il calendario resta pieno)
  perform public.generate_recurring_events();

  -- in Italia devono essere almeno le 20
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
      to_char(e.starts_at at time zone 'Europe/Rome', 'HH24:MI')
        || coalesce(' · ' || e.location, ''),
      'calendario'
    from public.profiles p
    where p.status = 'approved';

    update public.events set reminder_sent = true where id = e.id;
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;

-- ---------- Job orario (pg_cron) ----------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'a360-event-reminders') then
    perform cron.unschedule('a360-event-reminders');
  end if;
  perform cron.schedule('a360-event-reminders', '10 * * * *', $job$select public.send_event_reminders()$job$);
end $$;
