-- ============================================================
-- ATLETA360 — SCHEMA COMPLETO PER UN DATABASE VUOTO
-- Generato da ops/genera-schema-demo.mjs il 2026-09-27. NON modificare a mano:
-- si rigenera dagli script in supabase/.
--
-- Solo per un progetto Supabase NUOVO e vuoto (demo, prove). Mai su Oasi.
-- Incolla tutto nel SQL Editor e premi Run. Se si ferma con un errore,
-- il SQL Editor annulla tutto: copia il messaggio a Claude, si corregge e
-- si riesegue da capo (gli script sono rieseguibili).
-- ============================================================


-- ############################################################
-- ### schema.sql
-- ############################################################

-- ============================================================
-- Atleta360 — schema accesso con approvazione (Supabase)
-- Incolla TUTTO questo script nel SQL Editor di Supabase e premi "Run".
-- ============================================================

-- Tabella profili: una riga per ogni utente registrato.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name  text,
  email      text,
  -- permesso: 'athlete' (default) o 'admin' (assegnato SOLO a mano, vedi in fondo).
  role       text not null default 'athlete' check (role in ('athlete', 'admin')),
  -- categoria dichiarata in registrazione (informativa, non dà permessi).
  category   text not null default 'atleta' check (category in ('direzione', 'staff', 'atleta')),
  status     text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- Se la tabella esisteva già senza la colonna categoria, la aggiunge senza errori.
alter table public.profiles
  add column if not exists category text not null default 'atleta'
  check (category in ('direzione', 'staff', 'atleta'));

-- Collegamento account atleta → identificatore nel Foglio (es. "Beatrice V.").
-- Lo imposta l'admin dal pannello: serve per mostrare all'atleta solo il SUO profilo.
alter table public.profiles
  add column if not exists athlete_id text;

alter table public.profiles enable row level security;

-- Funzione di comodo: l'utente corrente è admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Lettura: ognuno vede il proprio profilo; l'admin vede tutti.
drop policy if exists "read own or admin" on public.profiles;
create policy "read own or admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

-- Aggiornamento: solo l'admin può cambiare status/ruolo (approva/rifiuta).
drop policy if exists "admin can update" on public.profiles;
create policy "admin can update" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- Alla registrazione, crea in automatico il profilo (nome/cognome dai metadati).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, first_name, last_name, email, category)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.email,
    coalesce(new.raw_user_meta_data ->> 'category', 'atleta')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- DOPO aver creato il TUO utente (registrandoti nell'app o da
-- Authentication → Users), eleggiti ad admin approvato eseguendo
-- questa riga con la tua email:
--
--   update public.profiles
--   set role = 'admin', status = 'approved'
--   where email = 'info@danilopuglisi.com';
-- ============================================================

-- ############################################################
-- ### data-model.sql
-- ############################################################

-- ============================================================
-- Atleta360 — Modello dati su Supabase (atlete, focus, rilevamenti)
-- Sostituisce il Foglio Google come fonte dei dati.
-- Incolla TUTTO nel SQL Editor di Supabase e premi Run. È sicuro da ri-eseguire.
-- (Richiede lo schema di accesso già presente: profiles, is_admin(), ecc.)
-- ============================================================

-- ---------- TABELLE ----------

-- Atlete (la "rosa")
create table if not exists public.athletes (
  id         uuid primary key default gen_random_uuid(),
  identifier text not null unique,      -- iniziali o numero di maglia (es. "Beatrice V.")
  position   text,                       -- ruolo in campo (facoltativo)
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Focus / competenze allenate
create table if not exists public.skills (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,     -- slug stabile usato nei punteggi (es. "reset")
  title       text not null,            -- titolo esteso
  short       text not null,            -- etichetta breve (grafici)
  description text,
  sort_order  int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Rilevamenti (una compilazione del mister per un'atleta)
create table if not exists public.assessments (
  id         uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  note       text,
  scores     jsonb not null default '{}'::jsonb,  -- { "<skill.key>": 1..10 }
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index if not exists assessments_athlete_idx on public.assessments(athlete_id);

-- ---------- SICUREZZA (RLS) ----------
alter table public.athletes   enable row level security;
alter table public.skills     enable row level security;
alter table public.assessments enable row level security;

-- Helper: utente approvato?
create or replace function public.is_approved()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved');
$$;

-- Helper: staff/direzione o admin?
create or replace function public.is_staff()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.role = 'admin' or p.category in ('direzione', 'staff'))
  );
$$;

-- Lettura: chiunque abbia un account approvato. Scrittura: come indicato.
drop policy if exists "athletes read"  on public.athletes;
drop policy if exists "athletes write" on public.athletes;
create policy "athletes read"  on public.athletes for select using (public.is_approved());
create policy "athletes write" on public.athletes for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "skills read"  on public.skills;
drop policy if exists "skills write" on public.skills;
create policy "skills read"  on public.skills for select using (public.is_approved());
create policy "skills write" on public.skills for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "assessments read"   on public.assessments;
drop policy if exists "assessments insert" on public.assessments;
drop policy if exists "assessments update" on public.assessments;
drop policy if exists "assessments delete" on public.assessments;
create policy "assessments read"   on public.assessments for select using (public.is_approved());
create policy "assessments insert" on public.assessments for insert with check (public.is_staff());
create policy "assessments update" on public.assessments for update using (public.is_staff()) with check (public.is_staff());
create policy "assessments delete" on public.assessments for delete using (public.is_staff());

-- ---------- SEED: i 6 focus attuali ----------
insert into public.skills (key, title, short, description, sort_order) values
  ('reset', 'Resilienza all''Errore (Mental Reset)', 'Reset',
   'Capacità di resettare la mente dopo un errore punto (es. una battuta sbagliata o una ricezione fallita) senza farsi condizionare nei punti successivi.', 1),
  ('focus', 'Focus sotto Pressione (Clutch Performance)', 'Focus',
   'Livello di attenzione e lucidità nei momenti caldi del match (es. i vantaggi o i punti decisivi dal 20 in poi).', 2),
  ('body', 'Body Language e Atteggiamento', 'Body Lang.',
   'La gestione della frustrazione. Presenza visiva in campo, postura positiva ed evitamento di gesti di stizza che scoraggiano la squadra.', 3),
  ('comunicazione', 'Comunicazione e Sostegno', 'Comunic.',
   'Capacità di chiamare la palla ad alta voce, dare indicazioni tattiche chiare e sostenere attivamente le compagne nei momenti di difficoltà.', 4),
  ('coachability', 'Coachability (Ascolto Attivo)', 'Coachab.',
   'Apertura mentale nell''accettare le correzioni tecniche/tattiche del Mister durante i timeout o gli allenamenti, applicandole subito senza protestare.', 5),
  ('tattica', 'Intelligenza Tattica (Problem Solving)', 'Tattica',
   'Capacità di leggere il gioco avversario (es. posizionamento del muro o della difesa) e variare i colpi d''attacco di conseguenza.', 6)
on conflict (key) do nothing;

-- ---------- SEED: atlete esistenti ----------
insert into public.athletes (identifier) values
  ('Beatrice V.'), ('Lorenza F.'), ('Caterina S.')
on conflict (identifier) do nothing;

-- ---------- MIGRAZIONE: rilevamento del 05/06/2026 ----------
insert into public.assessments (athlete_id, scores, created_at)
select a.id, s.scores, s.ts
from (values
  ('Beatrice V.', '{"reset":9,"focus":7,"body":8,"comunicazione":6,"coachability":6,"tattica":7}'::jsonb, timestamptz '2026-06-05 18:23:29+02'),
  ('Lorenza F.',  '{"reset":6,"focus":9,"body":8,"comunicazione":8,"coachability":6,"tattica":5}'::jsonb, timestamptz '2026-06-05 18:23:45+02'),
  ('Caterina S.', '{"reset":8,"focus":8,"body":7,"comunicazione":9,"coachability":6,"tattica":8}'::jsonb, timestamptz '2026-06-05 18:23:56+02')
) as s(identifier, scores, ts)
join public.athletes a on a.identifier = s.identifier
where not exists (select 1 from public.assessments x where x.athlete_id = a.id);

-- ############################################################
-- ### mister-permission.sql
-- ############################################################

-- ============================================================
-- Permesso "inserire rilevamenti" (mister), assegnato dall'admin per account.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

alter table public.profiles
  add column if not exists can_assess boolean not null default false;

-- Può inserire rilevamenti chi ha il permesso, oppure un admin.
create or replace function public.can_assess()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.role = 'admin' or p.can_assess = true)
  );
$$;

-- Le regole sui rilevamenti ora richiedono questo permesso (non più il ruolo staff).
drop policy if exists "assessments insert" on public.assessments;
drop policy if exists "assessments update" on public.assessments;
drop policy if exists "assessments delete" on public.assessments;
create policy "assessments insert" on public.assessments for insert with check (public.can_assess());
create policy "assessments update" on public.assessments for update using (public.can_assess()) with check (public.can_assess());
create policy "assessments delete" on public.assessments for delete using (public.can_assess());

-- ############################################################
-- ### admin-delete.sql
-- ############################################################

-- ============================================================
-- Cancellazione DEFINITIVA di un utente rifiutato (solo admin).
-- Elimina l'account di autenticazione: a cascata sparisce anche il profilo,
-- e l'email torna libera per un'eventuale nuova registrazione.
-- Incolla nel SQL Editor di Supabase e premi Run.
-- ============================================================

create or replace function public.admin_delete_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo un admin può eseguire questa operazione.
  if not public.is_admin() then
    raise exception 'Operazione non consentita';
  end if;
  -- Per sicurezza si possono eliminare solo utenti con richiesta RIFIUTATA.
  if not exists (select 1 from public.profiles where id = target and status = 'rejected') then
    raise exception 'Si possono eliminare definitivamente solo gli utenti rifiutati';
  end if;
  -- Elimina l'utente di autenticazione (cascade su profiles).
  delete from auth.users where id = target;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ############################################################
-- ### profile-fields.sql
-- ############################################################

-- ============================================================
-- Area personale: campi opzionali del profilo + auto-modifica sicura.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

alter table public.profiles
  add column if not exists phone         text,
  add column if not exists facebook      text,
  add column if not exists instagram     text,
  add column if not exists jersey_number text,
  add column if not exists ruolo         text,
  add column if not exists avatar_url    text;

-- Ogni utente può aggiornare SOLO i propri campi facoltativi (non stato/ruolo/
-- categoria/permessi/collegamento atleta: quelli restano all'admin).
create or replace function public.update_my_profile(
  p_phone text default null,
  p_facebook text default null,
  p_instagram text default null,
  p_jersey_number text default null,
  p_ruolo text default null,
  p_avatar_url text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set
    phone = p_phone,
    facebook = p_facebook,
    instagram = p_instagram,
    jersey_number = p_jersey_number,
    ruolo = p_ruolo,
    avatar_url = p_avatar_url
  where id = auth.uid();
end;
$$;

revoke all on function public.update_my_profile(text, text, text, text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text, text, text, text) to authenticated;

-- ############################################################
-- ### chat.sql
-- ############################################################

-- ============================================================
-- Chat di squadra (bacheca pubblica) — riservata alle atlete e all'admin.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  author     text,                 -- nome visualizzato (snapshot)
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_created_idx on public.chat_messages(created_at);

alter table public.chat_messages enable row level security;

-- Partecipano alla chat: atlete approvate e admin.
create or replace function public.is_chat_member()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'approved' and (p.role = 'admin' or p.category = 'atleta')
  );
$$;

drop policy if exists "chat read"   on public.chat_messages;
drop policy if exists "chat insert" on public.chat_messages;
drop policy if exists "chat delete" on public.chat_messages;
create policy "chat read"   on public.chat_messages for select using (public.is_chat_member());
create policy "chat insert" on public.chat_messages for insert with check (public.is_chat_member() and user_id = auth.uid());
create policy "chat delete" on public.chat_messages for delete using (user_id = auth.uid() or public.is_admin());

-- ############################################################
-- ### chat-v2.sql
-- ############################################################

-- ============================================================
-- Chat v2: immagini, avatar/nome dei membri, messaggi privati tra atlete.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede prima chat.sql — tabella chat_messages e is_chat_member().)
-- ============================================================

-- Immagini allegate nella chat di squadra
alter table public.chat_messages add column if not exists image text;

-- Roster dei membri chat (nome + avatar) leggibile dagli altri membri,
-- senza aprire in lettura l'intera tabella profiles.
create or replace function public.chat_roster()
returns table(id uuid, name text, avatar_url text, category text)
language sql security definer stable as $$
  select p.id,
         nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
         p.avatar_url, p.category
  from public.profiles p
  where p.status = 'approved' and (p.role = 'admin' or p.category = 'atleta')
    and public.is_chat_member();
$$;
revoke all on function public.chat_roster() from public, anon;
grant execute on function public.chat_roster() to authenticated;

-- L'utente indicato è un'atleta approvata?
create or replace function public.is_athlete(u uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles p where p.id = u and p.status = 'approved' and p.category = 'atleta');
$$;

-- Messaggi privati (1-a-1) tra atlete
create table if not exists public.direct_messages (
  id             uuid primary key default gen_random_uuid(),
  sender_id      uuid references auth.users(id) on delete set null,
  recipient_id   uuid references auth.users(id) on delete set null,
  sender_name    text,
  recipient_name text,
  body           text,
  image          text,
  created_at     timestamptz not null default now()
);
create index if not exists dm_pair_idx on public.direct_messages(sender_id, recipient_id, created_at);
alter table public.direct_messages enable row level security;

