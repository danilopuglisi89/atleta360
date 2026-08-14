// Calendario: eventi (partite/allenamenti), ricorrenze settimanali e
// conferme presenza. Vedi supabase/calendar.sql per lo schema.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useCalendar(uid) {
  const [events, setEvents] = useState(null);        // null = caricamento
  const [rsvps, setRsvps] = useState([]);            // tutte le conferme degli eventi caricati
  const [recurrences, setRecurrences] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 60 * 86400e3).toISOString();
    const [ev, rec] = await Promise.all([
      supabase.from("events").select("*").gte("starts_at", since).order("starts_at"),
      supabase.from("event_recurrences").select("*").order("weekday"),
    ]);
    if (ev.error) { setError(ev.error.message); setEvents([]); return; }
    setEvents(ev.data || []);
    setRecurrences(rec.data || []);
    const ids = (ev.data || []).map((e) => e.id);
    if (ids.length) {
      const { data: rs } = await supabase.from("event_rsvps").select("*").in("event_id", ids);
      setRsvps(rs || []);
    } else {
      setRsvps([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addEvent = async (fields) => {
    const { data: u } = await supabase.auth.getUser();
    const { error: err } = await supabase.from("events").insert({ ...fields, created_by: u?.user?.id || null });
    if (err) return err.message;
    await load();
    return null;
  };

  const updateEvent = async (id, patch) => {
    const { error: err } = await supabase.from("events").update(patch).eq("id", id);
    if (err) return err.message;
    await load();
    return null;
  };

  const removeEvent = async (id) => {
    const { error: err } = await supabase.from("events").delete().eq("id", id);
    if (err) return err.message;
    await load();
    return null;
  };

  // Conferma presenza dell'utente corrente (upsert su event+user).
  const setRsvp = async (eventId, status) => {
    if (!uid) return "Utente non riconosciuto";
    const { error: err } = await supabase.from("event_rsvps").upsert(
      { event_id: eventId, user_id: uid, status },
      { onConflict: "event_id,user_id" }
    );
    if (err) return err.message;
    setRsvps((prev) => {
      const rest = prev.filter((r) => !(r.event_id === eventId && r.user_id === uid));
      return [...rest, { event_id: eventId, user_id: uid, status }];
    });
    return null;
  };

  const addRecurrence = async (fields) => {
    const { data: u } = await supabase.auth.getUser();
    const { error: err } = await supabase.from("event_recurrences").insert({ ...fields, created_by: u?.user?.id || null });
    if (err) return err.message;
    await supabase.rpc("generate_recurring_events");   // popola subito le prossime settimane
    await load();
    return null;
  };

  const updateRecurrence = async (id, patch) => {
    const { error: err } = await supabase.from("event_recurrences").update(patch).eq("id", id);
    if (err) return err.message;
    if (patch.active === false) {
      // spegnere la routine cancella anche gli eventi futuri non ancora passati
      await supabase.from("events").delete().eq("recurrence_id", id).gte("starts_at", new Date().toISOString());
    } else {
      await supabase.rpc("generate_recurring_events");
    }
    await load();
    return null;
  };

  const removeRecurrence = async (id) => {
    await supabase.from("events").delete().eq("recurrence_id", id).gte("starts_at", new Date().toISOString());
    const { error: err } = await supabase.from("event_recurrences").delete().eq("id", id);
    if (err) return err.message;
    await load();
    return null;
  };

  return { events, rsvps, recurrences, error, reload: load, addEvent, updateEvent, removeEvent, setRsvp, addRecurrence, updateRecurrence, removeRecurrence };
}
