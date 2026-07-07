-- ============================================================
-- Cancellazione DEFINITIVA di un utente rifiutato (solo admin).
-- Elimina l'account di autenticazione: a cascata sparisce anche il profilo,
-- e l'email torna libera per un'eventuale nuova registrazione.
-- Incolla nel SQL Editor di Supabase e premi Run.
-- ============================================================

create or replace function public.admin_delete_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo un admin può eseguire questa operazione.
  if not public.is_admin() then
    raise exception 'Operazione non consentita';
  end if;
  -- Per sicurezza si possono eliminare solo utenti con richiesta RIFIUTATA.
  if not exists (select 1 from public.profiles where id = target and status = 'rejected') then
    raise exception 'Si possono eliminare definitivamente solo gli utenti rifiutati';
  end if;
  -- Elimina l'utente di autenticazione (cascade su profiles).
  delete from auth.users where id = target;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;
