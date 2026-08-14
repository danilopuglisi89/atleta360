// Applausi sul profilo: un tocco per compagna, tipo "mi piace" (unico per
// coppia dà+riceve, si toglie ricliccando). Vedi supabase/wave4.sql.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useReactions(targetAthleteId, uid) {
  const [count, setCount] = useState(0);
  const [mine, setMine] = useState(false);

  const load = useCallback(async () => {
    if (!targetAthleteId) return;
    const { data } = await supabase.from("profile_reactions").select("from_user_id").eq("target_athlete_id", targetAthleteId);
    setCount((data || []).length);
    setMine((data || []).some((r) => r.from_user_id === uid));
  }, [targetAthleteId, uid]);
  useEffect(() => { load(); }, [load]);

  const toggle = async () => {
    if (!targetAthleteId || !uid) return;
    if (mine) {
      await supabase.from("profile_reactions").delete().eq("target_athlete_id", targetAthleteId).eq("from_user_id", uid);
    } else {
      await supabase.from("profile_reactions").insert({ target_athlete_id: targetAthleteId, from_user_id: uid });
    }
    await load();
  };
  return { count, mine, toggle };
}
