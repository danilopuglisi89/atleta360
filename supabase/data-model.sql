-- ============================================================
-- Atleta360 — Modello dati su Supabase (atlete, focus, rilevamenti)
-- Sostituisce il Foglio Google come fonte dei dati.
-- Incolla TUTTO nel SQL Editor di Supabase e premi Run. È sicuro da ri-eseguire.
-- (Richiede lo schema di accesso già presente: profiles, is_admin(), ecc.)
-- ============================================================

-- ---------- TABELLE ----------

-- Atlete (la "rosa")
create table if not exists public.athletes (
  id         uuid primary key default gen_random_uuid(),
  identifier text not null unique,      -- iniziali o numero di maglia (es. "Beatrice V.")
  position   text,                       -- ruolo in campo (facoltativo)
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Focus / competenze allenate
create table if not exists public.skills (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,     -- slug stabile usato nei punteggi (es. "reset")
  title       text not null,            -- titolo esteso
  short       text not null,            -- etichetta breve (grafici)
  description text,
  sort_order  int not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Rilevamenti (una compilazione del mister per un'atleta)
create table if not exists public.assessments (
  id         uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  note       text,
  scores     jsonb not null default '{}'::jsonb,  -- { "<skill.key>": 1..10 }
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index if not exists assessments_athlete_idx on public.assessments(athlete_id);

-- ---------- SICUREZZA (RLS) ----------
alter table public.athletes   enable row level security;
alter table public.skills     enable row level security;
alter table public.assessments enable row level security;

-- Helper: utente approvato?
create or replace function public.is_approved()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved');
$$;

-- Helper: staff/direzione o admin?
create or replace function public.is_staff()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.role = 'admin' or p.category in ('direzione', 'staff'))
  );
$$;

-- Lettura: chiunque abbia un account approvato. Scrittura: come indicato.
drop policy if exists "athletes read"  on public.athletes;
drop policy if exists "athletes write" on public.athletes;
create policy "athletes read"  on public.athletes for select using (public.is_approved());
create policy "athletes write" on public.athletes for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "skills read"  on public.skills;
drop policy if exists "skills write" on public.skills;
create policy "skills read"  on public.skills for select using (public.is_approved());
create policy "skills write" on public.skills for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "assessments read"   on public.assessments;
drop policy if exists "assessments insert" on public.assessments;
drop policy if exists "assessments update" on public.assessments;
drop policy if exists "assessments delete" on public.assessments;
create policy "assessments read"   on public.assessments for select using (public.is_approved());
create policy "assessments insert" on public.assessments for insert with check (public.is_staff());
create policy "assessments update" on public.assessments for update using (public.is_staff()) with check (public.is_staff());
create policy "assessments delete" on public.assessments for delete using (public.is_staff());

-- ---------- SEED: i 6 focus attuali ----------
insert into public.skills (key, title, short, description, sort_order) values
  ('reset', 'Resilienza all''Errore (Mental Reset)', 'Reset',
   'Capacità di resettare la mente dopo un errore punto (es. una battuta sbagliata o una ricezione fallita) senza farsi condizionare nei punti successivi.', 1),
  ('focus', 'Focus sotto Pressione (Clutch Performance)', 'Focus',
   'Livello di attenzione e lucidità nei momenti caldi del match (es. i vantaggi o i punti decisivi dal 20 in poi).', 2),
  ('body', 'Body Language e Atteggiamento', 'Body Lang.',
   'La gestione della frustrazione. Presenza visiva in campo, postura positiva ed evitamento di gesti di stizza che scoraggiano la squadra.', 3),
  ('comunicazione', 'Comunicazione e Sostegno', 'Comunic.',
   'Capacità di chiamare la palla ad alta voce, dare indicazioni tattiche chiare e sostenere attivamente le compagne nei momenti di difficoltà.', 4),
  ('coachability', 'Coachability (Ascolto Attivo)', 'Coachab.',
   'Apertura mentale nell''accettare le correzioni tecniche/tattiche del Mister durante i timeout o gli allenamenti, applicandole subito senza protestare.', 5),
  ('tattica', 'Intelligenza Tattica (Problem Solving)', 'Tattica',
   'Capacità di leggere il gioco avversario (es. posizionamento del muro o della difesa) e variare i colpi d''attacco di conseguenza.', 6)
on conflict (key) do nothing;

-- ---------- SEED: atlete esistenti ----------
insert into public.athletes (identifier) values
  ('Beatrice V.'), ('Lorenza F.'), ('Caterina S.')
on conflict (identifier) do nothing;

-- ---------- MIGRAZIONE: rilevamento del 05/06/2026 ----------
insert into public.assessments (athlete_id, scores, created_at)
select a.id, s.scores, s.ts
from (values
  ('Beatrice V.', '{"reset":9,"focus":7,"body":8,"comunicazione":6,"coachability":6,"tattica":7}'::jsonb, timestamptz '2026-06-05 18:23:29+02'),
  ('Lorenza F.',  '{"reset":6,"focus":9,"body":8,"comunicazione":8,"coachability":6,"tattica":5}'::jsonb, timestamptz '2026-06-05 18:23:45+02'),
  ('Caterina S.', '{"reset":8,"focus":8,"body":7,"comunicazione":9,"coachability":6,"tattica":8}'::jsonb, timestamptz '2026-06-05 18:23:56+02')
) as s(identifier, scores, ts)
join public.athletes a on a.identifier = s.identifier
where not exists (select 1 from public.assessments x where x.athlete_id = a.id);
