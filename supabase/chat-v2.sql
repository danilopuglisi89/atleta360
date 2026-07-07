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
