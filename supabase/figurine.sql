-- ============================================================
-- ONDATA 3 (mondo magico) — l'album figurine: la killer feature scelta
-- nell'intervista. Ogni 20 punti partecipazione maturati si guadagna un
-- pacchetto da 3 figurine (compagne scelte a caso, doppioni possibili). Lo
-- scambio dei doppioni resta manuale in chat (cosi' l'ha voluto Danilo:
-- niente sistema di trade automatico da far quadrare).
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede gamify-a.sql — tabella participation_points — già eseguito.)
-- ============================================================

alter table public.profiles add column if not exists figurine_packs int not null default 0;
alter table public.profiles add column if not exists figurine_bank int not null default 0;

create table if not exists public.figurine_collection (
  owner_id          uuid not null references auth.users(id) on delete cascade,
  athlete_id        uuid not null references public.athletes(id) on delete cascade,
  copies            int not null default 0,
  first_obtained_at timestamptz,
  primary key (owner_id, athlete_id)
);
alter table public.figurine_collection enable row level security;
drop policy if exists "figurine read own or staff" on public.figurine_collection;
create policy "figurine read own or staff" on public.figurine_collection for select
  using (owner_id = auth.uid() or public.is_staff());
-- Niente insert/update dal client: solo la RPC open_figurine_pack (security
-- definer) scrive qui, cosi' nessuno si regala pacchetti a piacere.

-- ---------- Un pacchetto ogni 20 punti maturati ----------
create or replace function public.award_figurine_pack()
returns trigger language plpgsql security definer set search_path = public as $$
declare bank int;
begin
  update public.profiles set figurine_bank = figurine_bank + new.points
  where id = new.user_id
  returning figurine_bank into bank;
  if bank is not null and bank >= 20 then
    update public.profiles
    set figurine_packs = figurine_packs + (bank / 20), figurine_bank = bank % 20
    where id = new.user_id;
  end if;
  return new;
end;
$$;
drop trigger if exists on_participation_pack on public.participation_points;
create trigger on_participation_pack after insert on public.participation_points
  for each row execute function public.award_figurine_pack();

-- ---------- Apertura pacchetto: 3 compagne a caso, doppioni possibili ----------
create or replace function public.open_figurine_pack()
returns table(athlete_id uuid, identifier text, was_new boolean)
language plpgsql security definer set search_path = public as $$
declare
  avail int;
  pick record;
  already boolean;
begin
  select figurine_packs into avail from public.profiles where id = auth.uid() for update;
  if avail is null or avail < 1 then
    raise exception 'Nessun pacchetto disponibile';
  end if;
  update public.profiles set figurine_packs = figurine_packs - 1 where id = auth.uid();

  for pick in
    select a.id, a.identifier from public.athletes a where a.active order by random() limit 3
  loop
    select exists(select 1 from public.figurine_collection where owner_id = auth.uid() and figurine_collection.athlete_id = pick.id) into already;
    insert into public.figurine_collection (owner_id, athlete_id, copies, first_obtained_at)
    values (auth.uid(), pick.id, 1, now())
    on conflict (owner_id, athlete_id) do update set copies = figurine_collection.copies + 1;
    athlete_id := pick.id; identifier := pick.identifier; was_new := not already;
    return next;
  end loop;
end;
$$;