-- Leggono i due partecipanti (o l'admin, per moderazione). Scrivono solo atlete
-- verso atlete. Cancella l'autore o l'admin.
drop policy if exists "dm read"   on public.direct_messages;
drop policy if exists "dm insert" on public.direct_messages;
drop policy if exists "dm delete" on public.direct_messages;
create policy "dm read"   on public.direct_messages for select using (auth.uid() in (sender_id, recipient_id) or public.is_admin());
create policy "dm insert" on public.direct_messages for insert with check (sender_id = auth.uid() and public.is_athlete(auth.uid()) and public.is_athlete(recipient_id));
create policy "dm delete" on public.direct_messages for delete using (sender_id = auth.uid() or public.is_admin());

-- ############################################################
-- ### chat-reactions.sql
-- ############################################################

-- ============================================================
-- Reazioni ai messaggi della chat di squadra (stile WhatsApp: 👍❤️🔥…).
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede prima chat.sql — tabella chat_messages e is_chat_member().)
-- ============================================================

create table if not exists public.message_reactions (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)   -- un'atleta = una volta per emoji
);
create index if not exists message_reactions_msg_idx on public.message_reactions(message_id);

alter table public.message_reactions enable row level security;

-- Leggono e reagiscono i membri della chat; ogni utente gestisce solo le proprie.
drop policy if exists "react read"   on public.message_reactions;
drop policy if exists "react insert" on public.message_reactions;
drop policy if exists "react delete" on public.message_reactions;
create policy "react read"   on public.message_reactions for select using (public.is_chat_member());
create policy "react insert" on public.message_reactions for insert with check (public.is_chat_member() and user_id = auth.uid());
create policy "react delete" on public.message_reactions for delete using (user_id = auth.uid() or public.is_admin());

-- ############################################################
-- ### athlete-card.sql
-- ############################################################

-- ============================================================
-- Card pubblica dell'atleta (stile social): estende chat_roster con il
-- collegamento all'atleta (athlete_id), il ruolo e i social, così l'app
-- può mostrare foto/ruolo e avviare un messaggio privato dal nome cliccato.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede prima chat.sql + chat-v2.sql.)
-- ============================================================

-- La firma cambia (nuove colonne): va ricreata da zero.
drop function if exists public.chat_roster();

create or replace function public.chat_roster()
returns table(
  id uuid, name text, avatar_url text, category text,
  athlete_id text, ruolo text, jersey_number text, instagram text, facebook text
)
language sql security definer stable as $$
  select p.id,
         nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
         p.avatar_url, p.category, p.athlete_id, p.ruolo, p.jersey_number, p.instagram, p.facebook
  from public.profiles p
  where p.status = 'approved' and (p.role = 'admin' or p.category = 'atleta')
    and public.is_chat_member();
$$;
revoke all on function public.chat_roster() from public, anon;
grant execute on function public.chat_roster() to authenticated;

-- ############################################################
-- ### notifications.sql
-- ############################################################

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

-- ############################################################
-- ### goals.sql
-- ############################################################

-- ============================================================
-- Obiettivi personali: l'atleta (o il mister) fissa un valore
-- target per un focus, con barra di progresso nel profilo.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede data-model.sql, schema.sql e notifications.sql già presenti:
-- la notifica "obiettivo raggiunto" in fondo a questo script usa la tabella
-- notifications creata da quello script.)
-- ============================================================

create table if not exists public.goals (
  id         uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  skill_key  text not null,
  target     numeric not null check (target >= 1 and target <= 10),
  due_date   date,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index if not exists goals_athlete_idx on public.goals(athlete_id);

alter table public.goals enable row level security;

drop policy if exists "goals read" on public.goals;
create policy "goals read" on public.goals for select using (public.is_approved());

-- Scrittura: l'atleta collegata a quell'athlete_id, oppure lo staff (il
-- mister può proporre un obiettivo a un'atleta).
drop policy if exists "goals insert" on public.goals;
drop policy if exists "goals update" on public.goals;
drop policy if exists "goals delete" on public.goals;

create policy "goals insert" on public.goals for insert with check (
  public.is_staff() or exists (
    select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id
    where p.id = auth.uid() and p.status = 'approved' and a.id = goals.athlete_id
  )
);
create policy "goals update" on public.goals for update using (
  public.is_staff() or exists (
    select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id
    where p.id = auth.uid() and p.status = 'approved' and a.id = goals.athlete_id
  )
);
create policy "goals delete" on public.goals for delete using (
  public.is_staff() or exists (
    select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id
    where p.id = auth.uid() and p.status = 'approved' and a.id = goals.athlete_id
  )
);

-- ---------- TRIGGER: obiettivo raggiunto con un nuovo rilevamento ----------
-- Notifica solo al momento del "sorpasso" (punteggio precedente sotto al
-- target, nuovo punteggio a target o oltre): niente notifiche ripetute ai
-- rilevamenti successivi in cui l'obiettivo resta raggiunto.
-- Lista COMPLETA dei tipi, identica in ogni script che tocca questo vincolo
-- (notifications/goals/push/calendar/wave4/gamify-*): ogni file lo ricrea da
-- zero, quindi dichiararne una piu' corta lo restringe e fa fallire tutto se
-- nel database esistono gia' righe dei tipi mancanti. Aggiungendo un tipo
-- nuovo, aggiornare la lista in TUTTI quei file.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('dm', 'team_chat', 'assessment', 'approval', 'goal', 'reminder', 'event', 'reaction', 'star', 'drop'));

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

    insert into public.notifications (user_id, type, title, body, view)
    select p.id, 'goal', 'Obiettivo raggiunto! 🎯',
      'Hai raggiunto il tuo obiettivo su ' || g.skill_key || ' (' || g.target || '/10).', 'profilo'
    from public.profiles p
    join public.athletes a on a.identifier = p.athlete_id
    where a.id = new.athlete_id and p.status = 'approved';
  end loop;
  return new;
end;
$$;
drop trigger if exists on_assessment_goal_check on public.assessments;
create trigger on_assessment_goal_check
  after insert on public.assessments
  for each row execute function public.notify_goal_reached();

-- ############################################################
-- ### self-assessments.sql
-- ############################################################

-- ============================================================
-- Autovalutazione: l'atleta valuta se stessa sugli stessi focus del
-- mister. Nel profilo si vede "come ti vedi tu" vs "come ti vede il
-- mister"; in Area Staff gli scostamenti più grandi tra le due.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede data-model.sql e schema.sql già presenti.)
-- ============================================================

create table if not exists public.self_assessments (
  id         uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  scores     jsonb not null default '{}'::jsonb,  -- stessa forma di assessments.scores
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index if not exists self_assessments_athlete_idx on public.self_assessments(athlete_id);

alter table public.self_assessments enable row level security;

-- Lettura: la propria atleta e lo staff (dal 27/09/2026, autovalutazioni-private.sql).
-- Prima era "chiunque approvato": le compagne potevano leggerla dal database.
drop policy if exists "self_assessments read" on public.self_assessments;
create policy "self_assessments read" on public.self_assessments for select using (
  public.is_staff() or exists (
    select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id
    where p.id = auth.uid() and p.status = 'approved' and a.id = self_assessments.athlete_id
  )
);

-- Scrittura: solo l'atleta collegata a quel athlete_id (via profiles.athlete_id),
-- oppure lo staff. Un'atleta autovaluta solo se stessa.
drop policy if exists "self_assessments insert" on public.self_assessments;
drop policy if exists "self_assessments update" on public.self_assessments;
drop policy if exists "self_assessments delete" on public.self_assessments;

create policy "self_assessments insert" on public.self_assessments for insert with check (
  public.is_staff() or exists (
    select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id
    where p.id = auth.uid() and p.status = 'approved' and a.id = self_assessments.athlete_id
  )
);
create policy "self_assessments update" on public.self_assessments for update using (
  public.is_staff() or exists (
    select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id
    where p.id = auth.uid() and p.status = 'approved' and a.id = self_assessments.athlete_id
  )
);
create policy "self_assessments delete" on public.self_assessments for delete using (
  public.is_staff() or exists (
    select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id
    where p.id = auth.uid() and p.status = 'approved' and a.id = self_assessments.athlete_id
  )
);

-- ############################################################
-- ### attendance.sql
-- ############################################################

-- ============================================================
-- Registro presenze: check-in rapido del mister a ogni allenamento,
-- percentuale di presenza per atleta in Area Staff.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede schema.sql e data-model.sql già presenti.)
-- ============================================================

create table if not exists public.attendance (
  id           uuid primary key default gen_random_uuid(),
  athlete_id   uuid not null references public.athletes(id) on delete cascade,
  session_date date not null,
  present      boolean not null default true,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id),
  unique (athlete_id, session_date)   -- un solo check-in per atleta per allenamento
);
create index if not exists attendance_date_idx on public.attendance(session_date);

alter table public.attendance enable row level security;

-- Lettura: staff (il registro è uno strumento di lavoro del mister).
-- Scrittura: solo staff.
drop policy if exists "attendance read"   on public.attendance;
drop policy if exists "attendance write"  on public.attendance;
create policy "attendance read"  on public.attendance for select using (public.is_staff());
create policy "attendance write" on public.attendance for all using (public.is_staff()) with check (public.is_staff());

-- ############################################################
-- ### reports.sql
-- ############################################################

-- ============================================================
-- Report IA salvati: ogni analisi generata in Area Staff resta
-- nello storico (oggi si perdeva al refresh).
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede schema.sql e data-model.sql già presenti.)
-- ============================================================

create table if not exists public.reports (
  id         uuid primary key default gen_random_uuid(),
  content    text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index if not exists reports_created_idx on public.reports(created_at desc);

alter table public.reports enable row level security;

-- Solo lo staff legge/scrive/elimina: sono appunti di lavoro del mister/dirigenza.
drop policy if exists "reports read"   on public.reports;
drop policy if exists "reports insert" on public.reports;
drop policy if exists "reports delete" on public.reports;
create policy "reports read"   on public.reports for select using (public.is_staff());
create policy "reports insert" on public.reports for insert with check (public.is_staff());
create policy "reports delete" on public.reports for delete using (public.is_staff());

-- ############################################################
-- ### push.sql
-- ############################################################

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
  check (type in ('dm', 'team_chat', 'assessment', 'approval', 'goal', 'reminder', 'event', 'reaction', 'star', 'drop'));

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

-- ############################################################
-- ### calendar.sql
-- ############################################################

-- ============================================================
-- CALENDARIO: partite e allenamenti con orari, luogo, conferme
-- presenza, risultati e promemoria push automatici la sera prima.
--
-- Struttura:
--   events            una riga per evento (anche quelli generati dalla ricorrenza)
--   event_recurrences la routine settimanale ("martedì 18:00 allenamento") che
--                     genera da sola gli eventi delle prossime 5 settimane
--   event_rsvps       conferme presenza ("ci sarò / non ci sarò")
--
-- Promemoria: un job pg_cron gira OGNI ORA; quando in Italia sono le 20
-- o più, crea le notifiche per gli eventi di DOMANI (una sola volta).
-- La push parte da sola dal trigger già esistente su notifications.
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede notifications.sql e push.sql già eseguiti.)
-- ============================================================

create extension if not exists pg_cron;

-- ---------- Eventi ----------
create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('match', 'training', 'other')),
  title         text,                          -- es. "vs Pescia" per le partite, libero per altro
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  location      text,                          -- luogo: nell'app diventa un link a Google Maps
  notes         text,
  result        text,                          -- risultato partita (es. "3-1"), compilato dopo
  cancelled     boolean not null default false,
  recurrence_id uuid,                          -- da quale ricorrenza è nato (null = inserito a mano)
  reminder_sent boolean not null default false,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);
create index if not exists events_starts_idx on public.events(starts_at);
create unique index if not exists events_recurrence_slot_idx
  on public.events(recurrence_id, starts_at) where recurrence_id is not null;

alter table public.events enable row level security;
drop policy if exists "events read" on public.events;
drop policy if exists "events write" on public.events;
create policy "events read"  on public.events for select using (public.is_approved());
create policy "events write" on public.events for all using (public.is_staff()) with check (public.is_staff());

-- ---------- Ricorrenze settimanali (allenamenti di routine) ----------
create table if not exists public.event_recurrences (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null default 'training' check (kind in ('match', 'training', 'other')),
  weekday    int not null check (weekday between 0 and 6),   -- 0 = domenica ... 6 = sabato
  start_time time not null,
  end_time   time,
  location   text,
  notes      text,
  active     boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.event_recurrences enable row level security;
drop policy if exists "recurrences read" on public.event_recurrences;
drop policy if exists "recurrences write" on public.event_recurrences;
create policy "recurrences read"  on public.event_recurrences for select using (public.is_approved());
create policy "recurrences write" on public.event_recurrences for all using (public.is_staff()) with check (public.is_staff());

-- ---------- Conferme presenza ----------
create table if not exists public.event_rsvps (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  status     text not null check (status in ('yes', 'no')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table public.event_rsvps enable row level security;
drop policy if exists "rsvps read" on public.event_rsvps;
drop policy if exists "rsvps write own" on public.event_rsvps;
create policy "rsvps read" on public.event_rsvps for select using (public.is_approved());
create policy "rsvps write own" on public.event_rsvps for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Le notifiche imparano il tipo 'event' ----------
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('dm', 'team_chat', 'assessment', 'approval', 'goal', 'reminder', 'event', 'reaction', 'star', 'drop'));

-- ---------- Generatore: dalla ricorrenza agli eventi delle prossime 5 settimane ----------
create or replace function public.generate_recurring_events()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  d date;
  made integer := 0;
begin
  for r in select * from public.event_recurrences where active loop
    d := (now() at time zone 'Europe/Rome')::date;
    while d <= (now() at time zone 'Europe/Rome')::date + 35 loop
      if extract(dow from d) = r.weekday then
        insert into public.events (kind, starts_at, ends_at, location, notes, recurrence_id)
        values (
          r.kind,
          (d::text || ' ' || r.start_time::text)::timestamp at time zone 'Europe/Rome',
          case when r.end_time is null then null
               else (d::text || ' ' || r.end_time::text)::timestamp at time zone 'Europe/Rome' end,
          r.location, r.notes, r.id
        )
        on conflict (recurrence_id, starts_at) where recurrence_id is not null do nothing;
        made := made + 1;
      end if;
      d := d + 1;
    end loop;
  end loop;
  return made;
end;
$$;

-- ---------- Promemoria della sera prima ----------
create or replace function public.send_event_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare
  e record;
  label text;
  sent integer := 0;
begin
  -- prima rigenera gli eventi di routine (così il calendario resta pieno)
  perform public.generate_recurring_events();

  -- in Italia devono essere almeno le 20
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
      to_char(e.starts_at at time zone 'Europe/Rome', 'HH24:MI')
        || coalesce(' · ' || e.location, ''),
      'calendario'
    from public.profiles p
    where p.status = 'approved';

    update public.events set reminder_sent = true where id = e.id;
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;

-- ---------- Job orario (pg_cron) ----------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'a360-event-reminders') then
    perform cron.unschedule('a360-event-reminders');
  end if;
  perform cron.schedule('a360-event-reminders', '10 * * * *', $job$select public.send_event_reminders()$job$);
end $$;

-- ############################################################
-- ### wave2.sql
-- ############################################################

-- ============================================================
-- ONDATA 2 — Strumenti del mister
--   - Piano seduta: obiettivo + esercizi sull'evento (allenamento)
--   - Appunti rapidi per atleta (note volanti raccolte in palestra)
--   - Promemoria settimanale staff: controlla il pannello "Da tenere d'occhio"
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede calendar.sql e push.sql già eseguiti.)
-- ============================================================

