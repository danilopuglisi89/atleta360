-- ============================================================
-- GAMIFICATION — ONDATA B: quiz settimanale con classifica.
-- Le domande vivono nel codice (src/quiz.js), qui c'è solo il punteggio:
-- un tentativo a settimana per persona, +2 punti partecipazione per ogni
-- risposta esatta (trigger, non insert dal client sui punti).
-- Incolla nel SQL Editor di Supabase e premi Run. Sicuro da ri-eseguire.
-- (Richiede gamify-a.sql già eseguito — tabella participation_points.)
-- ============================================================

create table if not exists public.quiz_scores (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  week_key    text not null,
  score       int not null,
  total       int not null,
  created_at  timestamptz not null default now(),
  unique (user_id, week_key)
);
alter table public.quiz_scores enable row level security;
drop policy if exists "quiz read" on public.quiz_scores;
drop policy if exists "quiz insert own" on public.quiz_scores;
create policy "quiz read" on public.quiz_scores for select using (public.is_approved());
create policy "quiz insert own" on public.quiz_scores for insert with check (user_id = auth.uid());
-- Niente update/delete dal client: un tentativo a settimana, il vincolo
-- unique(user_id, week_key) basta a impedirne un secondo.

create or replace function public.award_points_quiz()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.score > 0 then
    insert into public.participation_points (user_id, action, points) values (new.user_id, 'quiz', new.score * 2);
  end if;
  return new;
end;
$$;
drop trigger if exists on_quiz_points on public.quiz_scores;
create trigger on_quiz_points after insert on public.quiz_scores
  for each row execute function public.award_points_quiz();

-- Classifica della settimana corrente (nomi + punteggio), senza allargare
-- la RLS di profiles — stesso pattern di todays_daily_moments().
create or replace function public.weekly_quiz_leaderboard(p_week_key text)
returns table(user_id uuid, first_name text, score int, total int) language sql security definer stable as $$
  select qs.user_id, p.first_name, qs.score, qs.total
  from public.quiz_scores qs
  join public.profiles p on p.id = qs.user_id
  where qs.week_key = p_week_key and p.status = 'approved'
  order by qs.score desc, qs.created_at asc;
$$;
