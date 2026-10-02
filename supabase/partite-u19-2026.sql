-- ============================================================
-- PARTITE U19 FEMMINILE — GIRONE B, STAGIONE 2026/27 (02/10/2026)
-- Fonte: calendario pubblico FIPAV, public.fipavonline.it/gironi/63785
-- (C.T. Appennino Toscano). Solo le gare di Oasi Volley Viareggio:
-- 8 partite; le giornate 4 (04/11) e 9 (09/12) Oasi riposa.
--
-- Entrano in Calendario come partite: promemoria la sera prima e
-- "tra poco si gioca" partono da soli, come per ogni evento.
-- Incolla nel SQL Editor di Oasi e premi Run. Rieseguibile: una partita
-- già presente (stesso giorno e ora) non viene inserita due volte.
-- ============================================================

insert into public.events (kind, title, starts_at, ends_at, location, notes)
select 'match', p.titolo,
       (p.quando::timestamp at time zone 'Europe/Rome'),
       (p.quando::timestamp at time zone 'Europe/Rome') + interval '2 hours',
       p.luogo, p.note
from (values
  ('vs V.P. Volley (casa)',                    '2026-10-14 21:00', 'Scuola Media Lenci, Via Lenci 1, Viareggio',              'Campionato U19 F · Girone B · Giornata 1 · Gara 19100'),
  ('vs ICP Nottolini (trasferta)',             '2026-10-21 21:00', 'Palestra C. Piaggia, Via G. Rossa, Capannori',            'Campionato U19 F · Girone B · Giornata 2 · Gara 19104'),
  ('vs Ghivivolley Piano di Coreglia (casa)',  '2026-10-28 21:00', 'Scuola Media Lenci, Via Lenci 1, Viareggio',              'Campionato U19 F · Girone B · Giornata 3 · Gara 19106'),
  ('vs Pediatrica Volley Porcari (casa)',      '2026-11-11 21:00', 'Scuola Media Lenci, Via Lenci 1, Viareggio',              'Campionato U19 F · Girone B · Giornata 5 · Gara 19112'),
  ('vs V.P. Volley (trasferta)',               '2026-11-18 21:00', 'Palestra Comunale Piero Greco, Via Menchini 1, Seravezza', 'Campionato U19 F · Girone B · Giornata 6 · Gara 19115'),
  ('vs ICP Nottolini (casa)',                  '2026-11-25 21:00', 'Scuola Media Lenci, Via Lenci 1, Viareggio',              'Campionato U19 F · Girone B · Giornata 7 · Gara 19119'),
  ('vs Ghivivolley Piano di Coreglia (trasferta)', '2026-12-02 19:00', 'Palazzetto dello Sport, Via di Gretaglia 23, Ghivizzano', 'Campionato U19 F · Girone B · Giornata 8 · Gara 19121'),
  ('vs Pediatrica Volley Porcari (trasferta)', '2026-12-16 19:00', 'Palasport, Via Cavanis, Porcari',                         'Campionato U19 F · Girone B · Giornata 10 · Gara 19127')
) as p(titolo, quando, luogo, note)
where not exists (
  select 1 from public.events e
  where e.kind = 'match' and e.starts_at = (p.quando::timestamp at time zone 'Europe/Rome')
);

-- Verifica: 8 righe.
select title, starts_at at time zone 'Europe/Rome' as ora_italiana, location
from public.events
where kind = 'match' and starts_at >= '2026-10-01'
order by starts_at;
