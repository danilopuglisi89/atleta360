-- ============================================================
-- Ultimo accesso di ogni membro (staff e atlete), visibile in Area Staff.
-- RPC dedicata, mai un update diretto su profiles (stesso principio di
-- set_my_motto/set_my_flair): aggiorna SOLO last_seen_at, l'app la chiama
-- una volta ad ogni apertura.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

alter table public.profiles add column if not exists last_seen_at timestamptz;

create or replace function public.touch_last_seen()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set last_seen_at = now() where id = auth.uid();
end;
$$;
