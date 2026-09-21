-- ============================================================
-- AVATAR DELLA GALLERIA OVUNQUE + NOMI DELLE ATLETE ABBREVIATI (21/09/2026)
--
-- 1. member_avatars(): le quindici atlete hanno scelto tutte l'avatar dalla
--    galleria (profiles.avatar_config), nessuna ha caricato una foto
--    (avatar_url). Le funzioni che alimentano squadra, chat, messaggi e
--    profilo restituiscono solo avatar_url, quindi ovunque tranne sul
--    proprio profilo si vedevano le iniziali. Questa funzione dà la
--    configurazione dell'avatar di chi è approvato: l'immagine la ricava il
--    client (src/memberAvatars.js). Nessun dato personale in più.
--
-- 2. members_directory(): nella pagina "La squadra" le atlete compaiono come
--    nome e iniziale del cognome ("Giulia R."), decisione di Danilo — sono
--    minorenni. L'abbreviazione avviene QUI, così il cognome intero non
--    arriva nemmeno al telefono delle compagne. Staff e direzione restano
--    con nome e cognome. Stessa firma di prima: nessuna seconda versione.
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

create or replace function public.member_avatars()
returns table(id uuid, avatar_config jsonb)
language sql security definer stable set search_path = public as $$
  select p.id, p.avatar_config
  from public.profiles p
  where p.status = 'approved'
    and p.avatar_config is not null
    and public.is_approved();
$$;

revoke all on function public.member_avatars() from public, anon;
grant execute on function public.member_avatars() to authenticated;

create or replace function public.members_directory()
returns table(
  id uuid, name text, avatar_url text, category text, role text,
  athlete_id text, ruolo text, jersey_number text, flair text
)
language sql security definer stable as $$
  select p.id,
         case
           when p.category = 'atleta' then
             nullif(trim(coalesce(trim(p.first_name), '')
               || coalesce(' ' || upper(left(nullif(trim(p.last_name), ''), 1)) || '.', '')), '')
           else
             nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '')
         end,
         p.avatar_url, p.category, p.role, p.athlete_id, p.ruolo, p.jersey_number, p.flair
  from public.profiles p
  where p.status = 'approved'
    and public.is_approved()
  order by p.first_name nulls last, p.last_name nulls last;
$$;

revoke all on function public.members_directory() from public, anon;
grant execute on function public.members_directory() to authenticated;

-- Verifica: devono comparire entrambe le funzioni.
select proname from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('member_avatars', 'members_directory');
