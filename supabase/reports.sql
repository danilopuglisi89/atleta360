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
