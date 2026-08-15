// Feed "Novità" di squadra + logica "bentornata dopo un'assenza" — vedi
// supabase/team-feed.sql. Il confronto con l'ultima visita resta sul
// dispositivo (localStorage): niente tracciamento server-side dell'ultimo
// accesso, basta per lo scopo (un promemoria gentile, non una metrica).
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const LAST_VISIT_KEY = "a360-last-visit";

const KIND_ICON = { moment: "💭", star: "⭐", photo: "📸", result: "🏐" };

function describe(row) {
  switch (row.kind) {
    case "moment":
      return { icon: row.headline || KIND_ICON.moment, text: `${row.actor_name || "Una compagna"} ha condiviso il momento del giorno${row.detail ? `: “${row.detail}”` : ""}` };
    case "star":
      return { icon: KIND_ICON.star, text: `${row.actor_name || "Una compagna"} ha ricevuto una stella dal mister${row.detail ? `: “${row.detail}”` : ""}` };
    case "photo":
      return { icon: KIND_ICON.photo, text: `${row.actor_name || "Una compagna"} ha aggiunto una foto all'album${row.detail ? `: “${row.detail}”` : ""}` };
    case "result":
      return { icon: KIND_ICON.result, text: `${row.headline || "Partita"}${row.detail ? ` · ${row.detail}` : ""}` };
    default:
      return { icon: "•", text: row.headline || "" };
  }
}

export function useTeamFeed() {
  const [rows, setRows] = useState(null);   // null = caricamento
  useEffect(() => {
    supabase.rpc("team_feed", { p_limit: 40 }).then(({ data }) => setRows(data || []));
  }, []);
  const items = (rows || []).map((r) => ({ ...r, ...describe(r) }));
  return { items, loading: rows === null };
}

// Ritorna gli item comparsi dopo l'ultima visita, SOLO se sono passati
// almeno 3 giorni (altrimenti "cosa ti sei persa" scatterebbe ogni volta
// che si chiude e riapre l'app nella stessa giornata).
export function useWelcomeBack(items) {
  const [gap, setGap] = useState(null);
  useEffect(() => {
    if (!items.length) return;
    const last = localStorage.getItem(LAST_VISIT_KEY);
    const now = Date.now();
    if (last) {
      const days = (now - Number(last)) / 86400000;
      if (days >= 3) {
        const since = Number(last);
        const missed = items.filter((it) => new Date(it.created_at).getTime() > since);
        if (missed.length) setGap({ days: Math.floor(days), missed });
      }
    }
    localStorage.setItem(LAST_VISIT_KEY, String(now));
    // Solo al primo elenco caricato: non deve ricalcolarsi ad ogni refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length > 0]);
  return gap;
}
