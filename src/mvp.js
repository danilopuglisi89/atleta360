// Giocatore del match — vedi supabase/mvp.sql. Se lo script non è ancora
// stato eseguito l'hook segnala `unavailable` e i componenti si nascondono,
// invece di mostrare un bottone che poi non salva.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useMvp() {
  const [rows, setRows] = useState(null);          // null = caricamento
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("match_mvp").select("*");
    if (error) { setUnavailable(true); setRows([]); return; }
    setRows(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const award = async (eventId, athleteId, note) => {
    if (!eventId || !athleteId) return "Scegli l'atleta.";
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("match_mvp").upsert(
      { event_id: eventId, athlete_id: athleteId, note: note?.trim() || null, given_by: u?.user?.id || null },
      { onConflict: "event_id" }
    );
    if (error) return error.message;
    await load();
    return null;
  };

  const forEvent = (eventId) => (rows || []).find((r) => r.event_id === eventId) || null;
  const forAthlete = (athleteId) => (rows || []).filter((r) => r.athlete_id === athleteId);

  return { rows, unavailable, loading: rows === null, award, forEvent, forAthlete, reload: load };
}
