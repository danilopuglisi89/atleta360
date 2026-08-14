-- ============================================================
-- GAMIFICATION — ONDATA A: il motore
--   - Punti partecipazione (mai legati alla bravura in campo, solo
--     all'esserci): assegnati da trigger sulle azioni vere, non da
--     una funzione che il client potrebbe chiamare a piacere.
--   - Streak sul check-in (calcolata al volo, nessuna tabella).
--   - Momento del giorno (stile BeReal): un'emoji al giorno, si
--     vedono le risposte delle compagne.
--   - Dispatcher notifiche di ingaggio: MAX 1 push al giorno a testa,
--     priorità streak-in-pericolo > momento-del-giorno.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede push.sql e wave3.sql — tabella checkins — già eseguiti.)
-- ============================================================

-- ---------- Punti partecipazione ----------
create table if not exists public.participation_points (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  action     text not null,   -- 'checkin' | 'rsvp' | 'self_assessment' | 'applause_given' | 'daily_moment'
  points     int not null,
  created_at timestamptz not null default now()
);
create index if not exists participation_points_user_idx on public.participation_points(user_id);

alter table public.participation_points enable row level security;
drop policy if exists "points read own or staff" on public.participation_points;
create policy "points read own or staff" on public.participation_points for select
  using (user_id = auth.uid() or public.is_staff());
-- Niente insert/update/delete dal client: solo i trigger qui sotto
-- (funzioni security definer) scrivono in questa tabella.

-- Totale punti + livello di un utente (per il client: una chiamata sola).
-- Livelli larghi apposta: qui non serve la stessa granularità del
-- livello-competenza già esistente, è un contatore di partecipazione.
create or replace function public.my_participation_level()
returns table(total_points bigint, level int, level_label text) language sql security definer stable as $$
  select
    coalesce(sum(points), 0) as total_points,
    case
      when coalesce(sum(points), 0) >= 500 then 5
      when coalesce(sum(points), 0) >= 250 then 4
      when coalesce(sum(points), 0) >= 120 then 3
      when coalesce(sum(points), 0) >= 50  then 2
      when coalesce(sum(points), 0) >= 15  then 1
      else 0
    end as level,
    case
      when coalesce(sum(points), 0) >= 500 then 'Leggenda'
      when coalesce(sum(points), 0) >= 250 then 'Veterana'
      when coalesce(sum(points), 0) >= 120 then 'Presente'
      when coalesce(sum(points), 0) >= 50  then 'Attiva'
      when coalesce(sum(points), 0) >= 15  then 'Iniziata'
      else 'Nuova'
    end as level_label
  from public.participation_points where user_id = auth.uid();
$$;

-- ---------- Trigger: check-in -> +5 punti ----------
create or replace function public.award_points_checkin()
returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  select p.id into uid from public.profiles p join public.athletes a on a.identifier = p.athlete_id where a.id = new.athlete_id limit 1;
  if uid is not null then
    insert into public.participation_points (user_id, action, points) values (uid, 'checkin', 5);
  end if;
  return new;
end;
$$;
drop trigger if exists on_checkin_points on public.checkins;
create trigger on_checkin_points after insert on public.checkins
  for each row execute function public.award_points_checkin();

-- ---------- Trigger: conferma presenza -> +3 punti ----------
create or replace function public.award_points_rsvp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.participation_points (user_id, action, points) values (new.user_id, 'rsvp', 3);
  return new;
end;
$$;
drop trigger if exists on_rsvp_points on public.event_rsvps;
create trigger on_rsvp_points after insert on public.event_rsvps
  for each row execute function public.award_points_rsvp();

-- ---------- Trigger: autovalutazione -> +8 punti ----------
create or replace function public.award_points_self_assessment()
returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  select p.id into uid from public.profiles p join public.athletes a on a.identifier = p.athlete_id where a.id = new.athlete_id limit 1;
  if uid is not null then
    insert into public.participation_points (user_id, action, points) values (uid, 'self_assessment', 8);
  end if;
  return new;
end;
$$;
drop trigger if exists on_self_assessment_points on public.self_assessments;
create trigger on_self_assessment_points after insert on public.self_assessments
  for each row execute function public.award_points_self_assessment();

-- ---------- Trigger: applauso DATO -> +2 punti (incoraggia a farne) ----------
create or replace function public.award_points_applause()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.participation_points (user_id, action, points) values (new.from_user_id, 'applause_given', 2);
  return new;
end;
$$;
drop trigger if exists on_applause_points on public.profile_reactions;
create trigger on_applause_points after insert on public.profile_reactions
  for each row execute function public.award_points_applause();

