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
create policy "season reports read" on public.season_reports for select using (
  public.is_staff() or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.athlete_id = (select identifier from public.athletes a where a.id = season_reports.athlete_id)
  )
);
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
