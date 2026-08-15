-- ============================================================
-- Sfondo personalizzato delle card condivisibili.
-- L'atleta carica una sua foto: viene ridotta e compressa dal browser
-- (~700px, JPEG) e salvata come testo, come gia' si fa per l'avatar e per
-- l'album foto — nessun bucket Storage da configurare.
--
-- Scrittura tramite RPC dedicata, MAI update diretto su profiles: cosi'
-- non si rischia di toccare status/role per sbaglio (stesso principio di
-- set_my_motto e set_my_flair).
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

alter table public.profiles add column if not exists card_bg text;
-- 'sfumata' (default) = foto molto sfocata, fa da atmosfera
-- 'nitida'            = foto riconoscibile dietro al velo navy
alter table public.profiles add column if not exists card_bg_style text;

create or replace function public.set_my_card_bg(p_bg text, p_style text default 'sfumata')
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set card_bg = nullif(p_bg, ''),
      card_bg_style = case when p_style in ('sfumata', 'nitida') then p_style else 'sfumata' end
  where id = auth.uid();
end;
$$;
