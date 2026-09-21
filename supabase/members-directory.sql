-- ============================================================
-- Pagina "Atlete": elenco di TUTTI i membri approvati (atlete, staff,
-- direzione, admin) con foto e ruolo, per aprire il profilo di ciascuno.
--
-- Perché non riusare chat_roster(): quella è protetta da is_chat_member(),
-- vera solo per admin e atlete — il mister vedrebbe un elenco vuoto.
-- Qui la guardia è is_approved(): chiunque sia dentro la squadra vede
-- gli altri. La chat resta com'è.
--
-- Volutamente NON esposti: email, telefono, ultimo accesso, punteggi.
-- Il telefono resta visibile solo nel profilo, a chi lo ha compilato.
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

create or replace function public.members_directory()
returns table(
  id uuid, name text, avatar_url text, category text, role text,
  athlete_id text, ruolo text, jersey_number text, flair text
)
language sql security definer stable as $$
  select p.id,
         nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
         p.avatar_url, p.category, p.role, p.athlete_id, p.ruolo, p.jersey_number, p.flair
  from public.profiles p
  where p.status = 'approved'
    and public.is_approved()
  order by p.first_name nulls last, p.last_name nulls last;
$$;

revoke all on function public.members_directory() from public, anon;
grant execute on function public.members_directory() to authenticated;
