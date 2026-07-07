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
  role       text not null default 'athlete' check (role in ('athlete', 'admin')),
  status     text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

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
  insert into public.profiles (id, first_name, last_name, email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.email
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
