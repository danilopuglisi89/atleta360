-- ============================================================
-- MISURARE LA STAGIONE — registro d'uso e produzione (2026-09-21)
--
-- Due buchi che questo script chiude:
--  1. profiles.last_seen_at viene SOVRASCRITTO a ogni accesso, quindi
--     "quante erano attive a novembre" non è ricostruibile dopo. Stessa cosa
--     per pwa_installed e le iscrizioni push, che sono stato corrente.
--     → fotografia settimanale in season_snapshots.
--  2. Card condivise, calendario esportato e stampe avvengono solo nel
--     browser e non lasciano traccia da nessuna parte.
--     → registro app_events, scritto dal client.
--
-- I conteggi degli eventi (check-in, autovalutazioni, foto…) NON vanno
-- salvati: si ricalcolano dalle date già presenti, quindi il pregresso da
-- settembre entra gratis nei totali.
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede push.sql — per pg_cron e push_subscriptions — e
--  fix-last-seen.sql, per la colonna last_seen_at.)
-- ============================================================

-- ---------- 1. Registro delle azioni finora invisibili ----------
create table if not exists public.app_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,
  meta       jsonb,
  created_at timestamptz not null default now()
);

-- `kind` è testo libero SENZA vincolo CHECK, di proposito: i vincoli
-- ridichiarati in più file sono già costati caro in questo progetto (vedi
-- CLAUDE.md, trappola di notifications_type_check). Aggiungere un tipo nuovo
-- qui non richiede nessuna migrazione.
-- Valori in uso: share_card · export_ics · print_profile · print_report · dossier_generated

create index if not exists app_events_created_idx on public.app_events(created_at);
create index if not exists app_events_kind_idx    on public.app_events(kind, created_at);

alter table public.app_events enable row level security;
drop policy if exists "app events insert own" on public.app_events;
drop policy if exists "app events read staff" on public.app_events;
create policy "app events insert own" on public.app_events for insert
  with check (user_id = auth.uid() and public.is_approved());
create policy "app events read staff" on public.app_events for select
  using (public.is_staff());

-- ---------- 2. Fotografia settimanale dello stato ----------
create table if not exists public.season_snapshots (
  taken_on       date primary key,
  atlete_totali  int not null default 0,
  con_app        int not null default 0,
  con_push       int not null default 0,
  attive_7gg     int not null default 0,
  meta           jsonb,
  created_at     timestamptz not null default now()
);
alter table public.season_snapshots enable row level security;
drop policy if exists "snapshots read staff" on public.season_snapshots;
create policy "snapshots read staff" on public.season_snapshots for select
  using (public.is_staff());

create or replace function public.take_season_snapshot()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_tot int; v_app int; v_push int; v_att int;
begin
  select count(*) into v_tot
    from public.profiles p
   where p.status = 'approved' and p.category = 'atleta';

  select count(*) into v_app
    from public.profiles p
   where p.status = 'approved' and p.category = 'atleta' and coalesce(p.pwa_installed, false);

  select count(distinct ps.user_id) into v_push
    from public.push_subscriptions ps
    join public.profiles p on p.id = ps.user_id
   where p.status = 'approved' and p.category = 'atleta';

  select count(*) into v_att
    from public.profiles p
   where p.status = 'approved' and p.category = 'atleta'
     and p.last_seen_at >= now() - interval '7 days';

  insert into public.season_snapshots (taken_on, atlete_totali, con_app, con_push, attive_7gg)
  values ((now() at time zone 'Europe/Rome')::date, v_tot, v_app, v_push, v_att)
  on conflict (taken_on) do update set
    atlete_totali = excluded.atlete_totali,
    con_app       = excluded.con_app,
    con_push      = excluded.con_push,
    attive_7gg    = excluded.attive_7gg;
end;
$$;

