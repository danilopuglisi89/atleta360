-- ============================================================
-- Permette a ciascuno di ELIMINARE le proprie notifiche (la "x" nel
-- menu della campanella). Finora c'erano solo le policy di lettura e
-- di aggiornamento: senza questa, una delete non dà errore ma non
-- cancella niente (RLS attiva senza policy = zero righe interessate).
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede notifications.sql già eseguito.)
-- ============================================================

drop policy if exists "notifications delete own" on public.notifications;
create policy "notifications delete own" on public.notifications
  for delete using (user_id = auth.uid());
