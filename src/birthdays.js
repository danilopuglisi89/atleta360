// Compleanni di oggi (per il banner in Home). Vedi supabase/wave4.sql.
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useTodaysBirthdays() {
  const [names, setNames] = useState([]);
  useEffect(() => {
    supabase.from("athletes").select("identifier, birth_date").eq("active", true).then(({ data }) => {
      const today = new Date();
      const hits = (data || []).filter((a) => {
        if (!a.birth_date) return false;
        const d = new Date(a.birth_date);
        return d.getUTCMonth() === today.getMonth() && d.getUTCDate() === today.getDate();
      });
      setNames(hits.map((a) => a.identifier));
    });
  }, []);
  return names;
}
