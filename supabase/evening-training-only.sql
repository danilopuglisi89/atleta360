-- ============================================================
-- "COM'È ANDATA OGGI?" SOLO NEI GIORNI DI ALLENAMENTO (25/09/2026)
--
-- La notifica serale delle 19:10 partiva ogni sera a tutte le atlete. Dal
-- 21/09 non l'ha aperta nessuna: una notifica ignorata ogni giorno insegna
-- a ignorare anche quelle che contano (il promemoria dell'allenamento,
-- invece, viene letto). Ora parte solo se oggi c'è un allenamento in
-- calendario, non annullato. Vale anche per "la tua serie sta per
-- spegnersi", che sta nella stessa funzione.
--
-- Ridefinisce solo send_daily_engagement(), identica a settings.sql (già
-- aggiornato): stessa firma, nessuna seconda versione. L'orario non cambia.
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

create or replace function public.send_daily_engagement()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  streak int;
  sent integer := 0;
  today date := (now() at time zone 'Europe/Rome')::date;
begin
  if not public.setting_bool('notif_daily_engagement') then return 0; end if;
  if extract(hour from now() at time zone 'Europe/Rome') < 18 then
    return 0;
  end if;
  -- Solo nei giorni di allenamento (decisione di Danilo, 25/09/2026): mandata
  -- ogni sera a 15 atlete, per quattro giorni di fila non l'ha aperta nessuna.
  -- Una notifica ignorata ogni giorno insegna a ignorare anche le altre.
  if not exists (
    select 1 from public.events
    where kind = 'training' and not cancelled
      and (starts_at at time zone 'Europe/Rome')::date = today
  ) then
    return 0;
  end if;

  for r in
    select p.id as user_id, a.id as athlete_id from public.profiles p
    join public.athletes a on a.identifier = p.athlete_id
    where p.status = 'approved' and p.category = 'atleta'
      and not exists (select 1 from public.engagement_prompts_sent e where e.user_id = p.id and e.prompt_date = today)
  loop
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
      insert into public.notifications (user_id, type, title, body, view, meta)
      values (r.user_id, 'reminder', 'La tua serie sta per spegnersi 🔥', streak || ' giorni di fila: fai il check-in prima di stasera!',
        'profilo', jsonb_build_object('anchor', 'a360-checkin'));
      insert into public.engagement_prompts_sent (user_id, prompt_date, kind) values (r.user_id, today, 'streak');
      sent := sent + 1;
    elsif not exists (select 1 from public.daily_moments where user_id = r.user_id and moment_date = today) then
      insert into public.notifications (user_id, type, title, body, view, meta)
      values (r.user_id, 'reminder', 'Com''è andata oggi? 💭', 'Scegli l''emoji che descrive la tua giornata.',
        'home', jsonb_build_object('anchor', 'a360-daily-moment'));
      insert into public.engagement_prompts_sent (user_id, prompt_date, kind) values (r.user_id, today, 'moment');
      sent := sent + 1;
    end if;
  end loop;
  return sent;
end;
$$;

-- Verifica: deve dire "sì".
select case when position('kind = ''training''' in pg_get_functiondef('public.send_daily_engagement()'::regprocedure)) > 0
            then 'sì, solo nei giorni di allenamento' else 'NO: non aggiornata' end as aggiornata;
