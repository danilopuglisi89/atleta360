// Album foto di squadra: upload compresso lato client (canvas -> data URL,
// stesso principio già usato per la foto profilo), salvato come riga di
// testo — niente Supabase Storage da configurare. Vedi supabase/wave4.sql.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const MAX_W = 1280, QUALITY = 0.72;

export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, MAX_W / img.width);
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function usePhotos(uid) {
  const [photos, setPhotos] = useState(null);
  const load = useCallback(async () => {
    const { data } = await supabase.from("photos").select("*").order("created_at", { ascending: false }).limit(40);
    setPhotos(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const upload = async (file, caption) => {
    const url = await compressImage(file);
    const { error } = await supabase.from("photos").insert({ url, caption: caption?.trim() || null, uploaded_by: uid });
    if (error) return error.message;
    await load();
    return null;
  };
  const remove = async (id) => {
    const { error } = await supabase.from("photos").delete().eq("id", id);
    if (error) return error.message;
    await load();
    return null;
  };
  return { photos, upload, remove };
}
