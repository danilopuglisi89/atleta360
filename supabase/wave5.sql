-- ============================================================
-- ONDATA 5 — Utilità e stile
--   - Motto personale (RPC dedicata: mai un update diretto su profiles,
--     per non rischiare di toccare status/ruolo per sbaglio)
--   - Scadenze certificati (solo date, nessun documento caricato)
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

alter table public.profiles add column if not exists motto text;

create or replace function public.set_my_motto(p_motto text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set motto = nullif(trim(p_motto), '') where id = auth.uid();
end;
$$;

-- ---------- Scadenze certificati ----------
create table if not exists public.certificates (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.athletes(id) on delete cascade,
  label       text not null,
  expires_on  date not null,
  reminded_30 boolean not null default false,
  reminded_7  boolean not null default false,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
alter table public.certificates enable row level security;
drop policy if exists "certificates staff" on public.certificates;
create policy "certificates staff" on public.certificates for all
  using (public.is_staff()) with check (public.is_staff());

create or replace function public.send_certificate_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare
  c record;
  sent integer := 0;
begin
  for c in
    select * from public.certificates
    where expires_on = (now() at time zone 'Europe/Rome')::date + 30 and not reminded_30
       or expires_on = (now() at time zone 'Europe/Rome')::date + 7  and not reminded_7
  loop
    insert into public.notifications (user_id, type, title, body, view)
    select p.id, 'reminder', 'Certificato in scadenza ⏰',
      c.label || ' scade il ' || to_char(c.expires_on, 'DD/MM/YYYY'), 'staff'
    from public.profiles p
    where p.status = 'approved' and (p.role = 'admin' or p.category in ('direzione', 'staff'));

    update public.certificates set
      reminded_30 = reminded_30 or (expires_on = (now() at time zone 'Europe/Rome')::date + 30),
      reminded_7  = reminded_7  or (expires_on = (now() at time zone 'Europe/Rome')::date + 7)
    where id = c.id;
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'a360-certificate-reminders') then perform cron.unschedule('a360-certificate-reminders'); end if;
  perform cron.schedule('a360-certificate-reminders', '0 8 * * *', $job$select public.send_certificate_reminders()$job$);
end $$;
