-- ============================================================
-- Reazioni ai messaggi della chat di squadra (stile WhatsApp: 👍❤️🔥…).
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede prima chat.sql — tabella chat_messages e is_chat_member().)
-- ============================================================

create table if not exists public.message_reactions (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)   -- un'atleta = una volta per emoji
);
create index if not exists message_reactions_msg_idx on public.message_reactions(message_id);

alter table public.message_reactions enable row level security;

-- Leggono e reagiscono i membri della chat; ogni utente gestisce solo le proprie.
drop policy if exists "react read"   on public.message_reactions;
drop policy if exists "react insert" on public.message_reactions;
drop policy if exists "react delete" on public.message_reactions;
create policy "react read"   on public.message_reactions for select using (public.is_chat_member());
create policy "react insert" on public.message_reactions for insert with check (public.is_chat_member() and user_id = auth.uid());
create policy "react delete" on public.message_reactions for delete using (user_id = auth.uid() or public.is_admin());
