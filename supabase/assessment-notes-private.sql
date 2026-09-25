-- ============================================================
-- NOTE DEL RILEVAMENTO: SOLO ALLO STAFF (26/09/2026)
--
-- Decisione di Danilo: le note che il mister scrive nel rilevamento non le
-- vede nessuna atleta. Prima stavano in assessments.note, e la lettura di
-- assessments è permessa a chiunque sia approvato: ogni atleta riceveva sul
-- telefono le note di tutte (nel profilo la sua, in Andamento quelle delle
-- compagne). Nascondere lo schermo non bastava: il dato arrivava comunque.
--
-- Ora le note vivono in assessment_notes, leggibile e scrivibile solo dallo
-- staff (is_staff(): admin, direzione, staff — il mister è staff). La
-- colonna assessments.note resta per compatibilità ma è sempre vuota: un
-- trigger sposta subito qualunque nota scritta lì (anche da un'app non
-- ancora aggiornata sul telefono del mister).
--
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- ============================================================

create table if not exists public.assessment_notes (
  assessment_id uuid primary key references public.assessments(id) on delete cascade,
  note          text not null,
  updated_at    timestamptz not null default now()
);

alter table public.assessment_notes enable row level security;

drop policy if exists "assessment notes staff" on public.assessment_notes;
create policy "assessment notes staff" on public.assessment_notes
  for all using (public.is_staff()) with check (public.is_staff());

-- Qualunque nota scritta in assessments finisce qui, e da lì sparisce.
create or replace function public.move_assessment_note()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if nullif(trim(new.note), '') is not null then
    insert into public.assessment_notes (assessment_id, note, updated_at)
    values (new.id, trim(new.note), now())
    on conflict (assessment_id) do update set note = excluded.note, updated_at = now();
    update public.assessments set note = null where id = new.id;
  end if;
  return null;
end;
$$;

drop trigger if exists move_assessment_note on public.assessments;
create trigger move_assessment_note
  after insert or update of note on public.assessments
  for each row when (new.note is not null)
  execute function public.move_assessment_note();

-- Le note già scritte (il primo rilevamento del 25/09) si spostano ora.
insert into public.assessment_notes (assessment_id, note)
select id, trim(note) from public.assessments
where nullif(trim(note), '') is not null
on conflict (assessment_id) do update set note = excluded.note, updated_at = now();

update public.assessments set note = null where note is not null;

-- Verifica: note spostate e nessuna nota rimasta leggibile dalle atlete.
select (select count(*) from public.assessment_notes) as note_riservate,
       (select count(*) from public.assessments where note is not null) as note_ancora_visibili_deve_essere_0;