-- ---------- Momento del giorno (stile BeReal) ----------
create table if not exists public.daily_moments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  moment_date date not null default ((now() at time zone 'Europe/Rome')::date),
  emoji       text not null,
  note        text,
  created_at  timestamptz not null default now(),
  unique (user_id, moment_date)
);
alter table public.daily_moments enable row level security;
drop policy if exists "daily moments read" on public.daily_moments;
drop policy if exists "daily moments write own" on public.daily_moments;
create policy "daily moments read" on public.daily_moments for select using (public.is_approved());
create policy "daily moments write own" on public.daily_moments for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.award_points_daily_moment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.participation_points (user_id, action, points) values (new.user_id, 'daily_moment', 4);
  return new;
end;
$$;
drop trigger if exists on_daily_moment_points on public.daily_moments;
create trigger on_daily_moment_points after insert on public.daily_moments
  for each row execute function public.award_points_daily_moment();

-- ---------- Dispatcher notifiche di ingaggio: MAX 1 al giorno ----------
create table if not exists public.engagement_prompts_sent (
  user_id     uuid not null references auth.users(id) on delete cascade,
  prompt_date date not null default ((now() at time zone 'Europe/Rome')::date),
  kind        text not null,
  primary key (user_id, prompt_date)
);
alter table public.engagement_prompts_sent enable row level security;
-- Nessuna policy: tabella tecnica, la tocca solo il dispatcher (security definer).

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('dm', 'team_chat', 'assessment', 'approval', 'goal', 'reminder', 'event', 'reaction'));

create or replace function public.send_daily_engagement()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  streak int;
  sent integer := 0;
  today date := (now() at time zone 'Europe/Rome')::date;
begin
  -- Solo dal tardo pomeriggio: dà tempo a chi ha fatto il check-in stamattina.
  if extract(hour from now() at time zone 'Europe/Rome') < 18 then
    return 0;
  end if;

  for r in
    select p.id as user_id, a.id as athlete_id from public.profiles p
    join public.athletes a on a.identifier = p.athlete_id
    where p.status = 'approved' and p.category = 'atleta'
      and not exists (select 1 from public.engagement_prompts_sent e where e.user_id = p.id and e.prompt_date = today)
  loop
    -- Streak: giorni consecutivi di check-in fino a ieri (raggruppa le date
    -- consecutive con "data meno la sua posizione", trucco classico; conta
    -- solo il gruppo che contiene ieri — se ieri manca, streak = 0).
    with days as (
      select checkin_date,
             checkin_date - (row_number() over (order by checkin_date desc))::int * interval '1 day' as grp
      from public.checkins
      where athlete_id = r.athlete_id and checkin_date <= today - 1
    )
    select count(*) into streak from days
    where grp = (select grp from days where checkin_date = today - 1);
    streak := coalesce(streak, 0);

    if streak >= 2 and not exists (select 1 from public.checkins where athlete_id = r.athlete_id and checkin_date = today) then
      insert into public.notifications (user_id, type, title, body, view)
      values (r.user_id, 'reminder', 'La tua serie sta per spegnersi 🔥', streak || ' giorni di fila: fai il check-in prima di stasera!', 'home');
      insert into public.engagement_prompts_sent (user_id, prompt_date, kind) values (r.user_id, today, 'streak');
      sent := sent + 1;
    elsif not exists (select 1 from public.daily_moments where user_id = r.user_id and moment_date = today) then
      insert into public.notifications (user_id, type, title, body, view)
      values (r.user_id, 'reminder', 'Com''è andata oggi? 💭', 'Scegli l''emoji che descrive la tua giornata.', 'home');
      insert into public.engagement_prompts_sent (user_id, prompt_date, kind) values (r.user_id, today, 'moment');
      sent := sent + 1;
    end if;
  end loop;
  return sent;
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'a360-daily-engagement') then perform cron.unschedule('a360-daily-engagement'); end if;
  perform cron.schedule('a360-daily-engagement', '10 17 * * *', $job$select public.send_daily_engagement()$job$);
end $$;

-- ---------- Il feed di oggi (nomi + emoji), senza allargare la RLS di profiles ----------
create or replace function public.todays_daily_moments()
returns table(user_id uuid, first_name text, emoji text, note text) language sql security definer stable as $$
  select dm.user_id, p.first_name, dm.emoji, dm.note
  from public.daily_moments dm
  join public.profiles p on p.id = dm.user_id
  where dm.moment_date = (now() at time zone 'Europe/Rome')::date and p.status = 'approved';
$$;
