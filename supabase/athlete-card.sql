-- ============================================================
-- Card pubblica dell'atleta (stile social): estende chat_roster con il
-- collegamento all'atleta (athlete_id), il ruolo e i social, così l'app
-- può mostrare foto/ruolo e avviare un messaggio privato dal nome cliccato.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede prima chat.sql + chat-v2.sql.)
-- ============================================================

-- La firma cambia (nuove colonne): va ricreata da zero.
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
  where p.status = 'approved' and (p.role = 'admin' or p.category = 'atleta')
    and public.is_chat_member();
$$;
revoke all on function public.chat_roster() from public, anon;
grant execute on function public.chat_roster() to authenticated;
