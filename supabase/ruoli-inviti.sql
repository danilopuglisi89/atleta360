-- ============================================================
-- RUOLI: CHI SI REGISTRA È ATLETA, LO STAFF ENTRA SOLO CON INVITO (27/09/2026)
--
-- Segnalato da Codex e verificato: il modulo di registrazione offriva
-- "Staff" e "Direzione", il trigger copiava quella scelta nel profilo, e
-- un "Approva" distratto concedeva i poteri dello staff (rilevamenti di
-- tutte, note, stelle, pagelle). In più qualunque membro dello staff poteva
-- generare inviti per staff e direzione.
--
--   1. handle_new_user(): ogni registrazione nasce 'atleta', qualunque cosa
--      arrivi nei metadati (anche da un'app vecchia).
--   2. create_invite_link(): lo staff genera inviti solo per atlete; inviti
--      per staff o direzione solo l'admin.
--   3. redeem_invite_link(): riscatto in un'unica operazione, così lo stesso
--      link non può essere usato da due persone nello stesso istante.
--   4. Eventuali richieste non approvate con altra categoria tornano atleta
--      (al 27/09 non ce n'è nessuna). Chi è già approvato non cambia.
--
-- La categoria di un profilo esistente la cambia solo l'admin (policy
-- "admin can update" in schema.sql), come prima.
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

-- 1. Registrazione
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name, last_name, email, category)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.email,
    'atleta'   -- mai dai metadati: li scrive chi si registra
  );
  return new;
end;
$$;

-- 2. Creazione inviti
create or replace function public.create_invite_link(p_athlete_identifier text default null, p_category text default 'atleta')
returns text language plpgsql security definer set search_path = public as $$
declare
  v_token text;
begin
  if p_category not in ('atleta', 'staff', 'direzione') then
    raise exception 'Categoria non valida';
  end if;
  if p_category = 'atleta' and not public.is_staff() then
    raise exception 'Solo lo staff può generare inviti';
  end if;
  if p_category <> 'atleta' and not public.is_admin() then
    raise exception 'Gli inviti per staff e direzione li genera solo l''amministratore';
  end if;
  insert into public.invite_links (athlete_identifier, category, created_by)
  values (case when p_category = 'atleta' then p_athlete_identifier end, p_category, auth.uid())
  returning token into v_token;
  return v_token;
end;
$$;
revoke all on function public.create_invite_link(text, text) from public, anon;
grant execute on function public.create_invite_link(text, text) to authenticated;

-- 3. Riscatto atomico
create or replace function public.redeem_invite_link(p_token text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  r public.invite_links;
begin
  if auth.uid() is null then return false; end if;
  -- Segna il link come usato e lo legge nella stessa istruzione: se due
  -- persone lo usano insieme, solo una trova la riga ancora libera.
  update public.invite_links
     set used_by = auth.uid(), used_at = now()
   where token = p_token and used_by is null and expires_at > now()
  returning * into r;
  if not found then
    return false;
  end if;
  update public.profiles set status = 'approved', category = r.category,
    athlete_id = coalesce(r.athlete_identifier, athlete_id)
  where id = auth.uid();
  return true;
end;
$$;
revoke all on function public.redeem_invite_link(text) from public, anon;
grant execute on function public.redeem_invite_link(text) to authenticated;

-- 4. Richieste non approvate: sempre atleta
update public.profiles set category = 'atleta'
where status <> 'approved' and category is distinct from 'atleta';

-- Verifica: la registrazione non legge più la categoria, e nessuna richiesta
-- in attesa ha un ruolo diverso da atleta.
select
  case when position('''atleta''' in pg_get_functiondef('public.handle_new_user()'::regprocedure)) > 0
        and position('category''' in pg_get_functiondef('public.handle_new_user()'::regprocedure)) = 0
       then 'sì' else 'NO' end as registrazione_sempre_atleta,
  case when position('is_admin()' in pg_get_functiondef('public.create_invite_link(text,text)'::regprocedure)) > 0
       then 'sì' else 'NO' end as inviti_staff_solo_admin,
  (select count(*) from public.profiles where status <> 'approved' and category <> 'atleta') as richieste_non_atleta_deve_essere_0;
