// Streak di coppia + tamagotchi di squadra — vedi supabase/wow-2.sql.
// Se quello script non è ancora stato eseguito, entrambi gli hook segnalano
// `unavailable` e le card si nascondono: meglio niente che un form che poi
// fallisce in silenzio al salvataggio (lezione delle ondate precedenti).
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useStreakBuddy(myAthleteId) {
  const [buddy, setBuddy] = useState(undefined);   // undefined = caricamento, null = nessuna scelta
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("my_streak_buddy");
    if (error) { setUnavailable(true); setBuddy(null); return; }
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

  return { buddy, pick, unavailable, loading: buddy === undefined && !unavailable };
}

export function useTeamGrowth() {
  const [total, setTotal] = useState(null);        // null = caricamento o non disponibile
  useEffect(() => {
    supabase.rpc("team_growth").then(({ data, error }) => {
      if (error) return;                            // la card resta nascosta
      setTotal(typeof data === "number" ? data : Number(data) || 0);
    });
  }, []);
  return total;
}
