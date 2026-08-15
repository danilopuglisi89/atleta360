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

// "Momento del giorno" stile BeReal: un'emoji (+ foto facoltativa) + nota
// al giorno, feed di squadra con reazioni (tabelle daily_moments +
// moment_reactions, RPC todays_daily_moments/todays_moment_reactions —
// solo Oasi). Vedi supabase/wow-1.sql per la foto e le reazioni.
export function useDailyMoments(uid) {
  const [feed, setFeed] = useState(null);        // null = caricamento
  const [reactions, setReactions] = useState({}); // moment_id -> [{emoji,count}]
  const [unavailable, setUnavailable] = useState(false);  // tabella non ancora creata
  const load = useCallback(async () => {
    const [{ data, error }, { data: rx }] = await Promise.all([
      supabase.rpc("todays_daily_moments"),
      supabase.rpc("todays_moment_reactions"),
    ]);
    setUnavailable(!!error);
    setFeed(data || []);
    const map = {};
    (rx || []).forEach((r) => { (map[r.moment_id] ||= []).push({ emoji: r.emoji, count: r.count }); });
    setReactions(map);
  }, []);
  useEffect(() => { load(); }, [load]);

  const mine = uid ? (feed || []).find((m) => m.user_id === uid) || null : null;

  const save = async (emoji, note, photo) => {
    if (!uid) return "Utente non riconosciuto.";
    const { error } = await supabase.from("daily_moments").upsert(
      { user_id: uid, emoji, note: note?.trim() || null, photo: photo || null, moment_date: todayIso() },
      { onConflict: "user_id,moment_date" }
    );
    if (error) return error.message;
    await load();
    return null;
  };

  // Una reazione per persona per momento: ricliccare la stessa la toglie,
  // cliccarne un'altra la sostituisce (niente scelta multipla, resta leggero).
  const [myReactions, setMyReactions] = useState({});
  useEffect(() => {
    if (!uid) return;
    supabase.from("moment_reactions").select("moment_id,emoji").eq("user_id", uid)
      .then(({ data }) => setMyReactions(Object.fromEntries((data || []).map((r) => [r.moment_id, r.emoji]))));
  }, [uid, feed]);

  const react = async (momentId, emoji) => {
    if (!uid) return;
    const mineNow = myReactions[momentId];
    if (mineNow === emoji) {
      await supabase.from("moment_reactions").delete().eq("moment_id", momentId).eq("user_id", uid);
    } else {
      await supabase.from("moment_reactions").upsert({ moment_id: momentId, user_id: uid, emoji }, { onConflict: "moment_id,user_id" });
    }
    await load();
  };

  return { feed, mine, save, reactions, myReactions, react, loading: feed === null, unavailable };
}
