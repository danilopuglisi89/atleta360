-- ============================================================
-- RILEVAMENTI: NIENTE DOPPIONI (27/09/2026)
--
-- Il 25/09 7 rilevamenti su 21 sono stati salvati due volte, identici, a
-- 2–21 secondi di distanza: la conferma compariva in cima al modulo, il
-- pulsante stava in fondo, e da telefono si ripremeva. Due punti nello
-- stesso giorno sporcano l'andamento e lo studio.
--
-- L'app ora blocca il doppio salvataggio, ma (osservazione di Codex) non
-- basta: doppio tocco, rete lenta o due schede aperte la aggirano. Qui il
-- database: un rilevamento con la stessa atleta e gli stessi punteggi di uno
-- salvato meno di 2 minuti prima non viene inserito. I salvataggi per la
-- stessa atleta vengono messi in fila, così anche due richieste nello
-- stesso istante non passano entrambe.
--
-- I 7 doppioni già esistenti NON vengono toccati: si cancellano solo dopo
-- la conferma di Danilo, con un elenco e una copia di sicurezza.
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

create or replace function public.skip_duplicate_assessment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- In fila per atleta: la seconda richiesta aspetta la prima e poi la vede.
  perform pg_advisory_xact_lock(hashtext('assessment:' || new.athlete_id::text));
  if exists (
    select 1 from public.assessments a
    where a.athlete_id = new.athlete_id
      and a.scores = new.scores
      and a.created_at > now() - interval '2 minutes'
  ) then
    return null;   -- già salvato: nessuna riga nuova, nessun errore per chi preme due volte
  end if;
  return new;
end;
$$;

drop trigger if exists skip_duplicate_assessment on public.assessments;
create trigger skip_duplicate_assessment
  before insert on public.assessments
  for each row execute function public.skip_duplicate_assessment();

-- Verifica: il trigger deve esistere.
select case when exists (select 1 from pg_trigger where tgname = 'skip_duplicate_assessment' and not tgisinternal)
            then 'attivo' else 'NON attivo' end as blocco_doppioni;
