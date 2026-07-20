import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// Registro presenze (tabella attendance, vedi supabase/attendance.sql).
export function useAttendance() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("attendance").select("*").order("session_date", { ascending: false });
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Salva il check-in di una intera sessione: una riga per atleta, upsert
  // sul vincolo (athlete_id, session_date) così si può correggere lo stesso
  // allenamento più volte senza creare duplicati.
  const saveSession = useCallback(async (sessionDate, presenceByAthleteId) => {
    const { data: u } = await supabase.auth.getUser();
    const payload = Object.entries(presenceByAthleteId).map(([athlete_id, present]) => ({
      athlete_id, session_date: sessionDate, present, created_by: u?.user?.id || null,
    }));
    if (!payload.length) return null;
    const { error } = await supabase.from("attendance").upsert(payload, { onConflict: "athlete_id,session_date" });
    if (!error) await load();
    return error;
  }, [load]);

  return { rows, loading, saveSession };
}
