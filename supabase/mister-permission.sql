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
