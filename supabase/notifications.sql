-- ============================================================
-- Notifiche in-app: campanella + badge non letti su Chat.
-- Una riga per destinatario, creata da trigger su chat, messaggi
-- privati, nuovi rilevamenti e approvazione account.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede schema.sql, chat.sql, chat-v2.sql, data-model.sql già presenti.)
-- ============================================================

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null check (type in ('dm', 'team_chat', 'assessment', 'approval')),
  title      text not null,
  body       text,
  view       text,                              -- vista dell'app da aprire al click ('chat', 'profilo', 'home')
  meta       jsonb not null default '{}'::jsonb, -- extra per tipo, es. { "from_id", "from_name" } per le DM
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, read, created_at desc);

alter table public.notifications enable row level security;

-- Ognuno legge e segna come lette SOLO le proprie notifiche. Niente policy di
-- insert per il client: le righe le creano solo i trigger qui sotto (security
-- definer, stesso pattern già usato da handle_new_user() in schema.sql).
drop policy if exists "notifications read" on public.notifications;
drop policy if exists "notifications update own" on public.notifications;
create policy "notifications read" on public.notifications for select using (user_id = auth.uid());
create policy "notifications update own" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Realtime: la campanella si aggiorna da sola senza polling.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ---------- TRIGGER: messaggio in bacheca di squadra ----------
create or replace function public.notify_team_chat()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, title, body, view)
  select p.id, 'team_chat',
    coalesce(new.author, 'Qualcuno') || ' ha scritto in bacheca',
    coalesce(new.body, case when new.image is not null then '📷 Foto' else '' end),
    'chat'
  from public.profiles p
  where p.status = 'approved' and (p.role = 'admin' or p.category = 'atleta')
    and p.id <> new.user_id;
  return new;
end;
$$;
drop trigger if exists on_chat_message_notify on public.chat_messages;
create trigger on_chat_message_notify
  after insert on public.chat_messages
  for each row execute function public.notify_team_chat();

-- ---------- TRIGGER: messaggio privato ----------
create or replace function public.notify_direct_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, title, body, view, meta)
  values (
    new.recipient_id, 'dm',
    coalesce(new.sender_name, 'Qualcuno') || ' ti ha scritto',
    coalesce(new.body, case when new.image is not null then '📷 Foto' else '' end),
    'chat',
    jsonb_build_object('from_id', new.sender_id, 'from_name', new.sender_name)
  );
  return new;
end;
$$;
drop trigger if exists on_dm_notify on public.direct_messages;
create trigger on_dm_notify
  after insert on public.direct_messages
  for each row execute function public.notify_direct_message();

-- ---------- TRIGGER: nuovo rilevamento pubblicato ----------
create or replace function public.notify_new_assessment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  athlete_identifier text;
begin
  select identifier into athlete_identifier from public.athletes where id = new.athlete_id;
  if athlete_identifier is null then return new; end if;

  insert into public.notifications (user_id, type, title, body, view)
  select p.id, 'assessment',
    'Nuovo rilevamento disponibile',
    'Il mister ha aggiornato il tuo profilo soft skill.',
    'profilo'
  from public.profiles p
  where p.athlete_id = athlete_identifier and p.status = 'approved';
  return new;
end;
$$;
drop trigger if exists on_assessment_notify on public.assessments;
create trigger on_assessment_notify
  after insert on public.assessments
  for each row execute function public.notify_new_assessment();

-- ---------- TRIGGER: accesso approvato ----------
create or replace function public.notify_profile_approved()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and coalesce(old.status, '') <> 'approved' then
    insert into public.notifications (user_id, type, title, body, view)
    values (new.id, 'approval', 'Accesso approvato! 🎉', 'Benvenuta in Atleta360: la dashboard è pronta.', 'home');
  end if;
  return new;
end;
$$;
drop trigger if exists on_profile_approved_notify on public.profiles;
create trigger on_profile_approved_notify
  after update of status on public.profiles
  for each row execute function public.notify_profile_approved();
