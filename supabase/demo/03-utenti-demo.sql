-- ============================================================
-- ATLETA360 DEMO — COLLEGA I DUE UTENTI DEMO (27/09/2026)
--
-- Prima, in Supabase → Authentication → Users → "Add user" → "Create new
-- user", crea questi due utenti con "Auto Confirm User" spuntato:
--   demo.atleta@atleta-360.com    password: Atleta360!
--   demo.societa@atleta-360.com   password: Atleta360!
-- (sono le credenziali pubbliche già scritte in src/demoMode.js)
--
-- Poi esegui questo script, dopo 01 e 02. Solo nel progetto demo.
-- ============================================================

-- L'atleta della demo: "Sofia Bianchi", già con avatar, autovalutazione,
-- profilo completo e questionario fatto, così chi prova la demo entra
-- subito nell'app invece di trovare quattro finestre di benvenuto.
update public.profiles set
  status = 'approved', category = 'atleta',
  first_name = 'Sofia', last_name = 'Bianchi', athlete_id = 'Sofia Bianchi',
  avatar_config = '{"look":"look03","jersey":"pink","number":"7"}'::jsonb,
  ruolo = 'Palleggiatrice', jersey_number = '7', instagram = '@sofia.demo'
where email = 'demo.atleta@atleta-360.com';

insert into public.athlete_study (athlete_id, volley_years, start_age, trainings_per_week, height_cm, dominant_hand, school_type, school_year, sleep_hours)
select id, 7, 11, 3, 172, 'destra', 'liceo', 4, 8 from public.athletes where identifier = 'Sofia Bianchi'
on conflict (athlete_id) do nothing;

-- La società della demo: direzione che può anche inserire i rilevamenti.
update public.profiles set
  status = 'approved', category = 'direzione', can_assess = true,
  first_name = 'Staff', last_name = 'Demo'
where email = 'demo.societa@atleta-360.com';

-- Verifica: due righe, entrambe approvate.
select email, category, status, athlete_id, can_assess
from public.profiles
where email in ('demo.atleta@atleta-360.com', 'demo.societa@atleta-360.com');
