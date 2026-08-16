-- ============================================================
-- Bacheca personale (stile Facebook, adattata a un gruppo di minorenni):
-- ognuno pubblica SOLO sulla propria bacheca — pensiero, foto, umore o il
-- repost di un badge/momento — le altre reagiscono solo con un cuore.
-- Lo staff pubblica solo testo (bacheca "istituzionale": niente foto
-- personali, niente tag). Lo staff può sempre eliminare qualunque post o
-- tag, oltre all'autrice stessa — rete di sicurezza silenziosa.
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede notifications.sql già eseguito, per la notifica di tag.)
-- ============================================================

create table if not exists public.wall_posts (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references auth.users(id) on delete cascade,
  kind         text not null check (kind in ('text', 'photo', 'mood', 'repost')),
  body         text,
  photo_url    text,
  mood_emoji   text,
  repost_kind  text check (repost_kind in ('badge', 'moment') or repost_kind is null),
  repost_label text,
  repost_emoji text,
  created_at   timestamptz not null default now()
);
create index if not exists wall_posts_author_idx on public.wall_posts(author_id, created_at desc);

create table if not exists public.wall_post_tags (
  post_id        uuid not null references public.wall_posts(id) on delete cascade,
  tagged_user_id uuid not null references auth.users(id) on delete cascade,
  removed        boolean not null default false,
  created_at     timestamptz not null default now(),
  primary key (post_id, tagged_user_id)
);

create table if not exists public.wall_post_reactions (
  post_id    uuid not null references public.wall_posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.wall_posts enable row level security;
alter table public.wall_post_tags enable row level security;
alter table public.wall_post_reactions enable row level security;

drop policy if exists "wall posts read" on public.wall_posts;
drop policy if exists "wall posts insert own" on public.wall_posts;
drop policy if exists "wall posts delete own or staff" on public.wall_posts;
create policy "wall posts read" on public.wall_posts for select using (public.is_approved());
create policy "wall posts insert own" on public.wall_posts for insert with check (public.is_approved() and author_id = auth.uid());
create policy "wall posts delete own or staff" on public.wall_posts for delete using (author_id = auth.uid() or public.is_staff());

drop policy if exists "wall tags read" on public.wall_post_tags;
drop policy if exists "wall tags insert by author" on public.wall_post_tags;
drop policy if exists "wall tags remove own" on public.wall_post_tags;
drop policy if exists "wall tags delete own or staff" on public.wall_post_tags;
create policy "wall tags read" on public.wall_post_tags for select using (public.is_approved());
-- Solo l'autrice del post può taggare, e solo mentre lo pubblica.
create policy "wall tags insert by author" on public.wall_post_tags for insert with check (
  exists (select 1 from public.wall_posts wp where wp.id = wall_post_tags.post_id and wp.author_id = auth.uid())
);
-- La persona taggata può solo togliersi il tag (mai cambiarlo per un'altra).
create policy "wall tags remove own" on public.wall_post_tags for update
  using (tagged_user_id = auth.uid()) with check (tagged_user_id = auth.uid());
create policy "wall tags delete own or staff" on public.wall_post_tags for delete using (tagged_user_id = auth.uid() or public.is_staff());

drop policy if exists "wall reactions read" on public.wall_post_reactions;
drop policy if exists "wall reactions insert own" on public.wall_post_reactions;
drop policy if exists "wall reactions delete own" on public.wall_post_reactions;
create policy "wall reactions read" on public.wall_post_reactions for select using (public.is_approved());
create policy "wall reactions insert own" on public.wall_post_reactions for insert with check (public.is_approved() and user_id = auth.uid());
create policy "wall reactions delete own" on public.wall_post_reactions for delete using (user_id = auth.uid());

-- ---------- Regole di contenuto: lo staff resta "istituzionale" ----------
-- Difesa in profondità: anche se l'interfaccia non offre foto/umore/tag
-- allo staff, il database non li accetta comunque.
create or replace function public.check_wall_post_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_athlete boolean;
begin
  select (p.category = 'atleta' and p.role <> 'admin') into is_athlete
  from public.profiles p where p.id = new.author_id;
  if not coalesce(is_athlete, false) and new.kind <> 'text' then
    raise exception 'I post istituzionali possono essere solo testo';
  end if;
  return new;
end;
$$;
drop trigger if exists on_wall_post_check on public.wall_posts;
create trigger on_wall_post_check before insert on public.wall_posts
  for each row execute function public.check_wall_post_rules();

create or replace function public.check_wall_tag_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  post_author uuid;
  is_athlete boolean;
begin
  select author_id into post_author from public.wall_posts where id = new.post_id;
  select (p.category = 'atleta' and p.role <> 'admin') into is_athlete
  from public.profiles p where p.id = post_author;
  if not coalesce(is_athlete, false) then
    raise exception 'I post istituzionali non possono taggare nessuno';
  end if;
  return new;
end;
$$;
drop trigger if exists on_wall_tag_check on public.wall_post_tags;
create trigger on_wall_tag_check before insert on public.wall_post_tags
  for each row execute function public.check_wall_tag_rules();

-- ---------- Notifica quando vieni taggata (riusa il tipo 'reaction', già
-- ammesso, per non dover riallineare notifications_type_check in 7 file) ----------
create or replace function public.notify_wall_tag()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  tagger_name text;
begin
  select nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '') into tagger_name
  from public.profiles p join public.wall_posts wp on wp.author_id = p.id
  where wp.id = new.post_id;

  insert into public.notifications (user_id, type, title, body, view, meta)
  values (new.tagged_user_id, 'reaction', coalesce(tagger_name, 'Qualcuno') || ' ti ha taggata in un pensiero 🏷️',
    'Vai a vedere il post', 'profilo', jsonb_build_object('anchor', 'a360-wall'));
  return new;
end;
$$;
drop trigger if exists on_wall_tag_notify on public.wall_post_tags;
create trigger on_wall_tag_notify after insert on public.wall_post_tags
  for each row execute function public.notify_wall_tag();
