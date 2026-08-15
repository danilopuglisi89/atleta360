-- ============================================================
-- Notifiche più precise: non solo "apri la Home/Profilo/Area Staff" ma
-- scrolla dritto alla card giusta (colonna meta.anchor, già esistente e
-- usata per le DM). Ridefinisce le funzioni che generano le notifiche
-- coinvolte — stesso comportamento di prima, solo con l'anchor in più
-- (e per il check-in la vista corretta è "profilo", non "home": la card
-- vive lì, non in Home).
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede gamify-d.sql, goals.sql, wave2.sql, wave3.sql, wave5.sql,
--  gamify-a.sql già eseguiti — ridefinisce solo, non crea nulla di nuovo.)
-- ============================================================

-- ---------- Stella del mister -> Profilo, card "Le tue stelle" ----------
create or replace function public.notify_star()
returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  select p.id into uid from public.profiles p join public.athletes a on a.identifier = p.athlete_id where a.id = new.athlete_id limit 1;
  if uid is not null then
    insert into public.notifications (user_id, type, title, body, view, meta)
    values (uid, 'star', 'Il mister ti ha dato una stella! ⭐', new.note, 'profilo', jsonb_build_object('anchor', 'a360-stars'));
  end if;
  return new;
end;
$$;

-- ---------- Obiettivo raggiunto -> Profilo, card "I tuoi obiettivi" ----------
create or replace function public.notify_goal_reached()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  prev_scores jsonb;
  g record;
  prev_val numeric;
  new_val numeric;
begin
  select scores into prev_scores
  from public.assessments
  where athlete_id = new.athlete_id and id <> new.id and created_at < new.created_at
  order by created_at desc limit 1;

  for g in select * from public.goals where athlete_id = new.athlete_id loop
    new_val := nullif(new.scores ->> g.skill_key, '')::numeric;
    if new_val is null or new_val < g.target then continue; end if;
    prev_val := nullif(prev_scores ->> g.skill_key, '')::numeric;
    if prev_val is not null and prev_val >= g.target then continue; end if;

    insert into public.notifications (user_id, type, title, body, view, meta)
    select p.id, 'goal', 'Obiettivo raggiunto! 🎯',
      'Hai raggiunto il tuo obiettivo su ' || g.skill_key || ' (' || g.target || '/10).', 'profilo',
      jsonb_build_object('anchor', 'a360-goals')
    from public.profiles p
    join public.athletes a on a.identifier = p.athlete_id
    where a.id = new.athlete_id and p.status = 'approved';
  end loop;
  return new;
end;
$$;

-- ---------- Certificato in scadenza -> Area Staff, card certificati ----------
create or replace function public.send_certificate_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare
  c record;
  sent integer := 0;
begin
  for c in
    select * from public.certificates
    where expires_on = (now() at time zone 'Europe/Rome')::date + 30 and not reminded_30
       or expires_on = (now() at time zone 'Europe/Rome')::date + 7  and not reminded_7
  loop
    insert into public.notifications (user_id, type, title, body, view, meta)
    select p.id, 'reminder', 'Certificato in scadenza ⏰',
      c.label || ' scade il ' || to_char(c.expires_on, 'DD/MM/YYYY'), 'staff',
      jsonb_build_object('anchor', 'a360-certificates')
    from public.profiles p
    where p.status = 'approved' and (p.role = 'admin' or p.category in ('direzione', 'staff'));

    update public.certificates set
      reminded_30 = reminded_30 or (expires_on = (now() at time zone 'Europe/Rome')::date + 30),
      reminded_7  = reminded_7  or (expires_on = (now() at time zone 'Europe/Rome')::date + 7)
    where id = c.id;
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;

-- ---------- Check-in pre-allenamento -> Profilo (dove vive la card) ----------
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
    insert into public.notifications (user_id, type, title, body, view, meta)
    select p.id, 'reminder', 'Come arrivi all''allenamento? 💬',
      'Fai il check-in veloce prima delle ' || to_char(e.starts_at at time zone 'Europe/Rome', 'HH24:MI') || '.',
      'profilo', jsonb_build_object('anchor', 'a360-checkin')
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

-- ---------- Pre-partita -> Home, card prossimo impegno ----------
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
    insert into public.notifications (user_id, type, title, body, view, meta)
    select p.id, 'reminder', 'Tra poco si gioca 🏐',
      'Prepara la testa: apri la routine pre-partita di 3 minuti.', 'home',
      jsonb_build_object('anchor', 'a360-next-event')
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

-- ---------- Streak in scadenza -> Profilo (check-in); momento del giorno -> Home ----------
create or replace function public.send_daily_engagement()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  streak int;
  sent integer := 0;
  today date := (now() at time zone 'Europe/Rome')::date;
begin
  if extract(hour from now() at time zone 'Europe/Rome') < 18 then
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

-- ---------- Controllo settimanale staff -> Area Staff, "Da tenere d'occhio" ----------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'a360-staff-weekly-check') then
    perform cron.unschedule('a360-staff-weekly-check');
  end if;
  perform cron.schedule('a360-staff-weekly-check', '0 8 * * 1', $job$
    insert into public.notifications (user_id, type, title, body, view, meta)
    select p.id, 'reminder', 'Controllo settimanale squadra 📋',
      'Dai un''occhiata al pannello "Da tenere d''occhio" in Area Staff: presenze, punteggi e autovalutazioni mancanti.',
      'staff', jsonb_build_object('anchor', 'a360-attention')
    from public.profiles p
    where p.status = 'approved' and (p.role = 'admin' or p.category in ('direzione', 'staff'))
  $job$);
end $$;

-- ---------- Il trigger push deve portare con sé anche "meta" ----------
create or replace function public.dispatch_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  subs jsonb;
begin
  select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
    into subs
  from public.push_subscriptions s
  where s.user_id = new.user_id;

  if subs is null then
    return new;
  end if;

  perform net.http_post(
    url     := 'https://oasi.danilopuglisi.com/api/push/dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', 'f78baeb71bd063b534d0ce6bc3b9f58b11316ddd20bba40f'
    ),
    body    := jsonb_build_object(
      'title', new.title,
      'body',  coalesce(new.body, ''),
      'view',  coalesce(new.view, 'home'),
      'type',  new.type,
      'anchor', new.meta ->> 'anchor',
      'subs',  subs
    )
  );
  return new;
end;
$$;