-- ---------- Piano seduta: due colonne in più su events ----------
alter table public.events add column if not exists objective text;
alter table public.events add column if not exists exercises text;

-- ---------- Appunti rapidi per atleta ----------
create table if not exists public.athlete_notes (
  id         uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  note       text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists athlete_notes_athlete_idx on public.athlete_notes(athlete_id, created_at desc);

alter table public.athlete_notes enable row level security;
drop policy if exists "athlete notes staff" on public.athlete_notes;
create policy "athlete notes staff" on public.athlete_notes for all
  using (public.is_staff()) with check (public.is_staff());

-- ---------- Promemoria settimanale staff (pannello "Da tenere d'occhio") ----------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'a360-staff-weekly-check') then
    perform cron.unschedule('a360-staff-weekly-check');
  end if;
  perform cron.schedule('a360-staff-weekly-check', '0 8 * * 1', $job$
    insert into public.notifications (user_id, type, title, body, view)
    select p.id, 'reminder', 'Controllo settimanale squadra 📋',
      'Dai un''occhiata al pannello "Da tenere d''occhio" in Area Staff: presenze, punteggi e autovalutazioni mancanti.',
      'staff'
    from public.profiles p
    where p.status = 'approved' and (p.role = 'admin' or p.category in ('direzione', 'staff'))
  $job$);
end $$;

-- ############################################################
-- ### wave3.sql
-- ############################################################

-- ============================================================
-- ONDATA 3 — Mente e benessere
--   - Diario privato (solo l'atleta e l'ADMIN, non il mister)
--   - Check-in pre-allenamento ("come arrivi oggi?") + push pomeridiana
--   - Push "tra un'ora si gioca" per la routine pre-partita
--   - Indisponibilità/infortuni: sospende promemoria e alert per l'atleta
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede calendar.sql e push.sql già eseguiti.)
-- ============================================================

-- ---------- Diario privato ----------
create table if not exists public.athlete_diary (
  id         uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  mood       int check (mood between 1 and 5),
  energy     int check (energy between 1 and 5),
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists athlete_diary_athlete_idx on public.athlete_diary(athlete_id, created_at desc);

alter table public.athlete_diary enable row level security;
drop policy if exists "diary select" on public.athlete_diary;
drop policy if exists "diary insert own" on public.athlete_diary;
drop policy if exists "diary delete own" on public.athlete_diary;
create policy "diary select" on public.athlete_diary for select using (
  public.is_admin() or exists (
    select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id
    where p.id = auth.uid() and a.id = athlete_diary.athlete_id
  )
);
-- Nota: qualificare SEMPRE la colonna della riga in inserimento
-- (athlete_diary.athlete_id). Scritta come "athlete_id" nuda, Postgres la
-- risolve con profiles.athlete_id (text) della subquery invece che con la
-- riga in inserimento (uuid) → "operator does not exist: uuid = text",
-- che faceva fallire e rollbackare l'intero script.
create policy "diary insert own" on public.athlete_diary for insert with check (
  exists (
    select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id
    where p.id = auth.uid() and a.id = athlete_diary.athlete_id
  )
);
create policy "diary delete own" on public.athlete_diary for delete using (
  public.is_admin() or exists (
    select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id
    where p.id = auth.uid() and a.id = athlete_diary.athlete_id
  )
);

-- ---------- Check-in pre-allenamento ----------
create table if not exists public.checkins (
  id            uuid primary key default gen_random_uuid(),
  athlete_id    uuid not null references public.athletes(id) on delete cascade,
  checkin_date  date not null default ((now() at time zone 'Europe/Rome')::date),
  energy        int not null check (energy between 1 and 5),
  created_at    timestamptz not null default now(),
  unique (athlete_id, checkin_date)
);
alter table public.checkins enable row level security;
drop policy if exists "checkins read" on public.checkins;
drop policy if exists "checkins write own" on public.checkins;
create policy "checkins read" on public.checkins for select using (public.is_approved());
create policy "checkins write own" on public.checkins for all using (
  exists (select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id where p.id = auth.uid() and a.id = checkins.athlete_id)
) with check (
  exists (select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id where p.id = auth.uid() and a.id = checkins.athlete_id)
);

-- ---------- Indisponibilità / infortuni ----------
create table if not exists public.unavailability (
  id         uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  until      date not null,
  reason     text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
alter table public.unavailability enable row level security;
drop policy if exists "unavailability read" on public.unavailability;
drop policy if exists "unavailability write" on public.unavailability;
create policy "unavailability read" on public.unavailability for select using (public.is_approved());
create policy "unavailability write" on public.unavailability for all using (
  public.is_staff() or exists (select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id where p.id = auth.uid() and a.id = unavailability.athlete_id)
) with check (
  public.is_staff() or exists (select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id where p.id = auth.uid() and a.id = unavailability.athlete_id)
);

-- Un'atleta è indisponibile oggi?
create or replace function public.athlete_is_unavailable(p_athlete_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.unavailability u
    where u.athlete_id = p_athlete_id and u.until >= (now() at time zone 'Europe/Rome')::date
  );
$$;

-- ---------- Promemoria eventi: escludi chi è indisponibile ----------
create or replace function public.send_event_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare
  e record;
  label text;
  sent integer := 0;
begin
  perform public.generate_recurring_events();
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

-- ---------- Check-in pomeridiano (allenamenti di oggi) ----------
alter table public.events add column if not exists checkin_prompt_sent boolean not null default false;

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
    insert into public.notifications (user_id, type, title, body, view)
    select p.id, 'reminder', 'Come arrivi all''allenamento? 💬',
      'Fai il check-in veloce prima delle ' || to_char(e.starts_at at time zone 'Europe/Rome', 'HH24:MI') || '.',
      'home'
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

-- ---------- Push "tra un'ora si gioca" (routine pre-partita) ----------
alter table public.events add column if not exists prematch_prompt_sent boolean not null default false;

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
    insert into public.notifications (user_id, type, title, body, view)
    select p.id, 'reminder', 'Tra poco si gioca 🏐',
      'Prepara la testa: apri la routine pre-partita di 3 minuti.', 'home'
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

do $$
begin
  if exists (select 1 from cron.job where jobname = 'a360-checkin-prompts') then perform cron.unschedule('a360-checkin-prompts'); end if;
  perform cron.schedule('a360-checkin-prompts', '5 * * * *', $job$select public.send_checkin_prompts()$job$);
  if exists (select 1 from cron.job where jobname = 'a360-prematch-prompts') then perform cron.unschedule('a360-prematch-prompts'); end if;
  perform cron.schedule('a360-prematch-prompts', '*/15 * * * *', $job$select public.send_prematch_prompts()$job$);
end $$;

-- ############################################################
-- ### wave4.sql
-- ############################################################

-- ============================================================
-- ONDATA 4 — Vita di squadra
--   - Applausi/reazioni sul profilo delle compagne
--   - Compleanni (data di nascita + promemoria del giorno)
--   - Sondaggi rapidi (creano anche le atlete)
--   - Album foto di squadra (caricano tutte, upload compresso lato client)
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede push.sql già eseguito.)
-- ============================================================

-- ---------- Applausi sul profilo ----------
create table if not exists public.profile_reactions (
  id                uuid primary key default gen_random_uuid(),
  target_athlete_id uuid not null references public.athletes(id) on delete cascade,
  from_user_id      uuid not null references auth.users(id) on delete cascade,
  created_at        timestamptz not null default now(),
  unique (target_athlete_id, from_user_id)
);
alter table public.profile_reactions enable row level security;
drop policy if exists "reactions read" on public.profile_reactions;
drop policy if exists "reactions insert own" on public.profile_reactions;
drop policy if exists "reactions delete own" on public.profile_reactions;
create policy "reactions read" on public.profile_reactions for select using (public.is_approved());
create policy "reactions insert own" on public.profile_reactions for insert with check (from_user_id = auth.uid());
create policy "reactions delete own" on public.profile_reactions for delete using (from_user_id = auth.uid());

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('dm', 'team_chat', 'assessment', 'approval', 'goal', 'reminder', 'event', 'reaction', 'star', 'drop'));

create or replace function public.notify_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target_profile uuid;
  from_name text;
begin
  select p.id into target_profile from public.profiles p join public.athletes a on a.identifier = p.athlete_id
    where a.id = new.target_athlete_id limit 1;
  if target_profile is null or target_profile = new.from_user_id then return new; end if;
  select coalesce(first_name, 'Una compagna') into from_name from public.profiles where id = new.from_user_id;
  insert into public.notifications (user_id, type, title, body, view)
  values (target_profile, 'reaction', from_name || ' ti ha applaudita 👏', 'Vai a vedere il tuo profilo!', 'profilo');
  return new;
end;
$$;
drop trigger if exists on_reaction_notify on public.profile_reactions;
create trigger on_reaction_notify after insert on public.profile_reactions
  for each row execute function public.notify_reaction();

-- ---------- Compleanni ----------
alter table public.athletes add column if not exists birth_date date;

create or replace function public.send_birthday_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare
  a record;
  sent integer := 0;
begin
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

do $$
begin
  if exists (select 1 from cron.job where jobname = 'a360-birthdays') then perform cron.unschedule('a360-birthdays'); end if;
  perform cron.schedule('a360-birthdays', '0 8 * * *', $job$select public.send_birthday_reminders()$job$);
end $$;

