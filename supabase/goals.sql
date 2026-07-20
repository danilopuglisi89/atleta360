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
    where p.id = auth.uid() and p.status = 'approved' and a.id = athlete_id
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
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('dm', 'team_chat', 'assessment', 'approval', 'goal'));

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
