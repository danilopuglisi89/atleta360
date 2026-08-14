// Appunti rapidi per atleta: note volanti raccolte dal mister in palestra,
// da ritrovare al momento del rilevamento. Vedi supabase/wave2.sql.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useAthleteNotes(athleteId) {
  const [notes, setNotes] = useState([]);

  const load = useCallback(async () => {
    if (!athleteId) { setNotes([]); return; }
    const { data } = await supabase.from("athlete_notes").select("*").eq("athlete_id", athleteId).order("created_at", { ascending: false }).limit(20);
    setNotes(data || []);
  }, [athleteId]);

  useEffect(() => { load(); }, [load]);

  const addNote = async (note) => {
    if (!athleteId || !note.trim()) return "Manca l'atleta o il testo.";
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("athlete_notes").insert({ athlete_id: athleteId, note: note.trim(), created_by: u?.user?.id || null });
    if (error) return error.message;
    await load();
    return null;
  };

  const removeNote = async (id) => {
    const { error } = await supabase.from("athlete_notes").delete().eq("id", id);
    if (error) return error.message;
    await load();
    return null;
  };

  return { notes, reload: load, addNote, removeNote };
}
