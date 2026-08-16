-- ============================================================
-- Più social nei link in cima al profilo: TikTok, YouTube, Snapchat
-- (oltre a Instagram/Facebook già esistenti). Stessa RPC di prima,
-- allargata — drop esplicito prima del create per evitare che restino
-- due versioni della funzione con firme diverse (vedi CLAUDE.md, trappola
-- già incontrata con team_feed).
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede profile-fields.sql già eseguito.)
-- ============================================================

alter table public.profiles
  add column if not exists tiktok   text,
  add column if not exists youtube  text,
  add column if not exists snapchat text;

drop function if exists public.update_my_profile(text, text, text, text, text, text);

create or replace function public.update_my_profile(
  p_phone text default null,
  p_facebook text default null,
  p_instagram text default null,
  p_jersey_number text default null,
  p_ruolo text default null,
  p_avatar_url text default null,
  p_tiktok text default null,
  p_youtube text default null,
  p_snapchat text default null
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
    avatar_url = p_avatar_url,
    tiktok = p_tiktok,
    youtube = p_youtube,
    snapchat = p_snapchat
  where id = auth.uid();
end;
$$;

revoke all on function public.update_my_profile(text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text, text, text, text, text, text, text) to authenticated;
