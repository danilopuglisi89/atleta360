-- ============================================================
-- Atleta360 — Email di notifica a ogni nuova iscrizione
-- Trigger sul database: a ogni nuova riga in public.profiles invia una
-- email via Resend usando l'estensione pg_net (chiamate HTTP dal database).
--
-- COME USARE:
--   1. Sostituisci re_INCOLLA_LA_TUA_CHIAVE_RESEND con la tua API key di Resend.
--   2. Incolla tutto nel SQL Editor di Supabase e premi Run.
--
-- Nota sicurezza: la chiave resta nel TUO database privato (non nel codice
-- pubblico). Se la rigeneri su Resend, ri-esegui questo script aggiornato.
-- ============================================================

create extension if not exists pg_net;

create or replace function public.notify_admin_new_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  full_name text := nullif(trim(coalesce(new.first_name, '') || ' ' || coalesce(new.last_name, '')), '');
  cat text := case coalesce(new.category, 'atleta')
                when 'direzione' then 'Direzione'
                when 'staff' then 'Staff'
                else 'Atleta'
              end;
begin
  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer re_INCOLLA_LA_TUA_CHIAVE_RESEND',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'Atleta360 <onboarding@resend.dev>',
      'to', jsonb_build_array('info@danilopuglisi.com'),
      'subject', 'Nuova richiesta accesso: ' || coalesce(full_name, '(senza nome)') || ' (' || cat || ')',
      'html',
        '<div style="font-family:Arial,sans-serif;color:#0C1330">' ||
        '<h2 style="color:#0A1650">Nuova richiesta di accesso — Atleta360</h2>' ||
        '<p><strong>' || coalesce(full_name, '(senza nome)') || '</strong> ' ||
        '<span style="color:#B4520A">(' || cat || ')</span> ha richiesto l''accesso.</p>' ||
        '<p>Email: ' || coalesce(new.email, '') || '</p>' ||
        '<p><a href="https://atleta360-jl71.vercel.app" style="display:inline-block;background:#FF7A18;' ||
        'color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Approva o rifiuta</a></p>' ||
        '</div>'
    )
  );
  return new;
end;
$$;

drop trigger if exists on_new_signup_notify on public.profiles;
create trigger on_new_signup_notify
  after insert on public.profiles
  for each row execute function public.notify_admin_new_signup();