-- ---------- Sondaggi rapidi ----------
create table if not exists public.polls (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  options    jsonb not null,             -- ["Sì", "No"] oppure più opzioni
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.poll_votes (
  id            uuid primary key default gen_random_uuid(),
  poll_id       uuid not null references public.polls(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  option_index  int not null,
  created_at    timestamptz not null default now(),
  unique (poll_id, user_id)
);
alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;
drop policy if exists "polls read" on public.polls;
drop policy if exists "polls insert" on public.polls;
drop policy if exists "polls delete own or staff" on public.polls;
create policy "polls read" on public.polls for select using (public.is_approved());
create policy "polls insert" on public.polls for insert with check (public.is_approved() and created_by = auth.uid());
create policy "polls delete own or staff" on public.polls for delete using (created_by = auth.uid() or public.is_staff());

drop policy if exists "poll votes read" on public.poll_votes;
drop policy if exists "poll votes write own" on public.poll_votes;
create policy "poll votes read" on public.poll_votes for select using (public.is_approved());
create policy "poll votes write own" on public.poll_votes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Album foto (upload compresso lato client, salvato come data URL) ----------
create table if not exists public.photos (
  id          uuid primary key default gen_random_uuid(),
  url         text not null,
  caption     text,
  uploaded_by uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
alter table public.photos enable row level security;
drop policy if exists "photos read" on public.photos;
drop policy if exists "photos insert" on public.photos;
drop policy if exists "photos delete own or staff" on public.photos;
create policy "photos read" on public.photos for select using (public.is_approved());
create policy "photos insert" on public.photos for insert with check (public.is_approved() and uploaded_by = auth.uid());
create policy "photos delete own or staff" on public.photos for delete using (uploaded_by = auth.uid() or public.is_staff());

-- ############################################################
-- ### wave5.sql
-- ############################################################

-- ============================================================
-- ONDATA 5 — Utilità e stile
--   - Motto personale (RPC dedicata: mai un update diretto su profiles,
--     per non rischiare di toccare status/ruolo per sbaglio)
--   - Scadenze certificati (solo date, nessun documento caricato)
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

alter table public.profiles add column if not exists motto text;

create or replace function public.set_my_motto(p_motto text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set motto = nullif(trim(p_motto), '') where id = auth.uid();
end;
$$;

-- ---------- Scadenze certificati ----------
create table if not exists public.certificates (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.athletes(id) on delete cascade,
  label       text not null,
  expires_on  date not null,
  reminded_30 boolean not null default false,
  reminded_7  boolean not null default false,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
alter table public.certificates enable row level security;
drop policy if exists "certificates staff" on public.certificates;
create policy "certificates staff" on public.certificates for all
  using (public.is_staff()) with check (public.is_staff());

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
    insert into public.notifications (user_id, type, title, body, view)
    select p.id, 'reminder', 'Certificato in scadenza ⏰',
      c.label || ' scade il ' || to_char(c.expires_on, 'DD/MM/YYYY'), 'staff'
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

do $$
begin
  if exists (select 1 from cron.job where jobname = 'a360-certificate-reminders') then perform cron.unschedule('a360-certificate-reminders'); end if;
  perform cron.schedule('a360-certificate-reminders', '0 8 * * *', $job$select public.send_certificate_reminders()$job$);
end $$;

-- ############################################################
-- ### gamify-a.sql
-- ############################################################

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
-- Guardia: se wave3.sql (tabella checkins) non è ancora stato eseguito,
-- salta solo questo trigger invece di bloccare tutto lo script — capitato
-- davvero il 2026-08-14, "checkins" non esisteva su questo progetto.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'checkins') then
    drop trigger if exists on_checkin_points on public.checkins;
    create trigger on_checkin_points after insert on public.checkins
      for each row execute function public.award_points_checkin();
  else
    raise notice 'Tabella public.checkins non trovata: esegui wave3.sql, poi ri-lancia questo script per completare i punti sul check-in.';
  end if;
end $$;

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
  check (type in ('dm', 'team_chat', 'assessment', 'approval', 'goal', 'reminder', 'event', 'reaction', 'star', 'drop'));

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

-- ############################################################
-- ### gamify-b.sql
-- ############################################################

-- ============================================================
-- GAMIFICATION — ONDATA B: quiz settimanale con classifica.
-- Le domande vivono nel codice (src/quiz.js), qui c'è solo il punteggio:
-- un tentativo a settimana per persona, +2 punti partecipazione per ogni
-- risposta esatta (trigger, non insert dal client sui punti).
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede gamify-a.sql già eseguito — tabella participation_points.)
-- ============================================================

create table if not exists public.quiz_scores (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  week_key    text not null,
  score       int not null,
  total       int not null,
  created_at  timestamptz not null default now(),
  unique (user_id, week_key)
);
alter table public.quiz_scores enable row level security;
drop policy if exists "quiz read" on public.quiz_scores;
drop policy if exists "quiz insert own" on public.quiz_scores;
create policy "quiz read" on public.quiz_scores for select using (public.is_approved());
create policy "quiz insert own" on public.quiz_scores for insert with check (user_id = auth.uid());
-- Niente update/delete dal client: un tentativo a settimana, il vincolo
-- unique(user_id, week_key) basta a impedirne un secondo.

create or replace function public.award_points_quiz()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.score > 0 then
    insert into public.participation_points (user_id, action, points) values (new.user_id, 'quiz', new.score * 2);
  end if;
  return new;
end;
$$;
drop trigger if exists on_quiz_points on public.quiz_scores;
create trigger on_quiz_points after insert on public.quiz_scores
  for each row execute function public.award_points_quiz();

-- Classifica della settimana corrente (nomi + punteggio), senza allargare
-- la RLS di profiles — stesso pattern di todays_daily_moments().
create or replace function public.weekly_quiz_leaderboard(p_week_key text)
returns table(user_id uuid, first_name text, score int, total int) language sql security definer stable as $$
  select qs.user_id, p.first_name, qs.score, qs.total
  from public.quiz_scores qs
  join public.profiles p on p.id = qs.user_id
  where qs.week_key = p_week_key and p.status = 'approved'
  order by qs.score desc, qs.created_at asc;
$$;

-- ############################################################
-- ### gamify-c.sql
-- ############################################################

-- ============================================================
-- GAMIFICATION — ONDATA C: reazioni sull'album foto + personalizzazione
-- sbloccabile coi punti partecipazione (un "flair" accanto al nome, scelto
-- da una lista che si allarga salendo di livello — solo lato client, RPC
-- dedicata come già fatto per il motto: mai un update diretto su profiles).
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede wave4.sql — tabella photos — e wave5.sql già eseguiti.)
-- ============================================================

-- ---------- Reazioni sulle foto dell'album ----------
create table if not exists public.photo_reactions (
  photo_id   uuid not null references public.photos(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);
alter table public.photo_reactions enable row level security;
drop policy if exists "photo reactions read" on public.photo_reactions;
drop policy if exists "photo reactions write own" on public.photo_reactions;
create policy "photo reactions read" on public.photo_reactions for select using (public.is_approved());
create policy "photo reactions write own" on public.photo_reactions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Flair personale (emoji decorativa accanto al nome) ----------
alter table public.profiles add column if not exists flair text;

create or replace function public.set_my_flair(p_flair text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set flair = nullif(trim(p_flair), '') where id = auth.uid();
end;
$$;

-- ############################################################
-- ### gamify-d.sql
-- ############################################################

-- ============================================================
-- GAMIFICATION — ONDATA D: la stella del mister.
-- Un riconoscimento che SOLO lo staff può assegnare (mai automatico, mai
-- comprabile coi punti): una stella con una micro-motivazione, visibile
-- nello storico del profilo e notificata (push) all'atleta.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede notifications.sql e push.sql già eseguiti.)
-- ============================================================

create table if not exists public.stars (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.athletes(id) on delete cascade,
  note        text not null,
  given_by    uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
create index if not exists stars_athlete_idx on public.stars(athlete_id);

alter table public.stars enable row level security;
drop policy if exists "stars read" on public.stars;
drop policy if exists "stars insert staff" on public.stars;
drop policy if exists "stars delete staff" on public.stars;
-- Solo staff dal 26/09/2026: le ragazze vedono solo le valutazioni (staff-texts-private.sql).
create policy "stars read" on public.stars for select using (public.is_staff());
create policy "stars insert staff" on public.stars for insert with check (public.is_staff());
create policy "stars delete staff" on public.stars for delete using (public.is_staff());

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('dm', 'team_chat', 'assessment', 'approval', 'goal', 'reminder', 'event', 'reaction', 'star', 'drop'));

create or replace function public.notify_star()
returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  select p.id into uid from public.profiles p join public.athletes a on a.identifier = p.athlete_id where a.id = new.athlete_id limit 1;
  if uid is not null then
    insert into public.notifications (user_id, type, title, body, view)
    values (uid, 'star', 'Il mister ti ha dato una stella! ⭐', new.note, 'profilo');
  end if;
  return new;
end;
$$;
-- Nessuna notifica all'atleta dal 26/09/2026: portava il testo della stella.
drop trigger if exists on_star_notify on public.stars;

-- ############################################################
-- ### card-background.sql
-- ############################################################

-- ============================================================
-- Sfondo personalizzato delle card condivisibili.
-- L'atleta carica una sua foto: viene ridotta e compressa dal browser
-- (~700px, JPEG) e salvata come testo, come gia' si fa per l'avatar e per
-- l'album foto — nessun bucket Storage da configurare.
--
-- Scrittura tramite RPC dedicata, MAI update diretto su profiles: cosi'
-- non si rischia di toccare status/role per sbaglio (stesso principio di
-- set_my_motto e set_my_flair).
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

alter table public.profiles add column if not exists card_bg text;
-- 'sfumata' (default) = foto molto sfocata, fa da atmosfera
-- 'nitida'            = foto riconoscibile dietro al velo navy
alter table public.profiles add column if not exists card_bg_style text;

create or replace function public.set_my_card_bg(p_bg text, p_style text default 'sfumata')
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set card_bg = nullif(p_bg, ''),
      card_bg_style = case when p_style in ('sfumata', 'nitida') then p_style else 'sfumata' end
  where id = auth.uid();
end;
$$;

-- ############################################################
-- ### team-feed.sql
-- ############################################################

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

drop function if exists public.team_feed(int);

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

-- ############################################################
-- ### avatar-2d.sql
-- ############################################################

-- ============================================================
-- ONDATA 2 (mondo magico) — avatar componibile: risolve anche la privacy
-- di chi non vuole la foto vera in giro (usabile anche sulle card
-- condivisibili al posto della foto).
-- RPC dedicata, mai un update diretto su profiles (stesso principio di
-- set_my_motto/set_my_flair/set_my_card_bg).
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

alter table public.profiles add column if not exists avatar_config jsonb;

create or replace function public.set_my_avatar_config(p_config jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set avatar_config = p_config where id = auth.uid();
end;
$$;

-- ############################################################
-- ### cameretta.sql
-- ############################################################

-- ============================================================
-- ONDATA 2 (mondo magico) — "la cameretta": campi identitari sul profilo,
-- oltre al motto già esistente. RPC dedicata, mai un update diretto su
-- profiles (stesso principio di set_my_motto/set_my_flair).
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

alter table public.profiles add column if not exists song_title text;
alter table public.profiles add column if not exists song_artist text;
alter table public.profiles add column if not exists ritual text;
alter table public.profiles add column if not exists nickname text;
-- Fino a 3 id badge scelti da lei per la vetrina in cima al profilo
-- (badge_ids è testo libero perché i badge sono calcolati lato client,
-- non hanno una tabella: qui salviamo solo quali mostrare).
alter table public.profiles add column if not exists showcase_badges jsonb;

create or replace function public.set_my_cameretta(
  p_song_title text, p_song_artist text, p_ritual text, p_nickname text, p_showcase jsonb
)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set
    song_title = nullif(trim(p_song_title), ''),
    song_artist = nullif(trim(p_song_artist), ''),
    ritual = nullif(trim(p_ritual), ''),
    nickname = nullif(trim(p_nickname), ''),
    showcase_badges = p_showcase
  where id = auth.uid();
end;
$$;

-- ############################################################
-- ### figurine.sql
-- ############################################################

-- ============================================================
-- ONDATA 3 (mondo magico) — l'album figurine: la killer feature scelta
-- nell'intervista. Ogni 20 punti partecipazione maturati si guadagna un
-- pacchetto da 3 figurine (compagne scelte a caso, doppioni possibili). Lo
-- scambio dei doppioni resta manuale in chat (cosi' l'ha voluto Danilo:
-- niente sistema di trade automatico da far quadrare).
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede gamify-a.sql — tabella participation_points — già eseguito.)
-- ============================================================

alter table public.profiles add column if not exists figurine_packs int not null default 0;
alter table public.profiles add column if not exists figurine_bank int not null default 0;

create table if not exists public.figurine_collection (
  owner_id          uuid not null references auth.users(id) on delete cascade,
  athlete_id        uuid not null references public.athletes(id) on delete cascade,
  copies            int not null default 0,
  first_obtained_at timestamptz,
  primary key (owner_id, athlete_id)
);
alter table public.figurine_collection enable row level security;
drop policy if exists "figurine read own or staff" on public.figurine_collection;
create policy "figurine read own or staff" on public.figurine_collection for select
  using (owner_id = auth.uid() or public.is_staff());
-- Niente insert/update dal client: solo la RPC open_figurine_pack (security
-- definer) scrive qui, cosi' nessuno si regala pacchetti a piacere.

-- ---------- Un pacchetto ogni 20 punti maturati ----------
create or replace function public.award_figurine_pack()
returns trigger language plpgsql security definer set search_path = public as $$
declare bank int;
begin
  update public.profiles set figurine_bank = figurine_bank + new.points
  where id = new.user_id
  returning figurine_bank into bank;
  if bank is not null and bank >= 20 then
    update public.profiles
    set figurine_packs = figurine_packs + (bank / 20), figurine_bank = bank % 20
    where id = new.user_id;
  end if;
  return new;
end;
$$;
drop trigger if exists on_participation_pack on public.participation_points;
create trigger on_participation_pack after insert on public.participation_points
  for each row execute function public.award_figurine_pack();

-- ---------- Apertura pacchetto: 3 compagne a caso, doppioni possibili ----------
create or replace function public.open_figurine_pack()
returns table(athlete_id uuid, identifier text, was_new boolean)
language plpgsql security definer set search_path = public as $$
declare
  avail int;
  pick record;
  already boolean;
begin
  select figurine_packs into avail from public.profiles where id = auth.uid() for update;
  if avail is null or avail < 1 then
    raise exception 'Nessun pacchetto disponibile';
  end if;
  update public.profiles set figurine_packs = figurine_packs - 1 where id = auth.uid();

  for pick in
    select a.id, a.identifier from public.athletes a where a.active order by random() limit 3
  loop
    select exists(select 1 from public.figurine_collection where owner_id = auth.uid() and figurine_collection.athlete_id = pick.id) into already;
    insert into public.figurine_collection (owner_id, athlete_id, copies, first_obtained_at)
    values (auth.uid(), pick.id, 1, now())
    on conflict (owner_id, athlete_id) do update set copies = figurine_collection.copies + 1;
    athlete_id := pick.id; identifier := pick.identifier; was_new := not already;
    return next;
  end loop;
end;
$$;

-- ############################################################
-- ### riti-stagioni.sql
-- ############################################################

-- ============================================================
-- ONDATA 4 (mondo magico) — riti di squadra: il grido pre-partita, la
-- parola della partita, la capsula di inizio stagione, canzone della
-- settimana + playlist. Scope tagliato onestamente rispetto all'intervista
-- completa: feste stagionali (solo banner, non un ritema completo), drop
-- rari casuali ed easter egg nascosti non fatti in questa ondata — troppo
-- rischio di sembrare incompiuti nel tempo che restava.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede calendar.sql — tabella events — già eseguito.)
-- ============================================================

-- ---------- Il grido pre-partita ----------
create table if not exists public.pregame_cheers (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  emoji      text not null,
  note       text,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
alter table public.pregame_cheers enable row level security;
drop policy if exists "cheers read" on public.pregame_cheers;
drop policy if exists "cheers write own" on public.pregame_cheers;
create policy "cheers read" on public.pregame_cheers for select using (public.is_approved());
create policy "cheers write own" on public.pregame_cheers for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- La parola della partita ----------
create table if not exists public.match_words (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  word       text not null,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
alter table public.match_words enable row level security;
drop policy if exists "words read" on public.match_words;
drop policy if exists "words write own" on public.match_words;
create policy "words read" on public.match_words for select using (public.is_approved());
create policy "words write own" on public.match_words for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- La capsula di inizio stagione ----------
create table if not exists public.season_capsules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  message     text not null,
  unlock_date date not null,
  created_at  timestamptz not null default now()
);
alter table public.season_capsules enable row level security;
drop policy if exists "capsule own" on public.season_capsules;
create policy "capsule own" on public.season_capsules for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Canzone della settimana + playlist di squadra ----------
-- Chiave/valore generico, basso rischio: cosmetico, non dati sensibili.
create table if not exists public.team_settings (
  key        text primary key,
  value      text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.team_settings enable row level security;
drop policy if exists "settings read" on public.team_settings;
drop policy if exists "settings write" on public.team_settings;
create policy "settings read" on public.team_settings for select using (public.is_approved());
create policy "settings write" on public.team_settings for all
  using (public.is_approved()) with check (public.is_approved());

-- ############################################################
-- ### drops.sql
-- ############################################################

-- ============================================================
-- ONDATA 4 bis (mondo magico) — drop rari casuali: 5% di possibilità a
-- ogni check-in di trovare un bonus di punti, con una notifica push
-- dedicata. Trigger SEPARATO da award_points_checkin (gamify-a.sql): non
-- lo tocca, si aggiunge e basta.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede gamify-a.sql — checkins/participation_points — già eseguito.)
-- ============================================================

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('dm', 'team_chat', 'assessment', 'approval', 'goal', 'reminder', 'event', 'reaction', 'star', 'drop'));

create or replace function public.award_random_drop()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  pts int := 15;
begin
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
drop trigger if exists on_checkin_drop on public.checkins;
create trigger on_checkin_drop after insert on public.checkins
  for each row execute function public.award_random_drop();

-- ############################################################
-- ### gamify-athlete-only.sql
-- ############################################################

-- ============================================================
-- Chiude un buco reale: i punti partecipazione (e quindi streak, livelli,
-- pacchetti figurine) dovevano essere SOLO delle atlete, ma quattro azioni
-- (conferma presenza, applauso dato, momento del giorno, quiz) assegnavano
-- punti a chiunque le facesse, staff compreso. Nella pratica: un membro
-- dello staff che rispondeva al quiz o metteva un'emoji nel "momento del
-- giorno" accumulava punti a sua insaputa e prima o poi si sarebbe trovato
-- ad aprire un pacchetto di figurine — collezionando le carte delle sue
-- atlete. Da evitare sempre, a maggior ragione con minorenni.
--
-- Ridefinisce SOLO le funzioni trigger (non le tabelle): sicuro da
-- ri-eseguire, non serve rilanciare gamify-a.sql/gamify-b.sql per intero.
-- Incolla nel SQL Editor di Supabase e premi Run.
-- (Richiede gamify-a.sql e gamify-b.sql già eseguiti.)
-- ============================================================

create or replace function public.award_points_rsvp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.profiles where id = new.user_id and category = 'atleta') then
    insert into public.participation_points (user_id, action, points) values (new.user_id, 'rsvp', 3);
  end if;
  return new;
end;
$$;

create or replace function public.award_points_applause()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.profiles where id = new.from_user_id and category = 'atleta') then
    insert into public.participation_points (user_id, action, points) values (new.from_user_id, 'applause_given', 2);
  end if;
  return new;
end;
$$;

create or replace function public.award_points_daily_moment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.profiles where id = new.user_id and category = 'atleta') then
    insert into public.participation_points (user_id, action, points) values (new.user_id, 'daily_moment', 4);
  end if;
  return new;
