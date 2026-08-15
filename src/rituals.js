// Riti di squadra (Ondata 4 del mondo magico): grido pre-partita, parola
// della partita, capsula di inizio stagione, canzone della settimana +
// playlist. Vedi supabase/riti-stagioni.sql.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// ---------- Il grido pre-partita ----------
export function usePregameCheers(eventId, uid) {
  const [rows, setRows] = useState([]);
  const load = useCallback(async () => {
    if (!eventId) return;
    const { data } = await supabase.from("pregame_cheers").select("user_id,emoji,note").eq("event_id", eventId);
    setRows(data || []);
  }, [eventId]);
  useEffect(() => { load(); }, [load]);

  const mine = rows.find((r) => r.user_id === uid) || null;
  const send = async (emoji, note) => {
    if (!eventId || !uid) return;
    await supabase.from("pregame_cheers").upsert({ event_id: eventId, user_id: uid, emoji, note: note?.trim() || null }, { onConflict: "event_id,user_id" });
    await load();
  };
  return { rows, mine, send };
}

// ---------- La parola della partita ----------
export function useMatchWords(eventId, uid) {
  const [rows, setRows] = useState([]);
  const load = useCallback(async () => {
    if (!eventId) return;
    const { data } = await supabase.from("match_words").select("user_id,word").eq("event_id", eventId);
    setRows(data || []);
  }, [eventId]);
  useEffect(() => { load(); }, [load]);

  const mine = rows.find((r) => r.user_id === uid) || null;
  const send = async (word) => {
    if (!eventId || !uid || !word?.trim()) return;
    await supabase.from("match_words").upsert({ event_id: eventId, user_id: uid, word: word.trim().slice(0, 24) }, { onConflict: "event_id,user_id" });
    await load();
  };
  return { rows, mine, send };
}

// ---------- La capsula di inizio stagione ----------
export function useSeasonCapsule(uid) {
  const [capsule, setCapsule] = useState(undefined);   // undefined = caricamento, null = non ancora scritta
  const load = useCallback(async () => {
    if (!uid) return;
    const { data } = await supabase.from("season_capsules").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(1).maybeSingle();
    setCapsule(data || null);
  }, [uid]);
  useEffect(() => { load(); }, [load]);

  const write = async (message, unlockDate) => {
    if (!uid || !message?.trim()) return;
    await supabase.from("season_capsules").insert({ user_id: uid, message: message.trim(), unlock_date: unlockDate });
    await load();
  };
  const isUnlocked = capsule && new Date(capsule.unlock_date) <= new Date();
  return { capsule, isUnlocked, write, loading: capsule === undefined };
}

// ---------- Canzone della settimana + playlist ----------
const weekKey = () => {
  const d = new Date();
  const dayIndex = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return `w${Math.floor(dayIndex / 7)}`;
};

export function useTeamSettings() {
  const [settings, setSettings] = useState({});
  const load = useCallback(async () => {
    const { data } = await supabase.from("team_settings").select("key,value");
    setSettings(Object.fromEntries((data || []).map((r) => [r.key, r.value])));
  }, []);
  useEffect(() => { load(); }, [load]);

  const setKey = async (key, value) => {
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("team_settings").upsert({ key, value, updated_by: u?.user?.id || null, updated_at: new Date().toISOString() });
    await load();
  };

  let weekSong = null;
  try { weekSong = settings.week_song ? JSON.parse(settings.week_song) : null; } catch { weekSong = null; }
  const isCurrentWeek = weekSong?.week === weekKey();

  return {
    playlistUrl: settings.playlist_url || "",
    setPlaylistUrl: (url) => setKey("playlist_url", url),
    weekSong: isCurrentWeek ? weekSong : null,
    setWeekSong: (title, artist, by) => setKey("week_song", JSON.stringify({ title, artist, by, week: weekKey() })),
  };
}
