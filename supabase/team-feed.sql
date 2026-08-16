-- ============================================================
-- ONDATA 1 (mondo magico) — feed "Novità" di squadra: aggrega momenti del
-- giorno, stelle, foto e risultati partite in un unico elenco cronologico,
-- senza allargare la RLS di profiles (RPC security definer, come
-- todays_daily_moments/weekly_quiz_leaderboard già fatte).
--
-- Filtro volutamente ESCLUSO da questo feed (mai visibile alle compagne):
-- punteggi del mister, presenze/assenze, check-in energia, streak perse.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede gamify-a.sql — daily_moments — e gamify-d.sql — stars — già
-- eseguiti; photos ed events esistono da wave4.sql/calendar.sql.)
-- ============================================================

create or replace function public.team_feed(p_limit int default 40)
returns table(kind text, actor_name text, actor_id text, headline text, detail text, created_at timestamptz)
language sql security definer stable as $$
  select * from (
    select 'moment'::text as kind, p.first_name as actor_name, p.athlete_id as actor_id, dm.emoji as headline, dm.note as detail, dm.created_at
    from public.daily_moments dm
    join public.profiles p on p.id = dm.user_id
    where p.status = 'approved'

    union all

    select 'star', coalesce(p.first_name, a.identifier), a.identifier, 'stella'::text, s.note, s.created_at
    from public.stars s
    join public.athletes a on a.id = s.athlete_id
    left join public.profiles p on p.athlete_id = a.identifier and p.status = 'approved'

    union all

    select 'photo', p.first_name, p.athlete_id, 'foto'::text, ph.caption, ph.created_at
    from public.photos ph
    join public.profiles p on p.id = ph.uploaded_by
    where p.status = 'approved'

    union all

    select 'result', null::text, null::text, e.title, e.result, e.starts_at
    from public.events e
    where e.result is not null and not e.cancelled
  ) feed
  order by created_at desc
  limit p_limit;
$$;
