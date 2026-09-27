-- ============================================================
-- ATLETA360 DEMO — DATI INVENTATI (27/09/2026)
-- Squadra di fantasia: nessun nome, voto o dato di persone reali.
-- Da eseguire DOPO 01-schema-completo.sql, nel progetto demo. Mai su Oasi.
-- Rieseguibile: prima cancella i dati demo precedenti.
-- ============================================================

-- I 7 focus attuali di Atleta360 (solo testi del metodo).
update public.skills set active = false where key not in ('focus', 'gestione-dello-stress', 'reset', 'comunicazione', 'body', 'coachability', 'tattica');
insert into public.skills (key, title, short, description, sort_order, active) values ('focus', 'Focus', 'Focus', 'Indica la tua capacità di rimanere totalmente agganciata all''allenamento, esercizio dopo esercizio, isolando i rumori di fondo, la stanchezza o i pensieri esterni.', 1, true)
  on conflict (key) do update set title = excluded.title, short = excluded.short, description = excluded.description, sort_order = excluded.sort_order, active = true;
insert into public.skills (key, title, short, description, sort_order, active) values ('gestione-dello-stress', 'Gestione dello stress', 'Stress', 'Misura come reagisci quando l''intensità sale, quando il fiato corto aumenta o quando un esercizio non riesce come vorresti.', 2, true)
  on conflict (key) do update set title = excluded.title, short = excluded.short, description = excluded.description, sort_order = excluded.sort_order, active = true;
insert into public.skills (key, title, short, description, sort_order, active) values ('reset', 'Resilienza all''Errore', 'Reset', 'È la tua capacità di "incassare e ripartire". Non significa non cadere o non sbagliare, ma indica la velocità con cui ti rimetti in piedi dopo una difficoltà, una critica o un momento di forte stanchezza fisica.', 3, true)
  on conflict (key) do update set title = excluded.title, short = excluded.short, description = excluded.description, sort_order = excluded.sort_order, active = true;
insert into public.skills (key, title, short, description, sort_order, active) values ('comunicazione', 'Comunicazione e Sostegno', 'Comunicazione', 'È il tuo protocollo di trasmissione dati. Misura come ti interfacci con il mondo esterno: la tua capacità di ascoltare attivamente le correzioni dello staff e il modo in cui usi la voce e il linguaggio del corpo per aiutare il gruppo.', 4, true)
  on conflict (key) do update set title = excluded.title, short = excluded.short, description = excluded.description, sort_order = excluded.sort_order, active = true;
insert into public.skills (key, title, short, description, sort_order, active) values ('body', 'Autostima', 'Body Lang.', 'È la tua riserva di energia interna. Indica la sicurezza che dimostri nelle tue scelte di gioco e il valore che dai alle tue capacità, indipendentemente dal risultato immediato della giocata.', 5, true)
  on conflict (key) do update set title = excluded.title, short = excluded.short, description = excluded.description, sort_order = excluded.sort_order, active = true;
insert into public.skills (key, title, short, description, sort_order, active) values ('coachability', 'Adattabilità al cambiamento', 'Cambiamento', 'È la tua velocità di riprogrammazione (Just-in-Time). Misura quanto sei rapida a livello mentale a ridefinire il tuo raggio d''azione quando cambiano improvvisamente le regole, i compagni di esercizio o le richieste del mister.', 6, true)
  on conflict (key) do update set title = excluded.title, short = excluded.short, description = excluded.description, sort_order = excluded.sort_order, active = true;
insert into public.skills (key, title, short, description, sort_order, active) values ('tattica', 'Lavoro di squadra', 'Team', 'È l''ottimizzazione della catena di montaggio. Indica quanto sei disposta a mettere il tuo talento individuale al servizio degli obiettivi collettivi della squadra, supportando attivamente le tue compagne.', 7, true)
  on conflict (key) do update set title = excluded.title, short = excluded.short, description = excluded.description, sort_order = excluded.sort_order, active = true;

-- Ripartenza pulita
delete from public.athletes where identifier in ('Beatrice V.', 'Lorenza F.', 'Caterina S.');   -- prima importazione da data-model.sql, non da demo
delete from public.athletes where identifier in ('Sofia Bianchi', 'Giulia Ferri', 'Martina Riva', 'Alice Conti', 'Emma Galli', 'Chiara Moretti', 'Anna Rossetti', 'Beatrice Villa', 'Elena Marchi', 'Viola Serra', 'Nina Fabbri', 'Irene Sala');
delete from public.event_recurrences where location = 'Palestra comunale (demo)';

