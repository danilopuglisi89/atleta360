// Punti partecipazione + streak check-in (Ondata A gamification, vedi
// supabase/gamify-a.sql). I punti si vedono in sola lettura: li assegnano
// solo i trigger lato database sulle azioni vere (mai una insert dal client).
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const todayIso = () => new Date().toISOString().slice(0, 10);

// Giorni consecutivi di check-in fino a oggi (o fino a ieri se oggi manca
// ancora): stessa logica del dispatcher push, ma calcolata qui in JS sui
// dati già disponibili al client invece che via RPC dedicata.
function computeStreak(dates) {
  const set = new Set(dates);
  const d = new Date();
  const iso = () => d.toISOString().slice(0, 10);
  if (!set.has(iso())) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (set.has(iso())) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

export function useParticipation(athleteId) {
  const [level, setLevel] = useState(null);   // { total_points, level, level_label } o null se la tabella non esiste ancora
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [lvlRes, chkRes] = await Promise.all([
      supabase.rpc("my_participation_level"),
      athleteId
        ? supabase.from("checkins").select("checkin_date").eq("athlete_id", athleteId).order("checkin_date", { ascending: false }).limit(60)
        : Promise.resolve({ data: [] }),
    ]);
    setLevel(lvlRes.data?.[0] || null);
    setStreak(computeStreak((chkRes.data || []).map((r) => r.checkin_date)));
    setLoading(false);
  }, [athleteId]);

  useEffect(() => { load(); }, [load]);
  return { level, streak, loading, reload: load };
}

// "Momento del giorno" stile BeReal: un'emoji + nota al giorno, feed di
// squadra (tabella daily_moments, RPC todays_daily_moments — solo Oasi).
export function useDailyMoments(uid) {
  const [feed, setFeed] = useState(null);        // null = caricamento
  const [unavailable, setUnavailable] = useState(false);  // tabella non ancora creata
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("todays_daily_moments");
    setUnavailable(!!error);
    setFeed(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const mine = uid ? (feed || []).find((m) => m.user_id === uid) || null : null;

  const save = async (emoji, note) => {
    if (!uid) return "Utente non riconosciuto.";
    const { error } = await supabase.from("daily_moments").upsert(
      { user_id: uid, emoji, note: note?.trim() || null, moment_date: todayIso() },
      { onConflict: "user_id,moment_date" }
    );
    if (error) return error.message;
    await load();
    return null;
  };

  return { feed, mine, save, loading: feed === null, unavailable };
}