-- ---------- 3. Conteggio robusto per tabella ----------
-- Se una tabella non esiste (script di un'ondata mai eseguito) torna 0 invece
-- di far fallire tutta la statistica. Gli altri errori NON vengono ingoiati:
-- un errore vero deve vedersi, non diventare uno zero silenzioso.
create or replace function public.count_in_period(p_table text, p_from date, p_to date)
returns bigint language plpgsql stable security definer set search_path = public as $$
declare n bigint;
begin
  if to_regclass('public.' || p_table) is null then return 0; end if;
  execute format(
    'select count(*) from public.%I where created_at >= $1 and created_at < ($2::date + 1)', p_table)
    into n using p_from, p_to;
  return coalesce(n, 0);
end;
$$;

-- ---------- 4. La statistica di stagione ----------
create or replace function public.season_stats(
  p_from date default date '2026-09-01',
  p_to   date default current_date
) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_atlete int; v_con_self int; v_con_app int; v_con_push int;
  v_sedute int; v_attivita jsonb; v_eventi jsonb;
begin
  -- Il controllo vale per chi è collegato dall'app. Quando auth.uid() è nullo
  -- la chiamata arriva dal SQL Editor o dalla chiave di servizio, che hanno
  -- già pieno accesso al database: bloccarli servirebbe solo a rendere lo
  -- script non verificabile (la funzione è comunque revocata ad anon).
  if auth.uid() is not null and not public.is_staff() then
    raise exception 'Solo lo staff può vedere le statistiche di stagione';
  end if;

  select count(*) into v_atlete
    from public.profiles where status = 'approved' and category = 'atleta';
  select count(*) into v_con_app
    from public.profiles where status = 'approved' and category = 'atleta' and coalesce(pwa_installed, false);
  select count(distinct ps.user_id) into v_con_push
    from public.push_subscriptions ps join public.profiles p on p.id = ps.user_id
   where p.status = 'approved' and p.category = 'atleta';
  select count(distinct athlete_id) into v_con_self from public.self_assessments;

  -- Allenamenti con presenze registrate: contano le sedute, non le righe.
  select count(distinct session_date) into v_sedute
    from public.attendance where session_date between p_from and p_to;

  -- Azioni tracciate dal client, raggruppate per tipo.
  select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb) into v_eventi
    from (select kind, count(*) as n from public.app_events
           where created_at >= p_from and created_at < (p_to + 1)
           group by kind) t;

  v_attivita := jsonb_build_object(
    'checkin',          public.count_in_period('checkins', p_from, p_to),
    'autovalutazioni',  public.count_in_period('self_assessments', p_from, p_to),
    'conferme_presenza',public.count_in_period('event_rsvps', p_from, p_to),
    'messaggi_squadra', public.count_in_period('chat_messages', p_from, p_to),
    'messaggi_privati', public.count_in_period('direct_messages', p_from, p_to),
    'foto',             public.count_in_period('photos', p_from, p_to),
    'momenti',          public.count_in_period('daily_moments', p_from, p_to),
    'sondaggi_voti',    public.count_in_period('poll_votes', p_from, p_to),
    'quiz',             public.count_in_period('quiz_scores', p_from, p_to),
    'obiettivi',        public.count_in_period('goals', p_from, p_to),
    'applausi',         public.count_in_period('profile_reactions', p_from, p_to),
    'bacheca',          public.count_in_period('wall_posts', p_from, p_to),
    'punti_azione',     public.count_in_period('participation_points', p_from, p_to)
  );

  return jsonb_build_object(
    'periodo', jsonb_build_object('dal', p_from, 'al', p_to),
    'adesione', jsonb_build_object(
      'atlete', v_atlete,
      'con_autovalutazione', v_con_self,
      'con_app_installata', v_con_app,
      'con_notifiche', v_con_push
    ),
    'attivita', v_attivita,
    'esportazioni', v_eventi,
    'lavoro', jsonb_build_object(
      'valutazioni_mister', public.count_in_period('assessments', p_from, p_to),
      'stelle',             public.count_in_period('stars', p_from, p_to),
      'report_ia',          public.count_in_period('reports', p_from, p_to),
      'pagelloni',          public.count_in_period('season_reports', p_from, p_to),
      'eventi_calendario',  public.count_in_period('events', p_from, p_to),
      'sedute_presenze',    coalesce(v_sedute, 0),
      'note_atleta',        public.count_in_period('athlete_notes', p_from, p_to)
    ),
    'serie', coalesce((
      select jsonb_agg(jsonb_build_object(
               'data', taken_on, 'atlete', atlete_totali,
               'app', con_app, 'push', con_push, 'attive', attive_7gg) order by taken_on)
        from public.season_snapshots where taken_on between p_from and p_to), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.season_stats(date, date) from public, anon;
grant execute on function public.season_stats(date, date) to authenticated;

-- ---------- 5. Fotografia automatica ogni lunedì alle 6 ----------
-- Stesso schema di calendar.sql, che è già in produzione e funziona.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'a360-season-snapshot') then
    perform cron.unschedule('a360-season-snapshot');
  end if;
  perform cron.schedule('a360-season-snapshot', '0 6 * * 1',
    $job$select public.take_season_snapshot()$job$);
end;
$$;

-- Prima fotografia subito, così la serie parte da oggi.
select public.take_season_snapshot();

-- ---------- Verifica ----------
-- ⚠️ Il SQL Editor esegue tutto in UNA transazione: se una riga qui sotto
-- fallisce, viene annullato l'intero script (trappola già documentata in
-- CLAUDE.md). Queste due righe non possono fallire.
select taken_on, atlete_totali, con_app, con_push, attive_7gg
  from public.season_snapshots order by taken_on desc limit 1;

select jsonb_pretty(public.season_stats());
