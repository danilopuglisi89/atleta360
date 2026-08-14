// Stelle del mister: riconoscimento manuale (mai automatico) con una
// micro-motivazione, vedi supabase/gamify-d.sql.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useStars(athleteId) {
  const [stars, setStars] = useState(null);   // null = caricamento
  const load = useCallback(async () => {
    if (!athleteId) { setStars([]); return; }
    const { data } = await supabase.from("stars").select("*").eq("athlete_id", athleteId).order("created_at", { ascending: false });
    setStars(data || []);
  }, [athleteId]);
  useEffect(() => { load(); }, [load]);

  const award = async (targetAthleteId, note) => {
    if (!targetAthleteId || !note?.trim()) return "Scegli l'atleta e scrivi una motivazione.";
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("stars").insert({ athlete_id: targetAthleteId, note: note.trim(), given_by: u?.user?.id || null });
    if (error) return error.message;
    await load();
    return null;
  };

  return { stars, award, reload: load };
}
