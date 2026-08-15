// Streak di coppia + tamagotchi di squadra — vedi supabase/wow-2.sql.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useStreakBuddy(myAthleteId) {
  const [buddy, setBuddy] = useState(undefined);   // undefined = caricamento, null = nessuna scelta
  const load = useCallback(async () => {
    const { data } = await supabase.rpc("my_streak_buddy");
    setBuddy(data?.[0] || null);
  }, []);
  useEffect(() => { load(); }, [load]);

  const pick = async (buddyAthleteId) => {
    if (!myAthleteId) return "Profilo non collegato.";
    const { error } = await supabase.from("streak_buddies").upsert(
      { athlete_id: myAthleteId, buddy_athlete_id: buddyAthleteId },
      { onConflict: "athlete_id" }
    );
    if (error) return error.message;
    await load();
    return null;
  };

  return { buddy, pick, loading: buddy === undefined };
}

export function useTeamGrowth() {
  const [total, setTotal] = useState(null);
  useEffect(() => {
    supabase.rpc("team_growth").then(({ data }) => setTotal(typeof data === "number" ? data : Number(data) || 0));
  }, []);
  return total;
}
