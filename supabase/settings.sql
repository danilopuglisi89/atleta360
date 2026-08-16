-- ============================================================
-- App "Impostazioni" (solo admin): interruttori per funzioni/notifiche,
-- palestre e identità squadra spostate dal codice al database, azioni di
-- manutenzione. Una sola tabella chiave→valore, letta da tutti (serve a
-- ogni atleta per sapere cosa mostrare), scritta solo dall'admin.
--
-- Filosofia: "spento" = la card sparisce e basta, senza avvisi (scelta di
-- Danilo). Le notifiche automatiche spente lo sono ALLA FONTE (dentro le
-- funzioni che le generano), non solo lato client: altrimenti l'interruttore
-- sarebbe finto e le push arriverebbero comunque.
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede calendar.sql, wave3.sql, wave4.sql, gamify-a.sql, drops.sql,
-- admin-status.sql già eseguiti.)
-- ============================================================

create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.app_settings enable row level security;
drop policy if exists "settings read all" on public.app_settings;
drop policy if exists "settings write admin" on public.app_settings;
create policy "settings read all" on public.app_settings for select using (public.is_approved());
create policy "settings write admin" on public.app_settings for all
  using (public.is_staff()) with check (public.is_staff());

-- ---------- Lettura con default (vera "spina dorsale" degli interruttori) ----------
-- Se la chiave non esiste ancora, torna il default passato: TUTTO ACCESO
-- finché l'admin non spegne qualcosa di suo pugno, mai un cambiamento a
-- sorpresa per le ragazze appena questo script viene eseguito.
create or replace function public.setting_bool(p_key text, p_default boolean default true)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select value::text::boolean from public.app_settings where key = p_key), p_default);
$$;

-- ---------- Scrittura (RPC, mai un update diretto dal client) ----------
create or replace function public.set_app_setting(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Solo lo staff può cambiare le impostazioni';
  end if;
  insert into public.app_settings (key, value, updated_by, updated_at)
  values (p_key, p_value, auth.uid(), now())
  on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now();
end;
$$;

-- ============================================================
-- Notifiche automatiche: guardia alla fonte in ogni funzione che le genera.
-- ============================================================

create or replace function public.send_event_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare
  e record;
  label text;
  sent integer := 0;
begin
  perform public.generate_recurring_events();
  if not public.setting_bool('notif_event_reminder') then return 0; end if;
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

create or replace function public.send_checkin_prompts()
returns integer language plpgsql security definer set search_path = public as $$
declare
  e record;
  sent integer := 0;
begin
  if not public.setting_bool('notif_checkin_prompt') then return 0; end if;
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

create or replace function public.send_prematch_prompts()
returns integer language plpgsql security definer set search_path = public as $$
declare
  e record;
  sent integer := 0;
begin
  if not public.setting_bool('notif_prematch_prompt') then return 0; end if;
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

create or replace function public.send_birthday_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare
  a record;
  sent integer := 0;
begin
  if not public.setting_bool('notif_birthday') then return 0; end if;
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

-- ---------- Drop fortunati: guardia alla fonte nel trigger ----------
create or replace function public.award_random_drop()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  pts int := 15;
begin
  if not public.setting_bool('feature_drops') then return new; end if;
  if random() < 0.05 then
    select p.id into uid from public.profiles p
    join public.athletes a on a.identifier = p.athlete_id
    where a.id = new.athlete_id limit 1;
    if uid is not null then
      insert into public.participation_points (user_id, action, points) values (uid, 'drop_raro', pts);
      insert into public.notifications (user_id, type, title, body, view)
      values (uid, 'drop', 'Drop raro! 🎁', 'Check-in fortunato: hai trovato ' || pts || ' punti bonus.', 'home');
    end if;
  end if;
  return new;
end;
$$;

-- ============================================================
-- Zona rossa: due azioni di manutenzione, entrambe solo staff.
-- ============================================================

-- Cancella le notifiche più vecchie di 30 giorni per TUTTI.
create or replace function public.admin_clear_old_notifications()
returns integer language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  if not public.is_staff() then
    raise exception 'Solo lo staff può eseguire questa azione';
  end if;
  delete from public.notifications where created_at < now() - interval '30 days';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Ripulisce i dati generati testando l'app dal PROPRIO account (mai da
-- quello di un'atleta vera): check-in, momenti del giorno, punti
-- partecipazione. Scoperta di sicurezza: mai un reset globale — solo
-- sul chiamante stesso (auth.uid()).
create or replace function public.admin_reset_my_test_data()
returns void language plpgsql security definer set search_path = public as $$
declare
  my_athlete_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Solo lo staff può eseguire questa azione';
  end if;
  select a.id into my_athlete_id from public.profiles p
  join public.athletes a on a.identifier = p.athlete_id
  where p.id = auth.uid();

  if my_athlete_id is not null then
    delete from public.checkins where athlete_id = my_athlete_id;
    delete from public.daily_moments where user_id = auth.uid();
  end if;
  delete from public.participation_points where user_id = auth.uid();
  delete from public.engagement_prompts_sent where user_id = auth.uid();
end;
$$;
