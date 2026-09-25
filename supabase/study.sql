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
