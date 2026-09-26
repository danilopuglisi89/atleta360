-- ============================================================
-- STELLE E PAGELLE: SOLO ALLO STAFF (26/09/2026)
--
-- Decisione di Danilo: le ragazze vedono solo le valutazioni (i numeri).
-- Nessun testo scritto dallo staff su di loro arriva alle atlete:
--   - note del rilevamento  → già riservate (assessment-notes-private.sql)
--   - stella del mister     → prima la motivazione la leggeva tutta la
--                             squadra, e arrivava come notifica sul telefono
--   - pagella di fine stagione → prima la leggeva l'atleta interessata
-- Ora le leggono solo admin, direzione e staff (is_staff()). La notifica
-- "Il mister ti ha dato una stella!" non parte più: portava il testo.
--
-- I messaggi (chat, promemoria dello staff) restano: sono comunicazioni
-- rivolte a loro, non giudizi su di loro.
--
-- Stesse regole anche in gamify-d.sql e q3.sql, così rieseguirli non
-- riapre niente. Incolla nel SQL Editor e premi Run. Sicuro da ri-eseguire.
-- ============================================================

-- Stelle
drop policy if exists "stars read" on public.stars;
create policy "stars read" on public.stars for select using (public.is_staff());
drop trigger if exists on_star_notify on public.stars;

-- Pagelle di fine stagione
drop policy if exists "season reports read" on public.season_reports;
create policy "season reports read" on public.season_reports for select using (public.is_staff());

-- Verifica: entrambe le letture devono dire "solo staff", e nessun trigger sulle stelle.
select tablename, policyname,
       case when qual ilike '%is_staff()%' and qual not ilike '%auth.uid()%' and qual not ilike '%is_approved%'
            then 'solo staff' else 'ATTENZIONE: ' || qual end as chi_legge
from pg_policies
where schemaname = 'public' and tablename in ('stars', 'season_reports', 'assessment_notes') and cmd in ('SELECT', 'ALL')
union all
select 'stars', 'trigger notifica', case when exists (
  select 1 from pg_trigger where tgname = 'on_star_notify' and not tgisinternal) then 'ATTENZIONE: ancora attivo' else 'spento' end;
