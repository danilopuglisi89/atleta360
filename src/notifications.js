import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

/*
 * Notifiche in-app per l'utente corrente: chat di squadra, messaggi privati,
 * nuovi rilevamenti, approvazione account (vedi supabase/notifications.sql
 * per i trigger che le creano). Realtime: si aggiornano da sole, senza polling.
 */
export function useNotifications(userId) {
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    if (!userId) { setItems([]); return; }
    const { data } = await supabase.from("notifications").select("*")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
    setItems(data || []);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, load]);

  const unread = useMemo(() => items.filter((n) => !n.read), [items]);
  const unreadChat = useMemo(() => unread.filter((n) => n.type === "dm" || n.type === "team_chat"), [unread]);
  const unreadDmFromIds = useMemo(
    () => [...new Set(unread.filter((n) => n.type === "dm" && n.meta?.from_id).map((n) => n.meta.from_id))],
    [unread]
  );

  const markRead = useCallback(async (ids) => {
    if (!ids.length) return;
    setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    await supabase.from("notifications").update({ read: true }).in("id", ids);
  }, []);

  const markAllRead = useCallback(() => markRead(unread.map((n) => n.id)), [unread, markRead]);
  const markTypeRead = useCallback(
    (types) => markRead(items.filter((n) => !n.read && types.includes(n.type)).map((n) => n.id)),
    [items, markRead]
  );
  const markFromRead = useCallback(
    (fromId) => markRead(items.filter((n) => !n.read && n.type === "dm" && n.meta?.from_id === fromId).map((n) => n.id)),
    [items, markRead]
  );

  return { items, unread, unreadChat, unreadDmFromIds, markRead, markAllRead, markTypeRead, markFromRead };
}
