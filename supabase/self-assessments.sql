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

-- Lettura: chiunque abbia un account approvato (stesso criterio di assessments,
-- il filtro per "solo la mia" è lato app per chi è un'atleta semplice).
drop policy if exists "self_assessments read" on public.self_assessments;
create policy "self_assessments read" on public.self_assessments for select using (public.is_approved());

-- Scrittura: solo l'atleta collegata a quel athlete_id (via profiles.athlete_id),
-- oppure lo staff. Un'atleta autovaluta solo se stessa.
drop policy if exists "self_assessments insert" on public.self_assessments;
drop policy if exists "self_assessments update" on public.self_assessments;
drop policy if exists "self_assessments delete" on public.self_assessments;

create policy "self_assessments insert" on public.self_assessments for insert with check (
  public.is_staff() or exists (
    select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id
    where p.id = auth.uid() and p.status = 'approved' and a.id = athlete_id
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
