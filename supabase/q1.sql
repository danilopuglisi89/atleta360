-- ============================================================
-- Ondata Q1 — Il rito quotidiano
-- 1) Home personalizzabile: quali card nascondere, per utente.
-- 2) Check-in post-partita: stesso meccanismo del check-in energia
--    pre-allenamento, con un "kind" per distinguerli.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede wave3.sql già eseguito, per la tabella checkins.)
-- ============================================================

-- ---------- Home personalizzabile ----------
alter table public.profiles add column if not exists home_hidden text[] not null default '{}';

create or replace function public.set_my_home_hidden(hidden text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set home_hidden = coalesce(hidden, '{}') where id = auth.uid();
end;
$$;

-- ---------- Check-in post-partita ----------
alter table public.checkins add column if not exists kind text not null default 'pre' check (kind in ('pre', 'post'));
alter table public.checkins drop constraint if exists checkins_athlete_id_checkin_date_key;
alter table public.checkins drop constraint if exists checkins_athlete_date_kind_key;
alter table public.checkins add constraint checkins_athlete_date_kind_key unique (athlete_id, checkin_date, kind);