-- Le atlete
insert into public.athletes (identifier, position, active, birth_date) values
  ('Sofia Bianchi', 'Palleggiatrice', true, '2008-03-14'),
  ('Giulia Ferri', 'Schiacciatrice', true, '2007-11-02'),
  ('Martina Riva', 'Centrale', true, '2008-06-21'),
  ('Alice Conti', 'Opposto', true, '2007-09-30'),
  ('Emma Galli', 'Libero', true, '2009-01-17'),
  ('Chiara Moretti', 'Schiacciatrice', true, '2008-04-08'),
  ('Anna Rossetti', 'Centrale', true, '2007-12-12'),
  ('Beatrice Villa', 'Palleggiatrice', true, '2009-02-25'),
  ('Elena Marchi', 'Schiacciatrice', true, '2008-08-03'),
  ('Viola Serra', 'Opposto', true, '2008-10-19'),
  ('Nina Fabbri', 'Libero', true, '2009-05-06'),
  ('Irene Sala', 'Centrale', true, '2007-07-27');

-- Tre rilevamenti del mister, a due settimane l'uno dall'altro: la squadra cresce,
-- non tutte allo stesso modo (così andamento, confronto e "da tenere d'occhio" hanno qualcosa da mostrare).
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":5,"gestione-dello-stress":5,"reset":6,"comunicazione":4,"body":5,"coachability":5,"tattica":7}'::jsonb, '2026-08-28 18:30+02' from public.athletes where identifier = 'Sofia Bianchi';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":7,"gestione-dello-stress":6,"reset":5,"comunicazione":4,"body":7,"coachability":7,"tattica":6}'::jsonb, '2026-09-11 18:30+02' from public.athletes where identifier = 'Sofia Bianchi';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":7,"gestione-dello-stress":6,"reset":6,"comunicazione":5,"body":5,"coachability":7,"tattica":6}'::jsonb, '2026-09-25 18:30+02' from public.athletes where identifier = 'Sofia Bianchi';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":7,"gestione-dello-stress":7,"reset":5,"comunicazione":6,"body":4,"coachability":7,"tattica":6}'::jsonb, '2026-08-28 18:30+02' from public.athletes where identifier = 'Giulia Ferri';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":6,"gestione-dello-stress":7,"reset":6,"comunicazione":5,"body":5,"coachability":8,"tattica":7}'::jsonb, '2026-09-11 18:30+02' from public.athletes where identifier = 'Giulia Ferri';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":8,"gestione-dello-stress":8,"reset":8,"comunicazione":7,"body":6,"coachability":7,"tattica":7}'::jsonb, '2026-09-25 18:30+02' from public.athletes where identifier = 'Giulia Ferri';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":6,"gestione-dello-stress":7,"reset":7,"comunicazione":5,"body":6,"coachability":5,"tattica":6}'::jsonb, '2026-08-28 18:30+02' from public.athletes where identifier = 'Martina Riva';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":7,"gestione-dello-stress":6,"reset":7,"comunicazione":8,"body":7,"coachability":5,"tattica":8}'::jsonb, '2026-09-11 18:30+02' from public.athletes where identifier = 'Martina Riva';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":8,"gestione-dello-stress":8,"reset":8,"comunicazione":8,"body":9,"coachability":6,"tattica":8}'::jsonb, '2026-09-25 18:30+02' from public.athletes where identifier = 'Martina Riva';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":7,"gestione-dello-stress":7,"reset":7,"comunicazione":7,"body":7,"coachability":7,"tattica":5}'::jsonb, '2026-08-28 18:30+02' from public.athletes where identifier = 'Alice Conti';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":5,"gestione-dello-stress":6,"reset":7,"comunicazione":7,"body":6,"coachability":6,"tattica":6}'::jsonb, '2026-09-11 18:30+02' from public.athletes where identifier = 'Alice Conti';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":5,"gestione-dello-stress":7,"reset":6,"comunicazione":8,"body":5,"coachability":6,"tattica":6}'::jsonb, '2026-09-25 18:30+02' from public.athletes where identifier = 'Alice Conti';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":6,"gestione-dello-stress":7,"reset":8,"comunicazione":7,"body":9,"coachability":7,"tattica":8}'::jsonb, '2026-08-28 18:30+02' from public.athletes where identifier = 'Emma Galli';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":8,"gestione-dello-stress":8,"reset":8,"comunicazione":9,"body":9,"coachability":7,"tattica":7}'::jsonb, '2026-09-11 18:30+02' from public.athletes where identifier = 'Emma Galli';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":7,"gestione-dello-stress":8,"reset":9,"comunicazione":9,"body":8,"coachability":8,"tattica":8}'::jsonb, '2026-09-25 18:30+02' from public.athletes where identifier = 'Emma Galli';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":4,"gestione-dello-stress":5,"reset":5,"comunicazione":5,"body":6,"coachability":6,"tattica":5}'::jsonb, '2026-08-28 18:30+02' from public.athletes where identifier = 'Chiara Moretti';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":6,"gestione-dello-stress":5,"reset":6,"comunicazione":6,"body":7,"coachability":8,"tattica":5}'::jsonb, '2026-09-11 18:30+02' from public.athletes where identifier = 'Chiara Moretti';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":7,"gestione-dello-stress":7,"reset":7,"comunicazione":6,"body":7,"coachability":7,"tattica":8}'::jsonb, '2026-09-25 18:30+02' from public.athletes where identifier = 'Chiara Moretti';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":6,"gestione-dello-stress":5,"reset":5,"comunicazione":5,"body":5,"coachability":6,"tattica":6}'::jsonb, '2026-08-28 18:30+02' from public.athletes where identifier = 'Anna Rossetti';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":7,"gestione-dello-stress":6,"reset":5,"comunicazione":7,"body":6,"coachability":7,"tattica":7}'::jsonb, '2026-09-11 18:30+02' from public.athletes where identifier = 'Anna Rossetti';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":7,"gestione-dello-stress":6,"reset":6,"comunicazione":6,"body":6,"coachability":6,"tattica":9}'::jsonb, '2026-09-25 18:30+02' from public.athletes where identifier = 'Anna Rossetti';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":8,"gestione-dello-stress":7,"reset":6,"comunicazione":5,"body":6,"coachability":6,"tattica":6}'::jsonb, '2026-08-28 18:30+02' from public.athletes where identifier = 'Beatrice Villa';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":7,"gestione-dello-stress":6,"reset":6,"comunicazione":5,"body":5,"coachability":6,"tattica":6}'::jsonb, '2026-09-11 18:30+02' from public.athletes where identifier = 'Beatrice Villa';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":5,"gestione-dello-stress":5,"reset":6,"comunicazione":4,"body":6,"coachability":7,"tattica":7}'::jsonb, '2026-09-25 18:30+02' from public.athletes where identifier = 'Beatrice Villa';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":7,"gestione-dello-stress":7,"reset":7,"comunicazione":6,"body":7,"coachability":7,"tattica":8}'::jsonb, '2026-08-28 18:30+02' from public.athletes where identifier = 'Elena Marchi';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":7,"gestione-dello-stress":9,"reset":8,"comunicazione":9,"body":6,"coachability":8,"tattica":9}'::jsonb, '2026-09-11 18:30+02' from public.athletes where identifier = 'Elena Marchi';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":10,"gestione-dello-stress":9,"reset":8,"comunicazione":7,"body":8,"coachability":8,"tattica":8}'::jsonb, '2026-09-25 18:30+02' from public.athletes where identifier = 'Elena Marchi';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":6,"gestione-dello-stress":8,"reset":8,"comunicazione":7,"body":7,"coachability":7,"tattica":7}'::jsonb, '2026-08-28 18:30+02' from public.athletes where identifier = 'Viola Serra';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":9,"gestione-dello-stress":8,"reset":9,"comunicazione":8,"body":9,"coachability":7,"tattica":8}'::jsonb, '2026-09-11 18:30+02' from public.athletes where identifier = 'Viola Serra';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":7,"gestione-dello-stress":9,"reset":8,"comunicazione":8,"body":8,"coachability":7,"tattica":8}'::jsonb, '2026-09-25 18:30+02' from public.athletes where identifier = 'Viola Serra';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":5,"gestione-dello-stress":6,"reset":5,"comunicazione":7,"body":5,"coachability":4,"tattica":5}'::jsonb, '2026-08-28 18:30+02' from public.athletes where identifier = 'Nina Fabbri';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":6,"gestione-dello-stress":5,"reset":7,"comunicazione":6,"body":5,"coachability":6,"tattica":6}'::jsonb, '2026-09-11 18:30+02' from public.athletes where identifier = 'Nina Fabbri';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":8,"gestione-dello-stress":7,"reset":6,"comunicazione":8,"body":6,"coachability":7,"tattica":6}'::jsonb, '2026-09-25 18:30+02' from public.athletes where identifier = 'Nina Fabbri';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":5,"gestione-dello-stress":7,"reset":7,"comunicazione":7,"body":7,"coachability":5,"tattica":6}'::jsonb, '2026-08-28 18:30+02' from public.athletes where identifier = 'Irene Sala';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":4,"gestione-dello-stress":6,"reset":4,"comunicazione":5,"body":7,"coachability":6,"tattica":5}'::jsonb, '2026-09-11 18:30+02' from public.athletes where identifier = 'Irene Sala';
insert into public.assessments (athlete_id, scores, created_at) select id, '{"focus":5,"gestione-dello-stress":6,"reset":5,"comunicazione":5,"body":7,"coachability":4,"tattica":4}'::jsonb, '2026-09-25 18:30+02' from public.athletes where identifier = 'Irene Sala';

