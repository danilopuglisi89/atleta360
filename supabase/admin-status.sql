-- ============================================================
-- Admin: oltre all'ultimo accesso, mostra anche se l'app è installata
-- sul telefono e se le notifiche push sono attive, per ogni membro.
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede last-seen.sql e push.sql già eseguiti.)
-- ============================================================

alter table public.profiles add column if not exists pwa_installed boolean not null default false;

-- touch_last_seen ora accetta anche lo stato "installata": chiamata una
-- volta ad ogni apertura con il risultato di matchMedia("(display-mode:
-- standalone)"). Il parametro è opzionale (default null = non aggiornarlo)
-- per restare compatibile con eventuali chiamate senza argomenti.
create or replace function public.touch_last_seen(p_installed boolean default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set
    last_seen_at = now(),
    pwa_installed = case when p_installed is not null then p_installed else pwa_installed end
  where id = auth.uid();
end;
$$;

-- Chi ha almeno una subscription push attiva: solo gli id, mai gli
-- endpoint/chiavi (quelli restano privati a ciascuno, vedi push.sql).
create or replace function public.staff_push_status()
returns table(user_id uuid) language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Solo lo staff può vedere lo stato delle notifiche';
  end if;
  return query select distinct ps.user_id from public.push_subscriptions ps;
end;
$$;
