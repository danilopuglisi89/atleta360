-- ============================================================
-- CAMPIONATO DAL SITO FIPAV (02/10/2026)
--
-- Il server di Oasi legge ogni ora calendario e classifica pubblici del
-- girone (ops/sync-fipav.mjs) e li scrive qui. L'app li mostra: risultato
-- e parziali delle partite, arbitri, giornata, classifica del girone.
-- Nessuna notifica (decisione di Danilo): questi dati non ne generano.
--
-- Solo dati pubblici delle società, nessun dato delle atlete.
-- Incolla nel SQL Editor e premi Run. Sicuro da rieseguire.
-- ============================================================

-- Partite: il collegamento con la gara FIPAV e quello che ne arriva.
alter table public.events add column if not exists fipav_gara  text;   -- numero di gara, es. 19100
alter table public.events add column if not exists fipav_round text;   -- giornata, es. 3
alter table public.events add column if not exists set_scores  text;   -- parziali, Oasi prima: "25-20, 23-25, …"
alter table public.events add column if not exists referees    text;   -- arbitri designati
alter table public.events add column if not exists fipav       jsonb;  -- ultimo dato FIPAV applicato (data, ora, palestra)
create unique index if not exists events_fipav_gara_idx on public.events(fipav_gara) where fipav_gara is not null;

-- Le partite già inserite portano il numero di gara nelle note.
update public.events
set fipav_gara  = substring(notes from 'Gara (\d+)'),
    fipav_round = substring(notes from 'Giornata (\d+)')
where kind = 'match' and fipav_gara is null and notes ~ 'Gara \d+';

-- Classifica del girone: una riga per girone, scritta solo dal server.
create table if not exists public.league_tables (
  girone_id  text primary key,
  title      text,
  teams      jsonb not null default '[]'::jsonb,   -- [{pos, name, pts, played, won, lost, setsWon, setsLost, us}]
  updated_at timestamptz not null default now()
);
alter table public.league_tables enable row level security;
drop policy if exists "league read" on public.league_tables;
create policy "league read" on public.league_tables for select using (public.is_approved());
-- Nessuna policy di scrittura: la scrive solo il server con la chiave di servizio.

select 'campionato FIPAV pronto' as esito,
       (select count(*) from public.events where fipav_gara is not null) as partite_collegate;