end;
$$;

create or replace function public.award_points_quiz()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.score > 0 and exists (select 1 from public.profiles where id = new.user_id and category = 'atleta') then
    insert into public.participation_points (user_id, action, points) values (new.user_id, 'quiz', new.score * 2);
  end if;
  return new;
end;
$$;

-- checkin e self_assessment erano già naturalmente riservati alle atlete
-- (passano sempre da athlete_id → profiles.athlete_id): nessuna modifica.

-- ############################################################
-- ### wow-1.sql
-- ############################################################

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

-- ############################################################
-- ### wow-2.sql
-- ############################################################

-- ============================================================
-- ONDATA WOW-2 — streak di coppia + tamagotchi di squadra.
-- (Il Wrapped animato non serve SQL: riusa i dati già esistenti.)
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede gamify-a.sql — checkins/participation_points — già eseguito.)
-- ============================================================

-- ---------- Streak di coppia (stile "friend streak" di Duolingo) ----------
-- Una riga = "ho scelto questa compagna". La coppia è CONFERMATA solo se
-- entrambe si sono scelte a vicenda — mai un abbinamento a insaputa altrui.
create table if not exists public.streak_buddies (
  athlete_id       uuid primary key references public.athletes(id) on delete cascade,
  buddy_athlete_id uuid not null references public.athletes(id) on delete cascade,
  created_at       timestamptz not null default now(),
  check (athlete_id <> buddy_athlete_id)
);
alter table public.streak_buddies enable row level security;
drop policy if exists "buddies read" on public.streak_buddies;
drop policy if exists "buddies write own" on public.streak_buddies;
create policy "buddies read" on public.streak_buddies for select using (public.is_approved());
create policy "buddies write own" on public.streak_buddies for all using (
  exists (select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id where p.id = auth.uid() and a.id = streak_buddies.athlete_id)
) with check (
  -- athlete_id va SEMPRE qualificato: qui dentro c'è profiles nel FROM e
  -- Postgres lo risolverebbe come profiles.athlete_id (testo) invece della
  -- riga in inserimento (uuid) → "operator does not exist: uuid = text".
  exists (select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id where p.id = auth.uid() and a.id = streak_buddies.athlete_id)
);

create or replace function public.my_streak_buddy()
returns table(buddy_athlete_id uuid, buddy_name text, confirmed boolean, couple_streak int)
language plpgsql security definer stable as $$
declare
  my_id uuid;
  pick_id uuid;
  their_pick uuid;
  is_conf boolean := false;
  n int := 0;
  cur date := (now() at time zone 'Europe/Rome')::date;
begin
  select a.id into my_id from public.profiles p join public.athletes a on a.identifier = p.athlete_id where p.id = auth.uid();
  if my_id is null then return; end if;

  select sb.buddy_athlete_id into pick_id from public.streak_buddies sb where sb.athlete_id = my_id;
  if pick_id is null then return; end if;

  select sb2.buddy_athlete_id into their_pick from public.streak_buddies sb2 where sb2.athlete_id = pick_id;
  is_conf := (their_pick = my_id);

  if is_conf then
    if not exists (select 1 from public.checkins where checkins.athlete_id = my_id and checkin_date = cur)
       or not exists (select 1 from public.checkins where checkins.athlete_id = pick_id and checkin_date = cur) then
      cur := cur - 1;
    end if;
    loop
      exit when not exists (select 1 from public.checkins where checkins.athlete_id = my_id and checkin_date = cur);
      exit when not exists (select 1 from public.checkins where checkins.athlete_id = pick_id and checkin_date = cur);
      n := n + 1;
      cur := cur - 1;
    end loop;
  end if;

  select a.identifier into buddy_name from public.athletes a where a.id = pick_id;
  buddy_athlete_id := pick_id;
  confirmed := is_conf;
  couple_streak := n;
  return next;
end;
$$;

-- ---------- Il tamagotchi di squadra: cresce coi punti di TUTTE ----------
-- Volutamente un solo numero aggregato: nessuna classifica, nessun
-- confronto tra atlete — o cresce il gruppo o niente.
create or replace function public.team_growth()
returns bigint language sql security definer stable as $$
  select coalesce(sum(points), 0) from public.participation_points;
$$;

-- ############################################################
-- ### admin-status.sql
-- ############################################################

-- ============================================================
-- Admin: oltre all'ultimo accesso, mostra anche se l'app è installata
-- sul telefono e se le notifiche push sono attive, per ogni membro.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede last-seen.sql e push.sql già eseguiti.)
-- ============================================================

alter table public.profiles add column if not exists pwa_installed boolean not null default false;

-- touch_last_seen ora accetta anche lo stato "installata": chiamata una
-- volta ad ogni apertura con il risultato di matchMedia("(display-mode:
-- standalone)"). Il parametro è opzionale (default null = non aggiornarlo)
-- per restare compatibile con eventuali chiamate senza argomenti.
create or replace function public.touch_last_seen(p_installed boolean default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set
    last_seen_at = now(),
    pwa_installed = case when p_installed is not null then p_installed else pwa_installed end
  where id = auth.uid();
end;
$$;

-- Chi ha almeno una subscription push attiva: solo gli id, mai gli
-- endpoint/chiavi (quelli restano privati a ciascuno, vedi push.sql).
create or replace function public.staff_push_status()
returns table(user_id uuid) language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Solo lo staff può vedere lo stato delle notifiche';
  end if;
  return query select distinct ps.user_id from public.push_subscriptions ps;
end;
$$;

-- ############################################################
-- ### q1.sql
-- ############################################################

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

-- ############################################################
-- ### q3.sql
-- ############################################################

-- ============================================================
-- Ondata Q3 — Il ciclo della stagione
-- 1) Pagellone finale: un commento di chiusura stagione scritto dal mister,
--    una riga per atleta (si aggiorna, non si accumula).
-- 2) Link di invito: lo staff genera un link, la nuova arrivata si registra
--    da sola e arriva già approvata e collegata all'atleta.
-- (Il "Wrapped di stagione" non serve nulla di nuovo: riusa participation_points.)
-- (L'"archiviazione soft" riusa il toggle attiva/disattivata già esistente
--  su athletes, solo lato client — vedi src/data.js.)
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

