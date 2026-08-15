// Clip video di partita: link (YouTube/Drive/simili), non file caricati —
// vedi supabase/q4.sql per il perché. Stesso modello dell'album foto.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useVideoClips() {
  const [clips, setClips] = useState(null);
  const load = useCallback(async () => {
    const { data } = await supabase.from("video_clips").select("*").order("created_at", { ascending: false }).limit(30);
    setClips(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async (url, caption, uid) => {
    const clean = (url || "").trim();
    if (!/^https?:\/\//i.test(clean)) return "Incolla un link valido (che inizi con http:// o https://).";
    const { error } = await supabase.from("video_clips").insert({ url: clean, caption: caption?.trim() || null, uploaded_by: uid });
    if (error) return error.message;
    await load();
    return null;
  };
  const remove = async (id) => {
    const { error } = await supabase.from("video_clips").delete().eq("id", id);
    if (error) return error.message;
    await load();
    return null;
  };
  return { clips, add, remove };
}
