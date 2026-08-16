-- ============================================================
-- PAGINA PROFILO STILE FACEBOOK — foto di copertina, cliccabilità estesa
-- a staff/admin (non solo atlete), feed "Novità" agganciato al profilo
-- (uuid) invece che al solo identificativo atleta.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede team-feed.sql e athlete-card.sql già eseguiti.)
-- ============================================================

-- ---------- Foto di copertina (stesso principio dell'avatar: testo in DB) ----------
alter table public.profiles add column if not exists cover_url text;

create or replace function public.set_my_cover(p_cover text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set cover_url = nullif(trim(p_cover), '') where id = auth.uid();
end;
$$;

-- ---------- chat_roster(): ora include TUTTI gli approvati, non solo   ----------
-- ---------- atlete/admin — serve perché ora anche lo staff ha un       ----------
-- ---------- profilo cliccabile.                                       ----------
drop function if exists public.chat_roster();

create or replace function public.chat_roster()
returns table(
  id uuid, name text, avatar_url text, category text,
  athlete_id text, ruolo text, jersey_number text, instagram text, facebook text
)
language sql security definer stable as $$
  select p.id,
         nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
         p.avatar_url, p.category, p.athlete_id, p.ruolo, p.jersey_number, p.instagram, p.facebook
  from public.profiles p
  where p.status = 'approved'
    and public.is_chat_member();
$$;
revoke all on function public.chat_roster() from public, anon;
grant execute on function public.chat_roster() to authenticated;

-- ---------- team_feed(): actor_id diventa l'uuid del profilo (non più    ----------
-- ---------- l'identificativo testuale dell'atleta) — così il feed può   ----------
-- ---------- aprire il profilo di CHIUNQUE, non solo delle atlete.       ----------
create or replace function public.team_feed(p_limit int default 40)
returns table(kind text, actor_name text, actor_id text, headline text, detail text, created_at timestamptz)
language sql security definer stable as $$
  select * from (
    select 'moment'::text as kind, p.first_name as actor_name, p.id::text as actor_id, dm.emoji as headline, dm.note as detail, dm.created_at
    from public.daily_moments dm
    join public.profiles p on p.id = dm.user_id
    where p.status = 'approved'

    union all

    select 'star', coalesce(p.first_name, a.identifier), p.id::text, 'stella'::text, s.note, s.created_at
    from public.stars s
    join public.athletes a on a.id = s.athlete_id
    left join public.profiles p on p.athlete_id = a.identifier and p.status = 'approved'

    union all

    select 'photo', p.first_name, p.id::text, 'foto'::text, ph.caption, ph.created_at
    from public.photos ph
    join public.profiles p on p.id = ph.uploaded_by
    where p.status = 'approved'

    union all

    select 'result', null::text, null::text, e.title, e.result, e.starts_at
    from public.events e
    where e.result is not null and not e.cancelled
  ) feed
  order by created_at desc
  limit p_limit;
$$;