-- Autovalutazioni: prima del primo rilevamento e prima dell'ultimo. Alcune si vedono più severe del mister.
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":4,"gestione-dello-stress":4,"reset":5,"comunicazione":3,"body":4,"coachability":4,"tattica":6}'::jsonb, '2026-08-26 20:00+02' from public.athletes where identifier = 'Sofia Bianchi';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":5,"gestione-dello-stress":5,"reset":5,"comunicazione":5,"body":4,"coachability":5,"tattica":5}'::jsonb, '2026-09-23 20:00+02' from public.athletes where identifier = 'Sofia Bianchi';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":8,"gestione-dello-stress":8,"reset":5,"comunicazione":6,"body":5,"coachability":8,"tattica":6}'::jsonb, '2026-08-26 20:00+02' from public.athletes where identifier = 'Giulia Ferri';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":8,"gestione-dello-stress":7,"reset":9,"comunicazione":7,"body":7,"coachability":8,"tattica":8}'::jsonb, '2026-09-23 20:00+02' from public.athletes where identifier = 'Giulia Ferri';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":5,"gestione-dello-stress":6,"reset":6,"comunicazione":4,"body":5,"coachability":4,"tattica":6}'::jsonb, '2026-08-26 20:00+02' from public.athletes where identifier = 'Martina Riva';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":8,"gestione-dello-stress":7,"reset":7,"comunicazione":8,"body":9,"coachability":5,"tattica":8}'::jsonb, '2026-09-23 20:00+02' from public.athletes where identifier = 'Martina Riva';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":6,"gestione-dello-stress":5,"reset":5,"comunicazione":6,"body":5,"coachability":5,"tattica":3}'::jsonb, '2026-08-26 20:00+02' from public.athletes where identifier = 'Alice Conti';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":4,"gestione-dello-stress":5,"reset":5,"comunicazione":6,"body":3,"coachability":5,"tattica":4}'::jsonb, '2026-09-23 20:00+02' from public.athletes where identifier = 'Alice Conti';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":6,"gestione-dello-stress":8,"reset":7,"comunicazione":6,"body":9,"coachability":8,"tattica":9}'::jsonb, '2026-08-26 20:00+02' from public.athletes where identifier = 'Emma Galli';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":7,"gestione-dello-stress":7,"reset":10,"comunicazione":9,"body":7,"coachability":8,"tattica":8}'::jsonb, '2026-09-23 20:00+02' from public.athletes where identifier = 'Emma Galli';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":3,"gestione-dello-stress":4,"reset":5,"comunicazione":4,"body":5,"coachability":6,"tattica":5}'::jsonb, '2026-08-26 20:00+02' from public.athletes where identifier = 'Chiara Moretti';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":6,"gestione-dello-stress":7,"reset":7,"comunicazione":6,"body":7,"coachability":7,"tattica":7}'::jsonb, '2026-09-23 20:00+02' from public.athletes where identifier = 'Chiara Moretti';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":5,"gestione-dello-stress":3,"reset":4,"comunicazione":4,"body":3,"coachability":5,"tattica":5}'::jsonb, '2026-08-26 20:00+02' from public.athletes where identifier = 'Anna Rossetti';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":6,"gestione-dello-stress":4,"reset":5,"comunicazione":4,"body":5,"coachability":5,"tattica":7}'::jsonb, '2026-09-23 20:00+02' from public.athletes where identifier = 'Anna Rossetti';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":9,"gestione-dello-stress":8,"reset":7,"comunicazione":5,"body":6,"coachability":6,"tattica":5}'::jsonb, '2026-08-26 20:00+02' from public.athletes where identifier = 'Beatrice Villa';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":5,"gestione-dello-stress":6,"reset":7,"comunicazione":5,"body":6,"coachability":7,"tattica":6}'::jsonb, '2026-09-23 20:00+02' from public.athletes where identifier = 'Beatrice Villa';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":7,"gestione-dello-stress":7,"reset":6,"comunicazione":6,"body":6,"coachability":6,"tattica":7}'::jsonb, '2026-08-26 20:00+02' from public.athletes where identifier = 'Elena Marchi';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":9,"gestione-dello-stress":8,"reset":8,"comunicazione":7,"body":8,"coachability":8,"tattica":7}'::jsonb, '2026-09-23 20:00+02' from public.athletes where identifier = 'Elena Marchi';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":5,"gestione-dello-stress":7,"reset":7,"comunicazione":5,"body":6,"coachability":6,"tattica":5}'::jsonb, '2026-08-26 20:00+02' from public.athletes where identifier = 'Viola Serra';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":5,"gestione-dello-stress":8,"reset":6,"comunicazione":7,"body":8,"coachability":6,"tattica":6}'::jsonb, '2026-09-23 20:00+02' from public.athletes where identifier = 'Viola Serra';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":5,"gestione-dello-stress":6,"reset":5,"comunicazione":8,"body":6,"coachability":5,"tattica":5}'::jsonb, '2026-08-26 20:00+02' from public.athletes where identifier = 'Nina Fabbri';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":7,"gestione-dello-stress":7,"reset":6,"comunicazione":9,"body":7,"coachability":7,"tattica":7}'::jsonb, '2026-09-23 20:00+02' from public.athletes where identifier = 'Nina Fabbri';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":4,"gestione-dello-stress":7,"reset":7,"comunicazione":6,"body":6,"coachability":4,"tattica":6}'::jsonb, '2026-08-26 20:00+02' from public.athletes where identifier = 'Irene Sala';
insert into public.self_assessments (athlete_id, scores, created_at) select id, '{"focus":5,"gestione-dello-stress":5,"reset":4,"comunicazione":5,"body":7,"coachability":3,"tattica":3}'::jsonb, '2026-09-23 20:00+02' from public.athletes where identifier = 'Irene Sala';

