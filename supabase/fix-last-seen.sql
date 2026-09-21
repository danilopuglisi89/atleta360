-- ============================================================
-- CORREZIONE "ultimo accesso: mai" (21/09/2026)
--
-- Causa: la funzione touch_last_seen(p_installed) esiste (admin-status.sql
-- era stato eseguito), ma la colonna profiles.last_seen_at no — last-seen.sql
-- non era mai stato eseguito. Ogni apertura dell'app chiamava la funzione,
-- che falliva con "column last_seen_at does not exist", e il client ignorava
-- l'errore: nessun avviso, e l'ultimo accesso restava vuoto per tutte.
--
-- Questo script aggiunge SOLO la colonna mancante. Non usare last-seen.sql:
-- creerebbe una seconda versione di touch_last_seen senza parametri, cioè
-- due funzioni con lo stesso nome (vedi la trappola dei vincoli ricreati,
-- CLAUDE.md § Script SQL).
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

alter table public.profiles add column if not exists last_seen_at timestamptz;

-- Verifica: deve stampare una riga con entrambe le colonne.
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
  and column_name in ('last_seen_at', 'pwa_installed');
