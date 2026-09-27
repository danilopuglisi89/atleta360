-- ============================================================
-- AUTOVALUTAZIONI: LA PROPRIA E BASTA (27/09/2026)
--
-- Segnalato da Codex e verificato: self_assessments era leggibile da
-- chiunque fosse approvato. L'app non mostra alle atlete le autovalutazioni
-- delle compagne, ma chi interrogava il database direttamente poteva
-- leggerle. Decisione di Danilo: i PUNTEGGI del mister restano condivisi
-- nella squadra (Confronto), le AUTOVALUTAZIONI no.
--
-- Ora le legge solo l'atleta interessata (via profiles.athlete_id) e lo
-- staff. Scrittura invariata. Allineato anche self-assessments.sql, così
-- rieseguirlo non riapre la lettura.
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

drop policy if exists "self_assessments read" on public.self_assessments;
create policy "self_assessments read" on public.self_assessments for select using (
  public.is_staff() or exists (
    select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id
    where p.id = auth.uid() and p.status = 'approved' and a.id = self_assessments.athlete_id
  )
);

-- Verifica: deve dire "sola lettura propria o staff".
select case when qual ilike '%is_staff()%' and qual ilike '%auth.uid()%' and qual not ilike '%is_approved()%'
            then 'sola lettura propria o staff' else 'ATTENZIONE: ' || qual end as chi_legge_le_autovalutazioni
from pg_policies
where schemaname = 'public' and tablename = 'self_assessments' and policyname = 'self_assessments read';