-- Una nota del mister (visibile solo allo staff) e un obiettivo, per mostrare gli strumenti.
insert into public.assessment_notes (assessment_id, note)
select a.id, 'Ottima crescita nella comunicazione in campo: guida le compagne nei momenti difficili.'
from public.assessments a join public.athletes t on t.id = a.athlete_id
where t.identifier = 'Sofia Bianchi' order by a.created_at desc limit 1
on conflict (assessment_id) do nothing;
insert into public.goals (athlete_id, skill_key, target, due_date)
select id, 'gestione-dello-stress', 8, '2026-11-30' from public.athletes where identifier = 'Sofia Bianchi';

-- Allenamenti fissi: lunedì, mercoledì, venerdì. Generano da soli le prossime 5 settimane.
insert into public.event_recurrences (kind, weekday, start_time, end_time, location, notes) values
  ('training', 1, '18:30', '20:30', 'Palestra comunale (demo)', 'Allenamento squadra'),
  ('training', 3, '18:30', '20:30', 'Palestra comunale (demo)', 'Allenamento squadra'),
  ('training', 5, '18:30', '20:30', 'Palestra comunale (demo)', 'Allenamento squadra');
select public.generate_recurring_events();

select 'dati demo caricati' as esito,
  (select count(*) from public.athletes) as atlete,
  (select count(*) from public.assessments) as rilevamenti,
  (select count(*) from public.self_assessments) as autovalutazioni,
  (select count(*) from public.events where starts_at > now()) as allenamenti_in_calendario;
