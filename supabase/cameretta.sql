-- ============================================================
-- ONDATA 2 (mondo magico) — "la cameretta": campi identitari sul profilo,
-- oltre al motto già esistente. RPC dedicata, mai un update diretto su
-- profiles (stesso principio di set_my_motto/set_my_flair).
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

alter table public.profiles add column if not exists song_title text;
alter table public.profiles add column if not exists song_artist text;
alter table public.profiles add column if not exists ritual text;
alter table public.profiles add column if not exists nickname text;
-- Fino a 3 id badge scelti da lei per la vetrina in cima al profilo
-- (badge_ids è testo libero perché i badge sono calcolati lato client,
-- non hanno una tabella: qui salviamo solo quali mostrare).
alter table public.profiles add column if not exists showcase_badges jsonb;

create or replace function public.set_my_cameretta(
  p_song_title text, p_song_artist text, p_ritual text, p_nickname text, p_showcase jsonb
)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set
    song_title = nullif(trim(p_song_title), ''),
    song_artist = nullif(trim(p_song_artist), ''),
    ritual = nullif(trim(p_ritual), ''),
    nickname = nullif(trim(p_nickname), ''),
    showcase_badges = p_showcase
  where id = auth.uid();
end;
$$;
