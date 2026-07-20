import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// Storico dei report IA generati in Area Staff (tabella reports, vedi
// supabase/reports.sql). Prima si perdevano al refresh della pagina.
export function useReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(30);
    setReports(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveReport = useCallback(async (content) => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("reports").insert({ content, created_by: u?.user?.id || null });
    if (!error) await load();
    return error;
  }, [load]);

  const removeReport = useCallback(async (id) => {
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (!error) await load();
    return error;
  }, [load]);

  return { reports, loading, saveReport, removeReport };
}
