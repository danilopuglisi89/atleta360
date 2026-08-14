-- ============================================================
-- GAMIFICATION — ONDATA C: reazioni sull'album foto + personalizzazione
-- sbloccabile coi punti partecipazione (un "flair" accanto al nome, scelto
-- da una lista che si allarga salendo di livello — solo lato client, RPC
-- dedicata come già fatto per il motto: mai un update diretto su profiles).
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede wave4.sql — tabella photos — e wave5.sql già eseguiti.)
-- ============================================================

-- ---------- Reazioni sulle foto dell'album ----------
create table if not exists public.photo_reactions (
  photo_id   uuid not null references public.photos(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);
alter table public.photo_reactions enable row level security;
drop policy if exists "photo reactions read" on public.photo_reactions;
drop policy if exists "photo reactions write own" on public.photo_reactions;
create policy "photo reactions read" on public.photo_reactions for select using (public.is_approved());
create policy "photo reactions write own" on public.photo_reactions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Flair personale (emoji decorativa accanto al nome) ----------
alter table public.profiles add column if not exists flair text;

create or replace function public.set_my_flair(p_flair text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set flair = nullif(trim(p_flair), '') where id = auth.uid();
end;
$$;
