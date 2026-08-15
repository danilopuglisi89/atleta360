// Album figurine — vedi supabase/figurine.sql. Un pacchetto ogni 20 punti
// partecipazione, 3 compagne a caso per pacchetto, doppioni possibili.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useFigurines(uid) {
  const [packs, setPacks] = useState(0);
  const [collection, setCollection] = useState(null);   // null = caricamento

  const load = useCallback(async () => {
    if (!uid) return;
    const [{ data: prof }, { data: coll }] = await Promise.all([
      supabase.from("profiles").select("figurine_packs").eq("id", uid).maybeSingle(),
      supabase.from("figurine_collection").select("athlete_id,copies,first_obtained_at").eq("owner_id", uid),
    ]);
    setPacks(prof?.figurine_packs ?? 0);
    setCollection(coll || []);
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  const open = async () => {
    const { data, error } = await supabase.rpc("open_figurine_pack");
    if (error) return { error: error.message, cards: [] };
    await load();
    return { error: null, cards: data || [] };
  };

  return { packs, collection, open, reload: load, loading: collection === null };
}
