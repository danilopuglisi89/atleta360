-- ============================================================
-- ONDATA 2 (mondo magico) — avatar componibile: risolve anche la privacy
-- di chi non vuole la foto vera in giro (usabile anche sulle card
-- condivisibili al posto della foto).
-- RPC dedicata, mai un update diretto su profiles (stesso principio di
-- set_my_motto/set_my_flair/set_my_card_bg).
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

alter table public.profiles add column if not exists avatar_config jsonb;

create or replace function public.set_my_avatar_config(p_config jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set avatar_config = p_config where id = auth.uid();
end;
$$;
