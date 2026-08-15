// Diario privato, check-in pre-allenamento, indisponibilità/infortuni.
// Vedi supabase/wave3.sql.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// ---------- Diario privato ----------
export function useDiary(athleteId) {
  const [entries, setEntries] = useState([]);
  const load = useCallback(async () => {
    if (!athleteId) { setEntries([]); return; }
    const { data } = await supabase.from("athlete_diary").select("*").eq("athlete_id", athleteId).order("created_at", { ascending: false }).limit(30);
    setEntries(data || []);
  }, [athleteId]);
  useEffect(() => { load(); }, [load]);

  const addEntry = async ({ mood, energy, note }) => {
    if (!athleteId) return "Profilo non collegato.";
    const { error } = await supabase.from("athlete_diary").insert({ athlete_id: athleteId, mood, energy, note: note?.trim() || null });
    if (error) return error.message;
    await load();
    return null;
  };
  const removeEntry = async (id) => {
    const { error } = await supabase.from("athlete_diary").delete().eq("id", id);
    if (error) return error.message;
    await load();
    return null;
  };
  return { entries, addEntry, removeEntry };
}

// ---------- Check-in pre-allenamento ----------
const todayIso = () => new Date().toISOString().slice(0, 10);

// kind: "pre" (energia pre-allenamento, default) o "post" (come ti sei
// sentita in partita) — stessa tabella, distinte da una colonna in più.
export function useCheckins(athleteId, kind = "pre") {
  const [today, setToday] = useState(null);      // il mio check-in di oggi (energy) o null
  const [all, setAll] = useState([]);             // tutti i check-in di oggi (per lo staff)

  const load = useCallback(async () => {
    const { data } = await supabase.from("checkins").select("*").eq("checkin_date", todayIso()).eq("kind", kind);
    setAll(data || []);
    setToday(athleteId ? (data || []).find((c) => c.athlete_id === athleteId)?.energy ?? null : null);
  }, [athleteId, kind]);
  useEffect(() => { load(); }, [load]);

  const setEnergy = async (energy) => {
    if (!athleteId) return "Profilo non collegato.";
    const { error } = await supabase.from("checkins").upsert(
      { athlete_id: athleteId, checkin_date: todayIso(), energy, kind },
      { onConflict: "athlete_id,checkin_date,kind" }
    );
    if (error) return error.message;
    await load();
    return null;
  };
  return { today, all, setEnergy };
}

// ---------- Indisponibilità / infortuni ----------
export function useUnavailability(athleteId) {
  const [current, setCurrent] = useState(null);   // riga attiva (until >= oggi) o null
  const load = useCallback(async () => {
    if (!athleteId) { setCurrent(null); return; }
    const { data } = await supabase.from("unavailability").select("*").eq("athlete_id", athleteId).gte("until", todayIso()).order("until", { ascending: false }).limit(1);
    setCurrent(data?.[0] || null);
  }, [athleteId]);
  useEffect(() => { load(); }, [load]);

  const setUnavailable = async (until, reason) => {
    if (!athleteId) return "Profilo non collegato.";
    const { error } = await supabase.from("unavailability").insert({ athlete_id: athleteId, until, reason: reason?.trim() || null });
    if (error) return error.message;
    await load();
    return null;
  };
  const clear = async () => {
    if (!current) return null;
    const { error } = await supabase.from("unavailability").delete().eq("id", current.id);
    if (error) return error.message;
    await load();
    return null;
  };
  return { current, setUnavailable, clear };
}
