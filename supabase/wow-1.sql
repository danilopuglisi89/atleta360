-- ============================================================
-- ONDATA WOW-1 — momento del giorno con foto + reazioni.
-- (Il "matchday mode" non serve SQL: usa solo il calendario già esistente.)
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede gamify-a.sql — tabella daily_moments — già eseguito.)
-- ============================================================

alter table public.daily_moments add column if not exists photo text;

-- La RPC deve restituire anche l'id del momento (per agganciarci le
-- reazioni) e la foto: cambia la forma della tabella restituita, quindi
-- va ricreata da zero (create or replace non basta se cambiano le colonne).
drop function if exists public.todays_daily_moments();
create function public.todays_daily_moments()
returns table(id uuid, user_id uuid, first_name text, emoji text, note text, photo text)
language sql security definer stable as $$
  select dm.id, dm.user_id, p.first_name, dm.emoji, dm.note, dm.photo
  from public.daily_moments dm
  join public.profiles p on p.id = dm.user_id
  where dm.moment_date = (now() at time zone 'Europe/Rome')::date and p.status = 'approved';
$$;

-- ---------- Reazioni ai momenti del giorno ----------
create table if not exists public.moment_reactions (
  moment_id  uuid not null references public.daily_moments(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (moment_id, user_id)
);
alter table public.moment_reactions enable row level security;
drop policy if exists "moment reactions read" on public.moment_reactions;
drop policy if exists "moment reactions write own" on public.moment_reactions;
create policy "moment reactions read" on public.moment_reactions for select using (public.is_approved());
create policy "moment reactions write own" on public.moment_reactions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Riepilogo reazioni di oggi (emoji + conteggio + se ci sono anche le mie),
-- senza allargare la RLS di profiles: stesso pattern delle altre RPC.
create or replace function public.todays_moment_reactions()
returns table(moment_id uuid, emoji text, count bigint)
language sql security definer stable as $$
  select mr.moment_id, mr.emoji, count(*)
  from public.moment_reactions mr
  join public.daily_moments dm on dm.id = mr.moment_id
  where dm.moment_date = (now() at time zone 'Europe/Rome')::date
  group by mr.moment_id, mr.emoji;
$$;
