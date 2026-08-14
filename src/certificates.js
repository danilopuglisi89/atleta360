// Scadenze certificati (solo date, nessun documento caricato). Promemoria
// automatico a 30 e 7 giorni dalla scadenza. Vedi supabase/wave5.sql.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useCertificates() {
  const [rows, setRows] = useState([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("certificates").select("*").order("expires_on", { ascending: true });
    setRows(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const addCert = async (athleteId, label, expiresOn) => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("certificates").insert({ athlete_id: athleteId, label: label.trim(), expires_on: expiresOn, created_by: u?.user?.id || null });
    if (error) return error.message;
    await load();
    return null;
  };
  const removeCert = async (id) => {
    const { error } = await supabase.from("certificates").delete().eq("id", id);
    if (error) return error.message;
    await load();
    return null;
  };
  return { rows, addCert, removeCert };
}
