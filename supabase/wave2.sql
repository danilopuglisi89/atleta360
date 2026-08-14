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
