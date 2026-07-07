-- ============================================================
-- Chat di squadra (bacheca pubblica) — riservata alle atlete e all'admin.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  author     text,                 -- nome visualizzato (snapshot)
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_created_idx on public.chat_messages(created_at);

alter table public.chat_messages enable row level security;

-- Partecipano alla chat: atlete approvate e admin.
create or replace function public.is_chat_member()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'approved' and (p.role = 'admin' or p.category = 'atleta')
  );
$$;

drop policy if exists "chat read"   on public.chat_messages;
drop policy if exists "chat insert" on public.chat_messages;
drop policy if exists "chat delete" on public.chat_messages;
create policy "chat read"   on public.chat_messages for select using (public.is_chat_member());
create policy "chat insert" on public.chat_messages for insert with check (public.is_chat_member() and user_id = auth.uid());
create policy "chat delete" on public.chat_messages for delete using (user_id = auth.uid() or public.is_admin());
