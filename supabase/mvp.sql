-- ============================================================
-- "Giocatore del match": dopo ogni partita il mister sceglie un'atleta.
-- Una sola per evento (vincolo unique), assegnata SOLO dallo staff.
--
-- Nota sul tipo di notifica: si riusa 'star' invece di aggiungere 'mvp'.
-- Il vincolo notifications_type_check viene ricreato da sette script
-- diversi, e ogni tipo nuovo va allineato in tutti (vedi la sezione
-- "trappole" nel CLAUDE.md). Concettualmente è comunque un riconoscimento
-- del mister, come la stella: cambia solo l'ancoraggio.
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede calendar.sql, notifications.sql e push.sql già eseguiti.)
-- ============================================================

create table if not exists public.match_mvp (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null unique references public.events(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  note       text,
  given_by   uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists match_mvp_athlete_idx on public.match_mvp(athlete_id);

alter table public.match_mvp enable row level security;
drop policy if exists "mvp read" on public.match_mvp;
drop policy if exists "mvp write staff" on public.match_mvp;
create policy "mvp read" on public.match_mvp for select using (public.is_approved());
create policy "mvp write staff" on public.match_mvp for all
  using (public.is_staff()) with check (public.is_staff());

create or replace function public.notify_mvp()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  ev  record;
begin
  select p.id into uid
  from public.profiles p
  join public.athletes a on a.identifier = p.athlete_id
  where a.id = new.athlete_id
  limit 1;

  select title, starts_at into ev from public.events where id = new.event_id;

  if uid is not null then
    insert into public.notifications (user_id, type, title, body, view, meta)
    values (
      uid, 'star', 'Sei tu il giocatore del match! 🏐',
      coalesce(new.note, coalesce('Contro ' || ev.title, 'Complimenti per la partita!')),
      'profilo', jsonb_build_object('anchor', 'a360-mvp')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_mvp_notify on public.match_mvp;
create trigger on_mvp_notify after insert on public.match_mvp
  for each row execute function public.notify_mvp();
