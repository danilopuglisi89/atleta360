-- ============================================================
-- Ondata Q4 — Clip video di partita
-- Stesso modello dell'album foto (chiunque approvato carica, solo squadra
-- e staff vedono): qui però si tratta di un LINK (YouTube/Drive non in
-- elenco pubblico, o simili), non di un file caricato — un video anche
-- breve pesa troppo per essere salvato come testo in Postgres (a differenza
-- delle foto, non c'è compressione lato client praticabile), e non è
-- configurato nessun bucket Storage in questo progetto.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

create table if not exists public.video_clips (
  id          uuid primary key default gen_random_uuid(),
  url         text not null,
  caption     text,
  uploaded_by uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
alter table public.video_clips enable row level security;
drop policy if exists "video clips read" on public.video_clips;
drop policy if exists "video clips insert" on public.video_clips;
drop policy if exists "video clips delete own or staff" on public.video_clips;
create policy "video clips read" on public.video_clips for select using (public.is_approved());
create policy "video clips insert" on public.video_clips for insert with check (public.is_approved() and uploaded_by = auth.uid());
create policy "video clips delete own or staff" on public.video_clips for delete using (uploaded_by = auth.uid() or public.is_staff());
