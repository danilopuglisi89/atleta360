-- ============================================================
-- GAMIFICATION — ONDATA D: la stella del mister.
-- Un riconoscimento che SOLO lo staff può assegnare (mai automatico, mai
-- comprabile coi punti): una stella con una micro-motivazione, visibile
-- nello storico del profilo e notificata (push) all'atleta.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede notifications.sql e push.sql già eseguiti.)
-- ============================================================

create table if not exists public.stars (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.athletes(id) on delete cascade,
  note        text not null,
  given_by    uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
create index if not exists stars_athlete_idx on public.stars(athlete_id);

alter table public.stars enable row level security;
drop policy if exists "stars read" on public.stars;
drop policy if exists "stars insert staff" on public.stars;
drop policy if exists "stars delete staff" on public.stars;
create policy "stars read" on public.stars for select using (public.is_approved());
create policy "stars insert staff" on public.stars for insert with check (public.is_staff());
create policy "stars delete staff" on public.stars for delete using (public.is_staff());

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('dm', 'team_chat', 'assessment', 'approval', 'goal', 'reminder', 'event', 'reaction', 'star', 'drop'));

create or replace function public.notify_star()
returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  select p.id into uid from public.profiles p join public.athletes a on a.identifier = p.athlete_id where a.id = new.athlete_id limit 1;
  if uid is not null then
    insert into public.notifications (user_id, type, title, body, view)
    values (uid, 'star', 'Il mister ti ha dato una stella! ⭐', new.note, 'profilo');
  end if;
  return new;
end;
$$;
drop trigger if exists on_star_notify on public.stars;
create trigger on_star_notify after insert on public.stars
  for each row execute function public.notify_star();
