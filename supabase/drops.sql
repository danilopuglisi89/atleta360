-- ============================================================
-- ONDATA 4 bis (mondo magico) — drop rari casuali: 5% di possibilità a
-- ogni check-in di trovare un bonus di punti, con una notifica push
-- dedicata. Trigger SEPARATO da award_points_checkin (gamify-a.sql): non
-- lo tocca, si aggiunge e basta.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede gamify-a.sql — checkins/participation_points — già eseguito.)
-- ============================================================

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('dm', 'team_chat', 'assessment', 'approval', 'goal', 'reminder', 'event', 'reaction', 'star', 'drop'));

create or replace function public.award_random_drop()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  pts int := 15;
begin
  if random() < 0.05 then
    select p.id into uid from public.profiles p
    join public.athletes a on a.identifier = p.athlete_id
    where a.id = new.athlete_id limit 1;
    if uid is not null then
      insert into public.participation_points (user_id, action, points) values (uid, 'drop_raro', pts);
      insert into public.notifications (user_id, type, title, body, view)
      values (uid, 'drop', 'Drop raro! 🎁', 'Check-in fortunato: hai trovato ' || pts || ' punti bonus.', 'home');
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists on_checkin_drop on public.checkins;
create trigger on_checkin_drop after insert on public.checkins
  for each row execute function public.award_random_drop();
