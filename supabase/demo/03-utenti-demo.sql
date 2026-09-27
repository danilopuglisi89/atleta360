-- ============================================================
-- ATLETA360 DEMO — CREA E COLLEGA I DUE UTENTI DEMO (27/09/2026)
--
-- Crea da solo i due utenti (già confermati) con le credenziali pubbliche
-- scritte in src/demoMode.js, poi li collega alla squadra inventata:
--   demo.atleta@atleta-360.com    password: Atleta360!
--   demo.societa@atleta-360.com   password: Atleta360!
--
-- Esegui dopo 01 e 02. SOLO nel progetto demo, mai su Oasi.
-- Sicuro da rieseguire: se un utente esiste già non lo tocca.
-- ============================================================

do $$
declare
  v_email text;
  v_id uuid;
begin
  foreach v_email in array array['demo.atleta@atleta-360.com', 'demo.societa@atleta-360.com'] loop
    if not exists (select 1 from auth.users where email = v_email) then
      v_id := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change, email_change_token_new
      ) values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
        extensions.crypt('Atleta360!', extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
        '', '', '', ''
      );
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), v_id, v_id::text,
              jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
              'email', now(), now(), now());
    end if;
  end loop;
end $$;

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