-- ---------- Pagellone finale ----------
create table if not exists public.season_reports (
  id         uuid primary key default gen_random_uuid(),
  athlete_id uuid not null unique references public.athletes(id) on delete cascade,
  content    text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.season_reports enable row level security;
drop policy if exists "season reports read" on public.season_reports;
drop policy if exists "season reports write staff" on public.season_reports;
-- Solo staff dal 26/09/2026: le ragazze vedono solo le valutazioni (staff-texts-private.sql).
create policy "season reports read" on public.season_reports for select using (public.is_staff());
create policy "season reports write staff" on public.season_reports for all using (public.is_staff()) with check (public.is_staff());

create or replace function public.set_season_report_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists on_season_report_update on public.season_reports;
create trigger on_season_report_update before update on public.season_reports
  for each row execute function public.set_season_report_updated_at();

-- ---------- Link di invito ----------
create table if not exists public.invite_links (
  token              text primary key default replace(gen_random_uuid()::text, '-', ''),
  athlete_identifier text references public.athletes(identifier) on delete set null,
  category           text not null default 'atleta' check (category in ('direzione', 'staff', 'atleta')),
  created_by         uuid references auth.users(id),
  used_by            uuid references auth.users(id),
  used_at            timestamptz,
  created_at         timestamptz not null default now(),
  expires_at         timestamptz not null default now() + interval '30 days'
);
alter table public.invite_links enable row level security;
-- Nessuna policy client: solo le due RPC sotto (security definer) toccano
-- questa tabella, come participation_points e le altre tabelle "motore".

create or replace function public.create_invite_link(p_athlete_identifier text default null, p_category text default 'atleta')
returns text language plpgsql security definer set search_path = public as $$
declare
  v_token text;
begin
  if not public.is_staff() then
    raise exception 'Solo lo staff può generare inviti';
  end if;
  insert into public.invite_links (athlete_identifier, category, created_by)
  values (p_athlete_identifier, p_category, auth.uid())
  returning token into v_token;
  return v_token;
end;
$$;

create or replace function public.redeem_invite_link(p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  r public.invite_links;
begin
  select * into r from public.invite_links where token = p_token and used_by is null and expires_at > now();
  if not found then
    return false;
  end if;
  update public.profiles set status = 'approved', category = r.category,
    athlete_id = coalesce(r.athlete_identifier, athlete_id)
  where id = auth.uid();
  update public.invite_links set used_by = auth.uid(), used_at = now() where token = p_token;
  return true;
end;
$$;

-- ############################################################
-- ### q4.sql
-- ############################################################

-- ============================================================
-- Ondata Q4 — Clip video di partita
-- Stesso modello dell'album foto (chiunque approvato carica, solo squadra
-- e staff vedono): qui però si tratta di un LINK (YouTube/Drive non in
-- elenco pubblico, o simili), non di un file caricato — un video anche
-- breve pesa troppo per essere salvato come testo in Postgres (a differenza
-- delle foto, non c'è compressione lato client praticabile), e non è
-- configurato nessun bucket Storage in questo progetto.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

create table if not exists public.video_clips (
  id          uuid primary key default gen_random_uuid(),
  url         text not null,
  caption     text,
  uploaded_by uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
alter table public.video_clips enable row level security;
drop policy if exists "video clips read" on public.video_clips;
drop policy if exists "video clips insert" on public.video_clips;
drop policy if exists "video clips delete own or staff" on public.video_clips;
create policy "video clips read" on public.video_clips for select using (public.is_approved());
create policy "video clips insert" on public.video_clips for insert with check (public.is_approved() and uploaded_by = auth.uid());
create policy "video clips delete own or staff" on public.video_clips for delete using (uploaded_by = auth.uid() or public.is_staff());

-- ############################################################
-- ### notification-anchors.sql
-- ############################################################

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

-- ############################################################
-- ### notifications-delete.sql
-- ############################################################

-- ============================================================
-- Permette a ciascuno di ELIMINARE le proprie notifiche (la "x" nel
-- menu della campanella). Finora c'erano solo le policy di lettura e
-- di aggiornamento: senza questa, una delete non dà errore ma non
-- cancella niente (RLS attiva senza policy = zero righe interessate).
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede notifications.sql già eseguito.)
-- ============================================================

drop policy if exists "notifications delete own" on public.notifications;
create policy "notifications delete own" on public.notifications
  for delete using (user_id = auth.uid());

-- ############################################################
-- ### mvp.sql
-- ############################################################

-- ============================================================
-- "Giocatore del match": dopo ogni partita il mister sceglie un'atleta.
-- Una sola per evento (vincolo unique), assegnata SOLO dallo staff.
--
-- Nota sul tipo di notifica: si riusa 'star' invece di aggiungere 'mvp'.
-- Il vincolo notifications_type_check viene ricreato da sette script
-- diversi, e ogni tipo nuovo va allineato in tutti (vedi la sezione
-- "trappole" nel CLAUDE.md). Concettualmente è comunque un riconoscimento
-- del mister, come la stella: cambia solo l'ancoraggio.
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede calendar.sql, notifications.sql e push.sql già eseguiti.)
-- ============================================================

create table if not exists public.match_mvp (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null unique references public.events(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  note       text,
  given_by   uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists match_mvp_athlete_idx on public.match_mvp(athlete_id);

alter table public.match_mvp enable row level security;
drop policy if exists "mvp read" on public.match_mvp;
drop policy if exists "mvp write staff" on public.match_mvp;
create policy "mvp read" on public.match_mvp for select using (public.is_approved());
create policy "mvp write staff" on public.match_mvp for all
  using (public.is_staff()) with check (public.is_staff());

create or replace function public.notify_mvp()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  ev  record;
begin
  select p.id into uid
  from public.profiles p
  join public.athletes a on a.identifier = p.athlete_id
  where a.id = new.athlete_id
  limit 1;

  select title, starts_at into ev from public.events where id = new.event_id;

  if uid is not null then
    insert into public.notifications (user_id, type, title, body, view, meta)
    values (
      uid, 'star', 'Sei tu il giocatore del match! 🏐',
      coalesce(new.note, coalesce('Contro ' || ev.title, 'Complimenti per la partita!')),
      'profilo', jsonb_build_object('anchor', 'a360-mvp')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_mvp_notify on public.match_mvp;
create trigger on_mvp_notify after insert on public.match_mvp
  for each row execute function public.notify_mvp();

-- ############################################################
-- ### settings.sql
-- ############################################################

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

-- ############################################################
-- ### wall.sql
-- ############################################################

-- ============================================================
-- Bacheca personale (stile Facebook, adattata a un gruppo di minorenni):
-- ognuno pubblica SOLO sulla propria bacheca — pensiero, foto, umore o il
-- repost di un badge/momento — le altre reagiscono solo con un cuore.
-- Lo staff pubblica solo testo (bacheca "istituzionale": niente foto
-- personali, niente tag). Lo staff può sempre eliminare qualunque post o
-- tag, oltre all'autrice stessa — rete di sicurezza silenziosa.
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede notifications.sql già eseguito, per la notifica di tag.)
-- ============================================================

create table if not exists public.wall_posts (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references auth.users(id) on delete cascade,
  kind         text not null check (kind in ('text', 'photo', 'mood', 'repost')),
  body         text,
  photo_url    text,
  mood_emoji   text,
  repost_kind  text check (repost_kind in ('badge', 'moment') or repost_kind is null),
  repost_label text,
  repost_emoji text,
  created_at   timestamptz not null default now()
);
create index if not exists wall_posts_author_idx on public.wall_posts(author_id, created_at desc);

create table if not exists public.wall_post_tags (
  post_id        uuid not null references public.wall_posts(id) on delete cascade,
  tagged_user_id uuid not null references auth.users(id) on delete cascade,
  removed        boolean not null default false,
  created_at     timestamptz not null default now(),
  primary key (post_id, tagged_user_id)
);

create table if not exists public.wall_post_reactions (
  post_id    uuid not null references public.wall_posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.wall_posts enable row level security;
alter table public.wall_post_tags enable row level security;
alter table public.wall_post_reactions enable row level security;

drop policy if exists "wall posts read" on public.wall_posts;
drop policy if exists "wall posts insert own" on public.wall_posts;
drop policy if exists "wall posts delete own or staff" on public.wall_posts;
create policy "wall posts read" on public.wall_posts for select using (public.is_approved());
create policy "wall posts insert own" on public.wall_posts for insert with check (public.is_approved() and author_id = auth.uid());
create policy "wall posts delete own or staff" on public.wall_posts for delete using (author_id = auth.uid() or public.is_staff());

drop policy if exists "wall tags read" on public.wall_post_tags;
drop policy if exists "wall tags insert by author" on public.wall_post_tags;
drop policy if exists "wall tags remove own" on public.wall_post_tags;
drop policy if exists "wall tags delete own or staff" on public.wall_post_tags;
create policy "wall tags read" on public.wall_post_tags for select using (public.is_approved());
-- Solo l'autrice del post può taggare, e solo mentre lo pubblica.
create policy "wall tags insert by author" on public.wall_post_tags for insert with check (
  exists (select 1 from public.wall_posts wp where wp.id = wall_post_tags.post_id and wp.author_id = auth.uid())
);
-- La persona taggata può solo togliersi il tag (mai cambiarlo per un'altra).
create policy "wall tags remove own" on public.wall_post_tags for update
  using (tagged_user_id = auth.uid()) with check (tagged_user_id = auth.uid());
create policy "wall tags delete own or staff" on public.wall_post_tags for delete using (tagged_user_id = auth.uid() or public.is_staff());

drop policy if exists "wall reactions read" on public.wall_post_reactions;
drop policy if exists "wall reactions insert own" on public.wall_post_reactions;
drop policy if exists "wall reactions delete own" on public.wall_post_reactions;
create policy "wall reactions read" on public.wall_post_reactions for select using (public.is_approved());
create policy "wall reactions insert own" on public.wall_post_reactions for insert with check (public.is_approved() and user_id = auth.uid());
create policy "wall reactions delete own" on public.wall_post_reactions for delete using (user_id = auth.uid());

-- ---------- Regole di contenuto: lo staff resta "istituzionale" ----------
-- Difesa in profondità: anche se l'interfaccia non offre foto/umore/tag
-- allo staff, il database non li accetta comunque.
create or replace function public.check_wall_post_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_athlete boolean;
begin
  select (p.category = 'atleta' and p.role <> 'admin') into is_athlete
  from public.profiles p where p.id = new.author_id;
  if not coalesce(is_athlete, false) and new.kind <> 'text' then
    raise exception 'I post istituzionali possono essere solo testo';
  end if;
  return new;
end;
$$;
drop trigger if exists on_wall_post_check on public.wall_posts;
create trigger on_wall_post_check before insert on public.wall_posts
  for each row execute function public.check_wall_post_rules();

create or replace function public.check_wall_tag_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  post_author uuid;
  is_athlete boolean;
begin
  select author_id into post_author from public.wall_posts where id = new.post_id;
  select (p.category = 'atleta' and p.role <> 'admin') into is_athlete
  from public.profiles p where p.id = post_author;
  if not coalesce(is_athlete, false) then
    raise exception 'I post istituzionali non possono taggare nessuno';
  end if;
  return new;
end;
$$;
drop trigger if exists on_wall_tag_check on public.wall_post_tags;
create trigger on_wall_tag_check before insert on public.wall_post_tags
  for each row execute function public.check_wall_tag_rules();

-- ---------- Notifica quando vieni taggata (riusa il tipo 'reaction', già
-- ammesso, per non dover riallineare notifications_type_check in 7 file) ----------
create or replace function public.notify_wall_tag()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  tagger_name text;
begin
  select nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '') into tagger_name
  from public.profiles p join public.wall_posts wp on wp.author_id = p.id
  where wp.id = new.post_id;

  insert into public.notifications (user_id, type, title, body, view, meta)
  values (new.tagged_user_id, 'reaction', coalesce(tagger_name, 'Qualcuno') || ' ti ha taggata in un pensiero 🏷️',
    'Vai a vedere il post', 'profilo', jsonb_build_object('anchor', 'a360-wall'));
  return new;
end;
$$;
drop trigger if exists on_wall_tag_notify on public.wall_post_tags;
create trigger on_wall_tag_notify after insert on public.wall_post_tags
  for each row execute function public.notify_wall_tag();

-- ############################################################
-- ### profile-page.sql
-- ############################################################

-- ============================================================
-- PAGINA PROFILO STILE FACEBOOK — foto di copertina, cliccabilità estesa
-- a staff/admin (non solo atlete), feed "Novità" agganciato al profilo
-- (uuid) invece che al solo identificativo atleta.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede team-feed.sql e athlete-card.sql già eseguiti.)
-- ============================================================

-- ---------- Foto di copertina (stesso principio dell'avatar: testo in DB) ----------
alter table public.profiles add column if not exists cover_url text;

create or replace function public.set_my_cover(p_cover text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set cover_url = nullif(trim(p_cover), '') where id = auth.uid();
end;
$$;

-- ---------- chat_roster(): ora include TUTTI gli approvati, non solo   ----------
-- ---------- atlete/admin — serve perché ora anche lo staff ha un       ----------
-- ---------- profilo cliccabile.                                       ----------
drop function if exists public.chat_roster();

create or replace function public.chat_roster()
returns table(
  id uuid, name text, avatar_url text, category text,
  athlete_id text, ruolo text, jersey_number text, instagram text, facebook text
)
language sql security definer stable as $$
  select p.id,
         nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
         p.avatar_url, p.category, p.athlete_id, p.ruolo, p.jersey_number, p.instagram, p.facebook
  from public.profiles p
  where p.status = 'approved'
    and public.is_chat_member();
$$;
revoke all on function public.chat_roster() from public, anon;
grant execute on function public.chat_roster() to authenticated;

-- ---------- team_feed(): actor_id diventa l'uuid del profilo (non più    ----------
-- ---------- l'identificativo testuale dell'atleta) — così il feed può   ----------
-- ---------- aprire il profilo di CHIUNQUE, non solo delle atlete.       ----------
create or replace function public.team_feed(p_limit int default 40)
returns table(kind text, actor_name text, actor_id text, headline text, detail text, created_at timestamptz)
language sql security definer stable as $$
  select * from (
    select 'moment'::text as kind, p.first_name as actor_name, p.id::text as actor_id, dm.emoji as headline, dm.note as detail, dm.created_at
    from public.daily_moments dm
    join public.profiles p on p.id = dm.user_id
    where p.status = 'approved'

    union all

    select 'star', coalesce(p.first_name, a.identifier), p.id::text, 'stella'::text, s.note, s.created_at
    from public.stars s
    join public.athletes a on a.id = s.athlete_id
    left join public.profiles p on p.athlete_id = a.identifier and p.status = 'approved'

    union all

    select 'photo', p.first_name, p.id::text, 'foto'::text, ph.caption, ph.created_at
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

-- ############################################################
-- ### social-links.sql
-- ############################################################

-- ============================================================
-- Più social nei link in cima al profilo: TikTok, YouTube, Snapchat
-- (oltre a Instagram/Facebook già esistenti). Stessa RPC di prima,
-- allargata — drop esplicito prima del create per evitare che restino
-- due versioni della funzione con firme diverse (vedi CLAUDE.md, trappola
-- già incontrata con team_feed).
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede profile-fields.sql già eseguito.)
-- ============================================================

alter table public.profiles
  add column if not exists tiktok   text,
  add column if not exists youtube  text,
  add column if not exists snapchat text;

drop function if exists public.update_my_profile(text, text, text, text, text, text);

create or replace function public.update_my_profile(
  p_phone text default null,
  p_facebook text default null,
  p_instagram text default null,
  p_jersey_number text default null,
  p_ruolo text default null,
  p_avatar_url text default null,
  p_tiktok text default null,
  p_youtube text default null,
  p_snapchat text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set
    phone = p_phone,
    facebook = p_facebook,
    instagram = p_instagram,
    jersey_number = p_jersey_number,
    ruolo = p_ruolo,
    avatar_url = p_avatar_url,
    tiktok = p_tiktok,
    youtube = p_youtube,
    snapchat = p_snapchat
  where id = auth.uid();
end;
$$;

revoke all on function public.update_my_profile(text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text, text, text, text, text, text, text) to authenticated;

-- ############################################################
-- ### fix-last-seen.sql
-- ############################################################

-- ============================================================
-- CORREZIONE "ultimo accesso: mai" (21/09/2026)
--
-- Causa: la funzione touch_last_seen(p_installed) esiste (admin-status.sql
-- era stato eseguito), ma la colonna profiles.last_seen_at no — last-seen.sql
-- non era mai stato eseguito. Ogni apertura dell'app chiamava la funzione,
-- che falliva con "column last_seen_at does not exist", e il client ignorava
-- l'errore: nessun avviso, e l'ultimo accesso restava vuoto per tutte.
--
-- Questo script aggiunge SOLO la colonna mancante. Non usare last-seen.sql:
-- creerebbe una seconda versione di touch_last_seen senza parametri, cioè
-- due funzioni con lo stesso nome (vedi la trappola dei vincoli ricreati,
-- CLAUDE.md § Script SQL).
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

alter table public.profiles add column if not exists last_seen_at timestamptz;

-- Verifica: deve stampare una riga con entrambe le colonne.
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
  and column_name in ('last_seen_at', 'pwa_installed');

-- ############################################################
-- ### members-directory.sql
-- ############################################################

-- ============================================================
-- Pagina "Atlete": elenco di TUTTI i membri approvati (atlete, staff,
-- direzione, admin) con foto e ruolo, per aprire il profilo di ciascuno.
--
-- Perché non riusare chat_roster(): quella è protetta da is_chat_member(),
-- vera solo per admin e atlete — il mister vedrebbe un elenco vuoto.
-- Qui la guardia è is_approved(): chiunque sia dentro la squadra vede
-- gli altri. La chat resta com'è.
--
-- Volutamente NON esposti: email, telefono, ultimo accesso, punteggi.
-- Il telefono resta visibile solo nel profilo, a chi lo ha compilato.
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

create or replace function public.members_directory()
returns table(
  id uuid, name text, avatar_url text, category text, role text,
  athlete_id text, ruolo text, jersey_number text, flair text
)
language sql security definer stable as $$
  select p.id,
         nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
         p.avatar_url, p.category, p.role, p.athlete_id, p.ruolo, p.jersey_number, p.flair
  from public.profiles p
  where p.status = 'approved'
    and public.is_approved()
  order by p.first_name nulls last, p.last_name nulls last;
$$;

revoke all on function public.members_directory() from public, anon;
grant execute on function public.members_directory() to authenticated;

-- ############################################################
-- ### season-metrics.sql
-- ############################################################

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

-- ############################################################
-- ### avatars-names.sql
-- ############################################################

-- ============================================================
-- AVATAR DELLA GALLERIA OVUNQUE + NOMI DELLE ATLETE ABBREVIATI (21/09/2026)
--
-- 1. member_avatars(): le quindici atlete hanno scelto tutte l'avatar dalla
--    galleria (profiles.avatar_config), nessuna ha caricato una foto
--    (avatar_url). Le funzioni che alimentano squadra, chat, messaggi e
--    profilo restituiscono solo avatar_url, quindi ovunque tranne sul
--    proprio profilo si vedevano le iniziali. Questa funzione dà la
--    configurazione dell'avatar di chi è approvato: l'immagine la ricava il
--    client (src/memberAvatars.js). Nessun dato personale in più.
--
-- 2. members_directory(): nella pagina "La squadra" le atlete compaiono come
--    nome e iniziale del cognome ("Giulia R."), decisione di Danilo — sono
--    minorenni. L'abbreviazione avviene QUI, così il cognome intero non
--    arriva nemmeno al telefono delle compagne. Staff e direzione restano
--    con nome e cognome. Stessa firma di prima: nessuna seconda versione.
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

create or replace function public.member_avatars()
returns table(id uuid, avatar_config jsonb)
language sql security definer stable set search_path = public as $$
  select p.id, p.avatar_config
  from public.profiles p
  where p.status = 'approved'
    and p.avatar_config is not null
    and public.is_approved();
$$;

revoke all on function public.member_avatars() from public, anon;
grant execute on function public.member_avatars() to authenticated;

create or replace function public.members_directory()
returns table(
  id uuid, name text, avatar_url text, category text, role text,
  athlete_id text, ruolo text, jersey_number text, flair text
)
language sql security definer stable as $$
  select p.id,
         case
           when p.category = 'atleta' then
             nullif(trim(coalesce(trim(p.first_name), '')
               || coalesce(' ' || upper(left(nullif(trim(p.last_name), ''), 1)) || '.', '')), '')
           else
             nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '')
         end,
         p.avatar_url, p.category, p.role, p.athlete_id, p.ruolo, p.jersey_number, p.flair
  from public.profiles p
  where p.status = 'approved'
    and public.is_approved()
  order by p.first_name nulls last, p.last_name nulls last;
$$;

revoke all on function public.members_directory() from public, anon;
grant execute on function public.members_directory() to authenticated;

-- Verifica: devono comparire entrambe le funzioni.
select proname from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('member_avatars', 'members_directory');

-- ############################################################
-- ### chat-names.sql
-- ############################################################

-- ============================================================
-- NOMI DELLE ATLETE ABBREVIATI ANCHE IN CHAT (21/09/2026)
--
-- Decisione di Danilo: le atlete (minorenni) compaiono come "Nome C.",
-- come già nella pagina La squadra (avatars-names.sql). In chat il nome
-- non viene calcolato: è salvato dentro ogni messaggio al momento
-- dell'invio (chat_messages.author, direct_messages.sender_name /
-- recipient_name), e da lì finisce anche nelle notifiche. Quindi:
--
--   1. display_name(uid): il nome da mostrare, in un posto solo.
--   2. Trigger che al salvataggio sostituiscono il nome mandato dal
--      telefono con quello giusto — vale anche per chi ha ancora la
--      versione vecchia dell'app in memoria.
--   3. chat_roster() (elenco "A chi vuoi scrivere?") con i nomi brevi.
--   4. Correzione UNA TANTUM dei messaggi e delle notifiche già esistenti:
--      cambia solo il nome del mittente/destinatario, MAI il testo scritto.
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

-- 1. Il nome da mostrare
create or replace function public.display_name(u uuid)
returns text language sql security definer stable set search_path = public as $$
  select case
    when p.category = 'atleta' then
      nullif(trim(coalesce(trim(p.first_name), '')
        || coalesce(' ' || upper(left(nullif(trim(p.last_name), ''), 1)) || '.', '')), '')
    else
      nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '')
  end
  from public.profiles p where p.id = u;
$$;
revoke all on function public.display_name(uuid) from public, anon;

-- 2. Trigger al salvataggio
create or replace function public.chat_author_name()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is not null then
    new.author := coalesce(public.display_name(new.user_id), new.author);
  end if;
  return new;
end;
$$;
drop trigger if exists chat_author_name on public.chat_messages;
create trigger chat_author_name before insert or update of author on public.chat_messages
  for each row execute function public.chat_author_name();

create or replace function public.dm_names()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.sender_id is not null then
    new.sender_name := coalesce(public.display_name(new.sender_id), new.sender_name);
  end if;
  if new.recipient_id is not null then
    new.recipient_name := coalesce(public.display_name(new.recipient_id), new.recipient_name);
  end if;
  return new;
end;
$$;
drop trigger if exists dm_names on public.direct_messages;
create trigger dm_names before insert or update of sender_name, recipient_name on public.direct_messages
  for each row execute function public.dm_names();

-- 3. Elenco chat. Esistono due versioni storiche con colonne diverse
-- (chat-v2.sql e athlete-card.sql): "create or replace" non può cambiare le
-- colonne, quindi si ricrea la più completa. Il client legge un sottoinsieme.
drop function if exists public.chat_roster();
create function public.chat_roster()
returns table(
  id uuid, name text, avatar_url text, category text,
  athlete_id text, ruolo text, jersey_number text, instagram text, facebook text
)
language sql security definer stable set search_path = public as $$
  select p.id, public.display_name(p.id),
         p.avatar_url, p.category, p.athlete_id, p.ruolo, p.jersey_number, p.instagram, p.facebook
  from public.profiles p
  where p.status = 'approved' and (p.role = 'admin' or p.category = 'atleta')
    and public.is_chat_member();
$$;
revoke all on function public.chat_roster() from public, anon;
grant execute on function public.chat_roster() to authenticated;

-- 4. Correzione dei dati già salvati (solo i nomi, mai i testi)
update public.chat_messages m
   set author = public.display_name(m.user_id)
 where m.user_id is not null
   and public.display_name(m.user_id) is not null
   and m.author is distinct from public.display_name(m.user_id);

update public.direct_messages d
   set sender_name    = coalesce(public.display_name(d.sender_id), d.sender_name),
       recipient_name = coalesce(public.display_name(d.recipient_id), d.recipient_name)
 where d.sender_name    is distinct from coalesce(public.display_name(d.sender_id), d.sender_name)
    or d.recipient_name is distinct from coalesce(public.display_name(d.recipient_id), d.recipient_name);

-- Notifiche già arrivate ("Giulia Rossi ha scritto in bacheca"): si sostituisce
-- il nome completo di ciascuna atleta con quello breve, nel titolo, nel testo
-- dell'avviso e nel mittente registrato.
do $$
declare r record;
begin
  for r in
    select trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as intero,
           public.display_name(p.id) as breve
    from public.profiles p
    where p.category = 'atleta' and nullif(trim(p.last_name), '') is not null
  loop
    if r.breve is not null and r.intero <> r.breve then
      update public.notifications
         set title = replace(title, r.intero, r.breve),
             body  = replace(body, r.intero, r.breve),
             meta  = replace(meta::text, r.intero, r.breve)::jsonb
       where title like '%' || r.intero || '%'
          or body  like '%' || r.intero || '%'
          or meta::text like '%' || r.intero || '%';
    end if;
  end loop;
end $$;

-- Verifica: nessun messaggio con un nome diverso da quello previsto (deve dare 0).
select count(*) as messaggi_da_correggere
from public.chat_messages m
where m.user_id is not null and m.author is distinct from public.display_name(m.user_id);

-- ############################################################
-- ### evening-training-only.sql
-- ############################################################

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

-- ############################################################
-- ### study.sql
-- ############################################################

-- ============================================================
-- QUESTIONARIO "CONOSCIAMOCI MEGLIO" — dati per lo studio (25/09/2026)
--
-- Al prossimo accesso ogni atleta trova un questionario breve: data di
-- nascita (obbligatoria, finisce anche in athletes.birth_date e quindi nei
-- compleanni), storia sportiva, fisico di base, scuola e tempo, abitudini.
-- Ogni campo tranne la data si può saltare. Si ripropone finché non è
-- salvato una volta (src/components/StudyWizard.jsx).
--
-- Riservatezza: sono dati di minorenni, alcuni delicati (sonno, telefono).
--   - la tabella la leggono SOLO l'atleta stessa e l'admin (is_admin()):
--     non il mister, non la direzione, non le compagne;
--   - nessuno scrive direttamente: solo la funzione set_my_study(), che
--     scrive la riga dell'atleta collegata a chi è autenticata;
--   - la data di nascita resta visibile allo staff come prima (compleanni).
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

create table if not exists public.athlete_study (
  athlete_id         uuid primary key references public.athletes(id) on delete cascade,
  -- storia sportiva
  volley_years       smallint check (volley_years between 0 and 20),
  start_age          smallint check (start_age between 3 and 20),
  trainings_per_week smallint check (trainings_per_week between 1 and 14),
  other_sports       text check (char_length(other_sports) <= 120),
  -- fisico di base
  height_cm          smallint check (height_cm between 120 and 215),
  dominant_hand      text check (dominant_hand in ('destra', 'sinistra', 'ambidestra')),
  -- scuola e tempo
  school_type        text check (school_type in ('liceo', 'tecnico', 'professionale', 'universita', 'lavoro', 'altro')),
  school_year        smallint check (school_year between 1 and 5),
  travel_minutes     smallint check (travel_minutes between 0 and 240),
  -- abitudini
  sleep_hours        numeric(3,1) check (sleep_hours between 3 and 13),
  phone_hours        numeric(3,1) check (phone_hours between 0 and 16),
  completed_at       timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.athlete_study enable row level security;

drop policy if exists "athlete_study read own or admin" on public.athlete_study;
create policy "athlete_study read own or admin" on public.athlete_study
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.athletes a
      join public.profiles p on p.athlete_id = a.identifier
      where a.id = athlete_study.athlete_id and p.id = auth.uid() and p.status = 'approved'
    )
  );
-- Nessuna policy di insert/update/delete: si scrive solo da set_my_study().

-- La riga di chi è autenticata (vuota se non l'ha ancora compilato).
-- Sola lettura: può sondarla anche lo Stato del sistema.
create or replace function public.my_study()
returns table(
  birth_date date, volley_years smallint, start_age smallint, trainings_per_week smallint,
  other_sports text, height_cm smallint, dominant_hand text, school_type text,
  school_year smallint, travel_minutes smallint, sleep_hours numeric, phone_hours numeric,
  completed_at timestamptz
)
language sql security definer stable set search_path = public as $$
  select a.birth_date, s.volley_years, s.start_age, s.trainings_per_week, s.other_sports,
         s.height_cm, s.dominant_hand, s.school_type, s.school_year, s.travel_minutes,
         s.sleep_hours, s.phone_hours, s.completed_at
  from public.profiles p
  join public.athletes a on a.identifier = p.athlete_id
  left join public.athlete_study s on s.athlete_id = a.id
  where p.id = auth.uid() and p.status = 'approved';
$$;
revoke all on function public.my_study() from public, anon;
grant execute on function public.my_study() to authenticated;

create or replace function public.set_my_study(
  p_birth_date date,
  p_volley_years int default null, p_start_age int default null,
  p_trainings_per_week int default null, p_other_sports text default null,
  p_height_cm int default null, p_dominant_hand text default null,
  p_school_type text default null, p_school_year int default null,
  p_travel_minutes int default null,
  p_sleep_hours numeric default null, p_phone_hours numeric default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  aid uuid;
begin
  select a.id into aid
  from public.profiles p join public.athletes a on a.identifier = p.athlete_id
  where p.id = auth.uid() and p.status = 'approved' and p.category = 'atleta';
  if aid is null then
    raise exception 'Il tuo profilo non è ancora collegato a un''atleta: chiedi allo staff.';
  end if;
  -- Età plausibile per una squadra giovanile/senior: fra 8 e 45 anni.
  if p_birth_date is null
     or p_birth_date > (current_date - interval '8 years')
     or p_birth_date < (current_date - interval '45 years') then
    raise exception 'Controlla la data di nascita.';
  end if;

  update public.athletes set birth_date = p_birth_date where id = aid;

  insert into public.athlete_study as s (
    athlete_id, volley_years, start_age, trainings_per_week, other_sports, height_cm, dominant_hand,
    school_type, school_year, travel_minutes, sleep_hours, phone_hours, completed_at, updated_at)
  values (aid, p_volley_years, p_start_age, p_trainings_per_week, nullif(trim(p_other_sports), ''),
    p_height_cm, p_dominant_hand, p_school_type, p_school_year, p_travel_minutes,
    p_sleep_hours, p_phone_hours, now(), now())
  on conflict (athlete_id) do update set
    volley_years = excluded.volley_years, start_age = excluded.start_age,
    trainings_per_week = excluded.trainings_per_week, other_sports = excluded.other_sports,
    height_cm = excluded.height_cm, dominant_hand = excluded.dominant_hand,
    school_type = excluded.school_type, school_year = excluded.school_year,
    travel_minutes = excluded.travel_minutes, sleep_hours = excluded.sleep_hours,
    phone_hours = excluded.phone_hours, updated_at = now();
end;
$$;
revoke all on function public.set_my_study(date, int, int, int, text, int, text, text, int, int, numeric, numeric) from public, anon;
grant execute on function public.set_my_study(date, int, int, int, text, int, text, text, int, int, numeric, numeric) to authenticated;

-- Verifica: devono comparire la tabella e le due funzioni.
select to_regclass('public.athlete_study') as tabella,
       (select count(*) from pg_proc where pronamespace = 'public'::regnamespace
          and proname in ('my_study', 'set_my_study')) as funzioni_su_2;

-- ############################################################
-- ### assessment-notes-private.sql
-- ############################################################

-- ============================================================
-- NOTE DEL RILEVAMENTO: SOLO ALLO STAFF (26/09/2026)
--
-- Decisione di Danilo: le note che il mister scrive nel rilevamento non le
-- vede nessuna atleta. Prima stavano in assessments.note, e la lettura di
-- assessments è permessa a chiunque sia approvato: ogni atleta riceveva sul
-- telefono le note di tutte (nel profilo la sua, in Andamento quelle delle
-- compagne). Nascondere lo schermo non bastava: il dato arrivava comunque.
--
-- Ora le note vivono in assessment_notes, leggibile e scrivibile solo dallo
-- staff (is_staff(): admin, direzione, staff — il mister è staff). La
-- colonna assessments.note resta per compatibilità ma è sempre vuota: un
-- trigger sposta subito qualunque nota scritta lì (anche da un'app non
-- ancora aggiornata sul telefono del mister).
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

create table if not exists public.assessment_notes (
  assessment_id uuid primary key references public.assessments(id) on delete cascade,
  note          text not null,
  updated_at    timestamptz not null default now()
);

alter table public.assessment_notes enable row level security;

drop policy if exists "assessment notes staff" on public.assessment_notes;
create policy "assessment notes staff" on public.assessment_notes
  for all using (public.is_staff()) with check (public.is_staff());

-- Qualunque nota scritta in assessments finisce qui, e da lì sparisce.
create or replace function public.move_assessment_note()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if nullif(trim(new.note), '') is not null then
    insert into public.assessment_notes (assessment_id, note, updated_at)
    values (new.id, trim(new.note), now())
    on conflict (assessment_id) do update set note = excluded.note, updated_at = now();
    update public.assessments set note = null where id = new.id;
  end if;
  return null;
end;
$$;

drop trigger if exists move_assessment_note on public.assessments;
create trigger move_assessment_note
  after insert or update of note on public.assessments
  for each row when (new.note is not null)
  execute function public.move_assessment_note();

-- Le note già scritte (il primo rilevamento del 25/09) si spostano ora.
insert into public.assessment_notes (assessment_id, note)
select id, trim(note) from public.assessments
where nullif(trim(note), '') is not null
on conflict (assessment_id) do update set note = excluded.note, updated_at = now();

update public.assessments set note = null where note is not null;

-- Verifica: note spostate e nessuna nota rimasta leggibile dalle atlete.
select (select count(*) from public.assessment_notes) as note_riservate,
       (select count(*) from public.assessments where note is not null) as note_ancora_visibili_deve_essere_0;

-- ############################################################
-- ### staff-texts-private.sql
-- ############################################################

-- ============================================================
-- STELLE E PAGELLE: SOLO ALLO STAFF (26/09/2026)
--
-- Decisione di Danilo: le ragazze vedono solo le valutazioni (i numeri).
-- Nessun testo scritto dallo staff su di loro arriva alle atlete:
--   - note del rilevamento  → già riservate (assessment-notes-private.sql)
--   - stella del mister     → prima la motivazione la leggeva tutta la
--                             squadra, e arrivava come notifica sul telefono
--   - pagella di fine stagione → prima la leggeva l'atleta interessata
-- Ora le leggono solo admin, direzione e staff (is_staff()). La notifica
-- "Il mister ti ha dato una stella!" non parte più: portava il testo.
--
-- I messaggi (chat, promemoria dello staff) restano: sono comunicazioni
-- rivolte a loro, non giudizi su di loro.
--
-- Stesse regole anche in gamify-d.sql e q3.sql, così rieseguirli non
-- riapre niente. Incolla nel SQL Editor e premi Run. Sicuro da ri-eseguire.
-- ============================================================

-- Stelle
drop policy if exists "stars read" on public.stars;
create policy "stars read" on public.stars for select using (public.is_staff());
drop trigger if exists on_star_notify on public.stars;

-- Pagelle di fine stagione
drop policy if exists "season reports read" on public.season_reports;
create policy "season reports read" on public.season_reports for select using (public.is_staff());

-- Verifica: entrambe le letture devono dire "solo staff", e nessun trigger sulle stelle.
select tablename, policyname,
       case when qual ilike '%is_staff()%' and qual not ilike '%auth.uid()%' and qual not ilike '%is_approved%'
            then 'solo staff' else 'ATTENZIONE: ' || qual end as chi_legge
from pg_policies
where schemaname = 'public' and tablename in ('stars', 'season_reports', 'assessment_notes') and cmd in ('SELECT', 'ALL')
union all
select 'stars', 'trigger notifica', case when exists (
  select 1 from pg_trigger where tgname = 'on_star_notify' and not tgisinternal) then 'ATTENZIONE: ancora attivo' else 'spento' end;

-- ############################################################
-- ### ruoli-inviti.sql
-- ############################################################

-- ============================================================
-- RUOLI: CHI SI REGISTRA È ATLETA, LO STAFF ENTRA SOLO CON INVITO (27/09/2026)
--
-- Segnalato da Codex e verificato: il modulo di registrazione offriva
-- "Staff" e "Direzione", il trigger copiava quella scelta nel profilo, e
-- un "Approva" distratto concedeva i poteri dello staff (rilevamenti di
-- tutte, note, stelle, pagelle). In più qualunque membro dello staff poteva
-- generare inviti per staff e direzione.
--
--   1. handle_new_user(): ogni registrazione nasce 'atleta', qualunque cosa
--      arrivi nei metadati (anche da un'app vecchia).
--   2. create_invite_link(): lo staff genera inviti solo per atlete; inviti
--      per staff o direzione solo l'admin.
--   3. redeem_invite_link(): riscatto in un'unica operazione, così lo stesso
--      link non può essere usato da due persone nello stesso istante.
--   4. Eventuali richieste non approvate con altra categoria tornano atleta
--      (al 27/09 non ce n'è nessuna). Chi è già approvato non cambia.
--
-- La categoria di un profilo esistente la cambia solo l'admin (policy
-- "admin can update" in schema.sql), come prima.
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

-- 1. Registrazione
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, last_name, email, category)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.email,
    'atleta'   -- mai dai metadati: li scrive chi si registra
  );
  return new;
end;
$$;

-- 2. Creazione inviti
create or replace function public.create_invite_link(p_athlete_identifier text default null, p_category text default 'atleta')
returns text language plpgsql security definer set search_path = public as $$
declare
  v_token text;
begin
  if p_category not in ('atleta', 'staff', 'direzione') then
    raise exception 'Categoria non valida';
  end if;
  if p_category = 'atleta' and not public.is_staff() then
    raise exception 'Solo lo staff può generare inviti';
  end if;
  if p_category <> 'atleta' and not public.is_admin() then
    raise exception 'Gli inviti per staff e direzione li genera solo l''amministratore';
  end if;
  insert into public.invite_links (athlete_identifier, category, created_by)
  values (case when p_category = 'atleta' then p_athlete_identifier end, p_category, auth.uid())
  returning token into v_token;
  return v_token;
end;
$$;
revoke all on function public.create_invite_link(text, text) from public, anon;
grant execute on function public.create_invite_link(text, text) to authenticated;

-- 3. Riscatto atomico
create or replace function public.redeem_invite_link(p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  r public.invite_links;
begin
  if auth.uid() is null then return false; end if;
  -- Segna il link come usato e lo legge nella stessa istruzione: se due
  -- persone lo usano insieme, solo una trova la riga ancora libera.
  update public.invite_links
     set used_by = auth.uid(), used_at = now()
   where token = p_token and used_by is null and expires_at > now()
  returning * into r;
  if not found then
    return false;
  end if;
  update public.profiles set status = 'approved', category = r.category,
    athlete_id = coalesce(r.athlete_identifier, athlete_id)
  where id = auth.uid();
  return true;
end;
$$;
revoke all on function public.redeem_invite_link(text) from public, anon;
grant execute on function public.redeem_invite_link(text) to authenticated;

-- 4. Richieste non approvate: sempre atleta
update public.profiles set category = 'atleta'
where status <> 'approved' and category is distinct from 'atleta';

-- Verifica: la registrazione non legge più la categoria, e nessuna richiesta
-- in attesa ha un ruolo diverso da atleta.
select
  case when position('''atleta''' in pg_get_functiondef('public.handle_new_user()'::regprocedure)) > 0
        and position('category''' in pg_get_functiondef('public.handle_new_user()'::regprocedure)) = 0
       then 'sì' else 'NO' end as registrazione_sempre_atleta,
  case when position('is_admin()' in pg_get_functiondef('public.create_invite_link(text,text)'::regprocedure)) > 0
       then 'sì' else 'NO' end as inviti_staff_solo_admin,
  (select count(*) from public.profiles where status <> 'approved' and category <> 'atleta') as richieste_non_atleta_deve_essere_0;

-- ############################################################
-- ### autovalutazioni-private.sql
-- ############################################################

-- ============================================================
-- AUTOVALUTAZIONI: LA PROPRIA E BASTA (27/09/2026)
--
-- Segnalato da Codex e verificato: self_assessments era leggibile da
-- chiunque fosse approvato. L'app non mostra alle atlete le autovalutazioni
-- delle compagne, ma chi interrogava il database direttamente poteva
-- leggerle. Decisione di Danilo: i PUNTEGGI del mister restano condivisi
-- nella squadra (Confronto), le AUTOVALUTAZIONI no.
--
-- Ora le legge solo l'atleta interessata (via profiles.athlete_id) e lo
-- staff. Scrittura invariata. Allineato anche self-assessments.sql, così
-- rieseguirlo non riapre la lettura.
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

drop policy if exists "self_assessments read" on public.self_assessments;
create policy "self_assessments read" on public.self_assessments for select using (
  public.is_staff() or exists (
    select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id
    where p.id = auth.uid() and p.status = 'approved' and a.id = self_assessments.athlete_id
  )
);

-- Verifica: deve dire "sola lettura propria o staff".
select case when qual ilike '%is_staff()%' and qual ilike '%auth.uid()%' and qual not ilike '%is_approved()%'
            then 'sola lettura propria o staff' else 'ATTENZIONE: ' || qual end as chi_legge_le_autovalutazioni
from pg_policies
where schemaname = 'public' and tablename = 'self_assessments' and policyname = 'self_assessments read';

-- ############################################################
-- ### rilevamenti-doppi.sql
-- ############################################################

-- ============================================================
-- RILEVAMENTI: NIENTE DOPPIONI (27/09/2026)
--
-- Il 25/09 7 rilevamenti su 21 sono stati salvati due volte, identici, a
-- 2–21 secondi di distanza: la conferma compariva in cima al modulo, il
-- pulsante stava in fondo, e da telefono si ripremeva. Due punti nello
-- stesso giorno sporcano l'andamento e lo studio.
--
-- L'app ora blocca il doppio salvataggio, ma (osservazione di Codex) non
-- basta: doppio tocco, rete lenta o due schede aperte la aggirano. Qui il
-- database: un rilevamento con la stessa atleta e gli stessi punteggi di uno
-- salvato meno di 2 minuti prima non viene inserito. I salvataggi per la
-- stessa atleta vengono messi in fila, così anche due richieste nello
-- stesso istante non passano entrambe.
--
-- I 7 doppioni già esistenti NON vengono toccati: si cancellano solo dopo
-- la conferma di Danilo, con un elenco e una copia di sicurezza.
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

create or replace function public.skip_duplicate_assessment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- In fila per atleta: la seconda richiesta aspetta la prima e poi la vede.
  perform pg_advisory_xact_lock(hashtext('assessment:' || new.athlete_id::text));
  if exists (
    select 1 from public.assessments a
    where a.athlete_id = new.athlete_id
      and a.scores = new.scores
      and a.created_at > now() - interval '2 minutes'
  ) then
    return null;   -- già salvato: nessuna riga nuova, nessun errore per chi preme due volte
  end if;
  return new;
end;
$$;

drop trigger if exists skip_duplicate_assessment on public.assessments;
create trigger skip_duplicate_assessment
  before insert on public.assessments
  for each row execute function public.skip_duplicate_assessment();

-- Verifica: il trigger deve esistere.
select case when exists (select 1 from pg_trigger where tgname = 'skip_duplicate_assessment' and not tgisinternal)
            then 'attivo' else 'NON attivo' end as blocco_doppioni;

-- ############################################################
-- ### Solo per la demo
-- ############################################################

-- Le notifiche push di Oasi passano dal server di oasi.danilopuglisi.com:
-- la demo non deve toccarlo. La campanella nell'app funziona lo stesso.
drop trigger if exists on_notification_push on public.notifications;

select 'schema completo installato' as esito,
       (select count(*) from information_schema.tables where table_schema = 'public') as tabelle,
       (select count(*) from pg_proc where pronamespace = 'public'::regnamespace) as funzioni;
