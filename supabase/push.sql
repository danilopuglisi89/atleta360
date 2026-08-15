-- ============================================================
-- Notifiche PUSH (Web Push / PWA): arrivano sul telefono anche
-- ad app chiusa, per ogni notifica in-app già esistente
-- (rilevamenti, bacheca, messaggi privati, obiettivi, approvazioni)
-- + il nuovo tipo 'reminder' (promemoria inviati dallo staff).
--
-- Come funziona: ogni INSERT in public.notifications fa partire,
-- via pg_net, una POST all'endpoint /api/push/dispatch del servizio
-- atleta360-coach sul VPS, che firma (VAPID) e consegna la push
-- alle subscription del destinatario.
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede notifications.sql già eseguito.)
-- ============================================================

-- ---------- Estensione pg_net (HTTP asincrono dal database) ----------
create extension if not exists pg_net;

-- ---------- Tabella delle subscription push ----------
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Ognuno gestisce SOLO le proprie subscription.
drop policy if exists "push subs select own" on public.push_subscriptions;
drop policy if exists "push subs insert own" on public.push_subscriptions;
drop policy if exists "push subs delete own" on public.push_subscriptions;
create policy "push subs select own" on public.push_subscriptions for select using (user_id = auth.uid());
create policy "push subs insert own" on public.push_subscriptions for insert with check (user_id = auth.uid());
create policy "push subs delete own" on public.push_subscriptions for delete using (user_id = auth.uid());

-- ---------- Nuovo tipo di notifica: 'reminder' (promemoria staff) ----------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('dm', 'team_chat', 'assessment', 'approval', 'goal', 'reminder', 'event', 'reaction', 'star'));

-- ---------- RPC: lo staff invia un promemoria ----------
-- A tutta la squadra (recipients = null) oppure solo ad alcune persone
-- (recipients = lista di id profilo). Una notifica in-app per destinatario;
-- la push parte da sola grazie al trigger qui sotto.
drop function if exists public.send_reminder(text);
create or replace function public.send_reminder(message text, recipients uuid[] default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  sent integer;
begin
  if not public.is_staff() then
    raise exception 'Solo lo staff può inviare promemoria';
  end if;
  if coalesce(trim(message), '') = '' then
    raise exception 'Il promemoria è vuoto';
  end if;

  -- "Tutta la squadra" esclude chi invia; la selezione esplicita invece
  -- può includere anche se stessi (utile per testare le push sul proprio telefono).
  insert into public.notifications (user_id, type, title, body, view)
  select p.id, 'reminder', 'Promemoria dallo staff 📣', trim(message), 'home'
  from public.profiles p
  where p.status = 'approved'
    and ((recipients is null and p.id <> auth.uid())
      or (recipients is not null and p.id = any(recipients)));
  get diagnostics sent = row_count;
  return sent;
end;
$$;

-- ---------- Trigger: ogni notifica nuova -> POST all'endpoint push ----------
-- Il segreto qui sotto deve combaciare con PUSH_SECRET in .env.coach sul VPS.
-- È un valore a bassa criticità (protegge solo il relay push da usi altrui).
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
    return new;  -- il destinatario non ha attivato le push: niente da fare
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
      'subs',  subs
    )
  );
  return new;
end;
$$;

drop trigger if exists on_notification_push on public.notifications;
create trigger on_notification_push
  after insert on public.notifications
  for each row execute function public.dispatch_push();
