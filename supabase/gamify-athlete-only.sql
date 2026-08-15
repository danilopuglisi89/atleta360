-- ============================================================
-- Chiude un buco reale: i punti partecipazione (e quindi streak, livelli,
-- pacchetti figurine) dovevano essere SOLO delle atlete, ma quattro azioni
-- (conferma presenza, applauso dato, momento del giorno, quiz) assegnavano
-- punti a chiunque le facesse, staff compreso. Nella pratica: un membro
-- dello staff che rispondeva al quiz o metteva un'emoji nel "momento del
-- giorno" accumulava punti a sua insaputa e prima o poi si sarebbe trovato
-- ad aprire un pacchetto di figurine — collezionando le carte delle sue
-- atlete. Da evitare sempre, a maggior ragione con minorenni.
--
-- Ridefinisce SOLO le funzioni trigger (non le tabelle): sicuro da
-- ri-eseguire, non serve rilanciare gamify-a.sql/gamify-b.sql per intero.
-- Incolla nel SQL Editor di Supabase e premi Run.
-- (Richiede gamify-a.sql e gamify-b.sql già eseguiti.)
-- ============================================================

create or replace function public.award_points_rsvp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.profiles where id = new.user_id and category = 'atleta') then
    insert into public.participation_points (user_id, action, points) values (new.user_id, 'rsvp', 3);
  end if;
  return new;
end;
$$;

create or replace function public.award_points_applause()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.profiles where id = new.from_user_id and category = 'atleta') then
    insert into public.participation_points (user_id, action, points) values (new.from_user_id, 'applause_given', 2);
  end if;
  return new;
end;
$$;

create or replace function public.award_points_daily_moment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.profiles where id = new.user_id and category = 'atleta') then
    insert into public.participation_points (user_id, action, points) values (new.user_id, 'daily_moment', 4);
  end if;
  return new;
end;
$$;

create or replace function public.award_points_quiz()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.score > 0 and exists (select 1 from public.profiles where id = new.user_id and category = 'atleta') then
    insert into public.participation_points (user_id, action, points) values (new.user_id, 'quiz', new.score * 2);
  end if;
  return new;
end;
$$;

-- checkin e self_assessment erano già naturalmente riservati alle atlete
-- (passano sempre da athlete_id → profiles.athlete_id): nessuna modifica.
