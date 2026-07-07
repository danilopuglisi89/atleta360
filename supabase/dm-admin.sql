-- ============================================================
-- Messaggi privati: consenti anche all'admin di partecipare (2 vie tra
-- i membri della chat = atlete + admin). Incolla nel SQL Editor → Run.
-- ============================================================

create or replace function public.chat_member(u uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = u and p.status = 'approved' and (p.role = 'admin' or p.category = 'atleta')
  );
$$;

drop policy if exists "dm insert" on public.direct_messages;
create policy "dm insert" on public.direct_messages for insert
  with check (sender_id = auth.uid() and public.chat_member(auth.uid()) and public.chat_member(recipient_id));
