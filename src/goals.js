import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// Obiettivi personali di un'atleta (tabella goals, vedi supabase/goals.sql).
export function useGoals(athleteId) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!athleteId) { setGoals([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("goals").select("*").eq("athlete_id", athleteId).order("created_at", { ascending: false });
    setGoals(data || []);
    setLoading(false);
  }, [athleteId]);

  useEffect(() => { load(); }, [load]);

  const addGoal = useCallback(async (skillKey, target, dueDate) => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("goals").insert({
      athlete_id: athleteId, skill_key: skillKey, target, due_date: dueDate || null, created_by: u?.user?.id || null,
    });
    if (!error) await load();
    return error;
  }, [athleteId, load]);

  const removeGoal = useCallback(async (id) => {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (!error) await load();
    return error;
  }, [load]);

  return { goals, loading, addGoal, removeGoal };
}
