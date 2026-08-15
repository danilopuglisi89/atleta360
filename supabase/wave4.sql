-- ============================================================
-- ONDATA 4 — Vita di squadra
--   - Applausi/reazioni sul profilo delle compagne
--   - Compleanni (data di nascita + promemoria del giorno)
--   - Sondaggi rapidi (creano anche le atlete)
--   - Album foto di squadra (caricano tutte, upload compresso lato client)
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede push.sql già eseguito.)
-- ============================================================

-- ---------- Applausi sul profilo ----------
create table if not exists public.profile_reactions (
  id                uuid primary key default gen_random_uuid(),
  target_athlete_id uuid not null references public.athletes(id) on delete cascade,
  from_user_id      uuid not null references auth.users(id) on delete cascade,
  created_at        timestamptz not null default now(),
  unique (target_athlete_id, from_user_id)
);
alter table public.profile_reactions enable row level security;
drop policy if exists "reactions read" on public.profile_reactions;
drop policy if exists "reactions insert own" on public.profile_reactions;
drop policy if exists "reactions delete own" on public.profile_reactions;
create policy "reactions read" on public.profile_reactions for select using (public.is_approved());
create policy "reactions insert own" on public.profile_reactions for insert with check (from_user_id = auth.uid());
create policy "reactions delete own" on public.profile_reactions for delete using (from_user_id = auth.uid());

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('dm', 'team_chat', 'assessment', 'approval', 'goal', 'reminder', 'event', 'reaction', 'star'));

create or replace function public.notify_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target_profile uuid;
  from_name text;
begin
  select p.id into target_profile from public.profiles p join public.athletes a on a.identifier = p.athlete_id
    where a.id = new.target_athlete_id limit 1;
  if target_profile is null or target_profile = new.from_user_id then return new; end if;
  select coalesce(first_name, 'Una compagna') into from_name from public.profiles where id = new.from_user_id;
  insert into public.notifications (user_id, type, title, body, view)
  values (target_profile, 'reaction', from_name || ' ti ha applaudita 👏', 'Vai a vedere il tuo profilo!', 'profilo');
  return new;
end;
$$;
drop trigger if exists on_reaction_notify on public.profile_reactions;
create trigger on_reaction_notify after insert on public.profile_reactions
  for each row execute function public.notify_reaction();

-- ---------- Compleanni ----------
alter table public.athletes add column if not exists birth_date date;

create or replace function public.send_birthday_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare
  a record;
  sent integer := 0;
begin
  for a in
    select * from public.athletes
    where active and birth_date is not null
      and extract(month from birth_date) = extract(month from (now() at time zone 'Europe/Rome'))
      and extract(day   from birth_date) = extract(day   from (now() at time zone 'Europe/Rome'))
  loop
    insert into public.notifications (user_id, type, title, body, view)
    select p.id, 'reminder', 'Oggi è il compleanno di ' || a.identifier || ' 🎂',
      'Fatele gli auguri!', 'home'
    from public.profiles p where p.status = 'approved' and p.athlete_id <> a.identifier;
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'a360-birthdays') then perform cron.unschedule('a360-birthdays'); end if;
  perform cron.schedule('a360-birthdays', '0 8 * * *', $job$select public.send_birthday_reminders()$job$);
end $$;

-- ---------- Sondaggi rapidi ----------
create table if not exists public.polls (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  options    jsonb not null,             -- ["Sì", "No"] oppure più opzioni
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.poll_votes (
  id            uuid primary key default gen_random_uuid(),
  poll_id       uuid not null references public.polls(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  option_index  int not null,
  created_at    timestamptz not null default now(),
  unique (poll_id, user_id)
);
alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;
drop policy if exists "polls read" on public.polls;
drop policy if exists "polls insert" on public.polls;
drop policy if exists "polls delete own or staff" on public.polls;
create policy "polls read" on public.polls for select using (public.is_approved());
create policy "polls insert" on public.polls for insert with check (public.is_approved() and created_by = auth.uid());
create policy "polls delete own or staff" on public.polls for delete using (created_by = auth.uid() or public.is_staff());

drop policy if exists "poll votes read" on public.poll_votes;
drop policy if exists "poll votes write own" on public.poll_votes;
create policy "poll votes read" on public.poll_votes for select using (public.is_approved());
create policy "poll votes write own" on public.poll_votes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Album foto (upload compresso lato client, salvato come data URL) ----------
create table if not exists public.photos (
  id          uuid primary key default gen_random_uuid(),
  url         text not null,
  caption     text,
  uploaded_by uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
alter table public.photos enable row level security;
drop policy if exists "photos read" on public.photos;
drop policy if exists "photos insert" on public.photos;
drop policy if exists "photos delete own or staff" on public.photos;
create policy "photos read" on public.photos for select using (public.is_approved());
create policy "photos insert" on public.photos for insert with check (public.is_approved() and uploaded_by = auth.uid());
create policy "photos delete own or staff" on public.photos for delete using (uploaded_by = auth.uid() or public.is_staff());
