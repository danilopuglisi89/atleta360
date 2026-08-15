-- ============================================================
-- ONDATA WOW-2 — streak di coppia + tamagotchi di squadra.
-- (Il Wrapped animato non serve SQL: riusa i dati già esistenti.)
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede gamify-a.sql — checkins/participation_points — già eseguito.)
-- ============================================================

-- ---------- Streak di coppia (stile "friend streak" di Duolingo) ----------
-- Una riga = "ho scelto questa compagna". La coppia è CONFERMATA solo se
-- entrambe si sono scelte a vicenda — mai un abbinamento a insaputa altrui.
create table if not exists public.streak_buddies (
  athlete_id       uuid primary key references public.athletes(id) on delete cascade,
  buddy_athlete_id uuid not null references public.athletes(id) on delete cascade,
  created_at       timestamptz not null default now(),
  check (athlete_id <> buddy_athlete_id)
);
alter table public.streak_buddies enable row level security;
drop policy if exists "buddies read" on public.streak_buddies;
drop policy if exists "buddies write own" on public.streak_buddies;
create policy "buddies read" on public.streak_buddies for select using (public.is_approved());
create policy "buddies write own" on public.streak_buddies for all using (
  exists (select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id where p.id = auth.uid() and a.id = streak_buddies.athlete_id)
) with check (
  exists (select 1 from public.profiles p join public.athletes a on a.identifier = p.athlete_id where p.id = auth.uid() and a.id = athlete_id)
);

create or replace function public.my_streak_buddy()
returns table(buddy_athlete_id uuid, buddy_name text, confirmed boolean, couple_streak int)
language plpgsql security definer stable as $$
declare
  my_id uuid;
  pick_id uuid;
  their_pick uuid;
  is_conf boolean := false;
  n int := 0;
  cur date := (now() at time zone 'Europe/Rome')::date;
begin
  select a.id into my_id from public.profiles p join public.athletes a on a.identifier = p.athlete_id where p.id = auth.uid();
  if my_id is null then return; end if;

  select sb.buddy_athlete_id into pick_id from public.streak_buddies sb where sb.athlete_id = my_id;
  if pick_id is null then return; end if;

  select sb2.buddy_athlete_id into their_pick from public.streak_buddies sb2 where sb2.athlete_id = pick_id;
  is_conf := (their_pick = my_id);

  if is_conf then
    if not exists (select 1 from public.checkins where checkins.athlete_id = my_id and checkin_date = cur)
       or not exists (select 1 from public.checkins where checkins.athlete_id = pick_id and checkin_date = cur) then
      cur := cur - 1;
    end if;
    loop
      exit when not exists (select 1 from public.checkins where checkins.athlete_id = my_id and checkin_date = cur);
      exit when not exists (select 1 from public.checkins where checkins.athlete_id = pick_id and checkin_date = cur);
      n := n + 1;
      cur := cur - 1;
    end loop;
  end if;

  select a.identifier into buddy_name from public.athletes a where a.id = pick_id;
  buddy_athlete_id := pick_id;
  confirmed := is_conf;
  couple_streak := n;
  return next;
end;
$$;

-- ---------- Il tamagotchi di squadra: cresce coi punti di TUTTE ----------
-- Volutamente un solo numero aggregato: nessuna classifica, nessun
-- confronto tra atlete — o cresce il gruppo o niente.
create or replace function public.team_growth()
returns bigint language sql security definer stable as $$
  select coalesce(sum(points), 0) from public.participation_points;
$$;
