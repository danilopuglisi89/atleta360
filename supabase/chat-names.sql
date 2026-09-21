-- ============================================================
-- NOMI DELLE ATLETE ABBREVIATI ANCHE IN CHAT (21/09/2026)
--
-- Decisione di Danilo: le atlete (minorenni) compaiono come "Nome C.",
-- come già nella pagina La squadra (avatars-names.sql). In chat il nome
-- non viene calcolato: è salvato dentro ogni messaggio al momento
-- dell'invio (chat_messages.author, direct_messages.sender_name /
-- recipient_name), e da lì finisce anche nelle notifiche. Quindi:
--
--   1. display_name(uid): il nome da mostrare, in un posto solo.
--   2. Trigger che al salvataggio sostituiscono il nome mandato dal
--      telefono con quello giusto — vale anche per chi ha ancora la
--      versione vecchia dell'app in memoria.
--   3. chat_roster() (elenco "A chi vuoi scrivere?") con i nomi brevi.
--   4. Correzione UNA TANTUM dei messaggi e delle notifiche già esistenti:
--      cambia solo il nome del mittente/destinatario, MAI il testo scritto.
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

-- 1. Il nome da mostrare
create or replace function public.display_name(u uuid)
returns text language sql security definer stable set search_path = public as $$
  select case
    when p.category = 'atleta' then
      nullif(trim(coalesce(trim(p.first_name), '')
        || coalesce(' ' || upper(left(nullif(trim(p.last_name), ''), 1)) || '.', '')), '')
    else
      nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), '')
  end
  from public.profiles p where p.id = u;
$$;
revoke all on function public.display_name(uuid) from public, anon;

-- 2. Trigger al salvataggio
create or replace function public.chat_author_name()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is not null then
    new.author := coalesce(public.display_name(new.user_id), new.author);
  end if;
  return new;
end;
$$;
drop trigger if exists chat_author_name on public.chat_messages;
create trigger chat_author_name before insert or update of author on public.chat_messages
  for each row execute function public.chat_author_name();

create or replace function public.dm_names()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.sender_id is not null then
    new.sender_name := coalesce(public.display_name(new.sender_id), new.sender_name);
  end if;
  if new.recipient_id is not null then
    new.recipient_name := coalesce(public.display_name(new.recipient_id), new.recipient_name);
  end if;
  return new;
end;
$$;
drop trigger if exists dm_names on public.direct_messages;
create trigger dm_names before insert or update of sender_name, recipient_name on public.direct_messages
  for each row execute function public.dm_names();

-- 3. Elenco chat. Esistono due versioni storiche con colonne diverse
-- (chat-v2.sql e athlete-card.sql): "create or replace" non può cambiare le
-- colonne, quindi si ricrea la più completa. Il client legge un sottoinsieme.
drop function if exists public.chat_roster();
create function public.chat_roster()
returns table(
  id uuid, name text, avatar_url text, category text,
  athlete_id text, ruolo text, jersey_number text, instagram text, facebook text
)
language sql security definer stable set search_path = public as $$
  select p.id, public.display_name(p.id),
         p.avatar_url, p.category, p.athlete_id, p.ruolo, p.jersey_number, p.instagram, p.facebook
  from public.profiles p
  where p.status = 'approved' and (p.role = 'admin' or p.category = 'atleta')
    and public.is_chat_member();
$$;
revoke all on function public.chat_roster() from public, anon;
grant execute on function public.chat_roster() to authenticated;

-- 4. Correzione dei dati già salvati (solo i nomi, mai i testi)
update public.chat_messages m
   set author = public.display_name(m.user_id)
 where m.user_id is not null
   and public.display_name(m.user_id) is not null
   and m.author is distinct from public.display_name(m.user_id);

update public.direct_messages d
   set sender_name    = coalesce(public.display_name(d.sender_id), d.sender_name),
       recipient_name = coalesce(public.display_name(d.recipient_id), d.recipient_name)
 where d.sender_name    is distinct from coalesce(public.display_name(d.sender_id), d.sender_name)
    or d.recipient_name is distinct from coalesce(public.display_name(d.recipient_id), d.recipient_name);

-- Notifiche già arrivate ("Giulia Rossi ha scritto in bacheca"): si sostituisce
-- il nome completo di ciascuna atleta con quello breve, nel titolo, nel testo
-- dell'avviso e nel mittente registrato.
do $$
declare r record;
begin
  for r in
    select trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as intero,
           public.display_name(p.id) as breve
    from public.profiles p
    where p.category = 'atleta' and nullif(trim(p.last_name), '') is not null
  loop
    if r.breve is not null and r.intero <> r.breve then
      update public.notifications
         set title = replace(title, r.intero, r.breve),
             body  = replace(body, r.intero, r.breve),
             meta  = replace(meta::text, r.intero, r.breve)::jsonb
       where title like '%' || r.intero || '%'
          or body  like '%' || r.intero || '%'
          or meta::text like '%' || r.intero || '%';
    end if;
  end loop;
end $$;

-- Verifica: nessun messaggio con un nome diverso da quello previsto (deve dare 0).
select count(*) as messaggi_da_correggere
from public.chat_messages m
where m.user_id is not null and m.author is distinct from public.display_name(m.user_id);
