-- ============================================================
-- ONDATA 4 (mondo magico) — riti di squadra: il grido pre-partita, la
-- parola della partita, la capsula di inizio stagione, canzone della
-- settimana + playlist. Scope tagliato onestamente rispetto all'intervista
-- completa: feste stagionali (solo banner, non un ritema completo), drop
-- rari casuali ed easter egg nascosti non fatti in questa ondata — troppo
-- rischio di sembrare incompiuti nel tempo che restava.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede calendar.sql — tabella events — già eseguito.)
-- ============================================================

-- ---------- Il grido pre-partita ----------
create table if not exists public.pregame_cheers (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  emoji      text not null,
  note       text,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
alter table public.pregame_cheers enable row level security;
drop policy if exists "cheers read" on public.pregame_cheers;
drop policy if exists "cheers write own" on public.pregame_cheers;
create policy "cheers read" on public.pregame_cheers for select using (public.is_approved());
create policy "cheers write own" on public.pregame_cheers for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- La parola della partita ----------
create table if not exists public.match_words (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  word       text not null,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
alter table public.match_words enable row level security;
drop policy if exists "words read" on public.match_words;
drop policy if exists "words write own" on public.match_words;
create policy "words read" on public.match_words for select using (public.is_approved());
create policy "words write own" on public.match_words for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- La capsula di inizio stagione ----------
create table if not exists public.season_capsules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  message     text not null,
  unlock_date date not null,
  created_at  timestamptz not null default now()
);
alter table public.season_capsules enable row level security;
drop policy if exists "capsule own" on public.season_capsules;
create policy "capsule own" on public.season_capsules for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Canzone della settimana + playlist di squadra ----------
-- Chiave/valore generico, basso rischio: cosmetico, non dati sensibili.
create table if not exists public.team_settings (
  key        text primary key,
  value      text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.team_settings enable row level security;
drop policy if exists "settings read" on public.team_settings;
drop policy if exists "settings write" on public.team_settings;
create policy "settings read" on public.team_settings for select using (public.is_approved());
create policy "settings write" on public.team_settings for all
  using (public.is_approved()) with check (public.is_approved());
