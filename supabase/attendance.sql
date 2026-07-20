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
