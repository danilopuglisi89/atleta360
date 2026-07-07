-- ============================================================
-- Area personale: campi opzionali del profilo + auto-modifica sicura.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

alter table public.profiles
  add column if not exists phone         text,
  add column if not exists facebook      text,
  add column if not exists instagram     text,
  add column if not exists jersey_number text,
  add column if not exists ruolo         text,
  add column if not exists avatar_url    text;

-- Ogni utente può aggiornare SOLO i propri campi facoltativi (non stato/ruolo/
-- categoria/permessi/collegamento atleta: quelli restano all'admin).
create or replace function public.update_my_profile(
  p_phone text default null,
  p_facebook text default null,
  p_instagram text default null,
  p_jersey_number text default null,
  p_ruolo text default null,
  p_avatar_url text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set
    phone = p_phone,
    facebook = p_facebook,
    instagram = p_instagram,
    jersey_number = p_jersey_number,
    ruolo = p_ruolo,
    avatar_url = p_avatar_url
  where id = auth.uid();
end;
$$;

revoke all on function public.update_my_profile(text, text, text, text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text, text, text, text) to authenticated;
