// Impostazioni globali dell'app (solo admin le scrive) — vedi
// supabase/settings.sql. "Guasto = tutto acceso": se la tabella non esiste
// ancora o una lettura fallisce, ogni funzione resta attiva com'è oggi,
// mai un cambiamento a sorpresa per le atlete per colpa di uno script non
// ancora eseguito.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { VENUES as DEFAULT_VENUES } from "./venues";

export const FEATURE_GROUPS = {
  giochi: [
    { key: "feature_quiz", label: "Quiz settimanale" },
    { key: "feature_figurine", label: "Album figurine" },
    { key: "feature_mission", label: "Missione del giorno" },
    { key: "feature_teampet", label: "Pianta di squadra" },
    { key: "feature_streakbuddy", label: "Streak di coppia" },
    { key: "feature_drops", label: "Drop fortunati" },
  ],
  sociale: [
    { key: "feature_dailymoment", label: "Momento del giorno" },
    { key: "feature_photoalbum", label: "Album foto" },
    { key: "feature_videoclips", label: "Clip di partita" },
    { key: "feature_polls", label: "Sondaggi" },
    { key: "feature_applause", label: "Applausi sul profilo" },
    { key: "feature_teamfeed", label: "Bacheca di squadra" },
  ],
  benessere: [
    { key: "feature_checkin", label: "Check-in energia" },
    { key: "feature_diary", label: "Diario privato" },
    { key: "feature_prematch", label: "Routine pre-partita" },
    { key: "feature_selfassessment", label: "Autovalutazione" },
  ],
  notifiche: [
    { key: "notif_event_reminder", label: "Promemoria evento (sera prima)" },
    { key: "notif_checkin_prompt", label: "Sollecito check-in allenamento" },
    { key: "notif_prematch_prompt", label: "Sollecito pre-partita" },
    { key: "notif_birthday", label: "Compleanni" },
    { key: "notif_daily_engagement", label: "Spinta serale (streak/momento)" },
  ],
};
const ALL_FLAG_KEYS = Object.values(FEATURE_GROUPS).flat().map((f) => f.key);

function defaultFlags() {
  const d = {};
  ALL_FLAG_KEYS.forEach((k) => (d[k] = true));
  return d;
}

export function useAppSettings() {
  const [flags, setFlags] = useState(defaultFlags);
  const [venues, setVenues] = useState(DEFAULT_VENUES);
  const [teamName, setTeamName] = useState("Oasi Volley U19");
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("app_settings").select("key, value");
    if (error) { setUnavailable(true); setLoaded(true); return; }
    const map = {};
    (data || []).forEach((r) => { map[r.key] = r.value; });

    const nextFlags = defaultFlags();
    ALL_FLAG_KEYS.forEach((k) => { if (typeof map[k] === "boolean") nextFlags[k] = map[k]; });
    setFlags(nextFlags);

    if (Array.isArray(map.venues) && map.venues.length) setVenues(map.venues);
    if (typeof map.team_name === "string" && map.team_name.trim()) setTeamName(map.team_name);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setFlag = async (key, value) => {
    setFlags((f) => ({ ...f, [key]: value }));   // ottimistico
    const { error } = await supabase.rpc("set_app_setting", { p_key: key, p_value: value });
    if (error) { await load(); return error.message; }   // errore: torna allo stato vero
    return null;
  };

  const setVenuesRemote = async (list) => {
    setVenues(list);
    const { error } = await supabase.rpc("set_app_setting", { p_key: "venues", p_value: list });
    if (error) { await load(); return error.message; }
    return null;
  };

  const setTeamNameRemote = async (name) => {
    setTeamName(name);
    const { error } = await supabase.rpc("set_app_setting", { p_key: "team_name", p_value: name });
    if (error) { await load(); return error.message; }
    return null;
  };

  return { flags, venues, teamName, loaded, unavailable, setFlag, setVenues: setVenuesRemote, setTeamName: setTeamNameRemote, reload: load };
}
