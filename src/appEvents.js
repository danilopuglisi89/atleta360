// Registro delle azioni che altrimenti non lascerebbero traccia: una card
// condivisa, un evento esportato nel calendario, una scheda stampata. Sono
// tutte cose che avvengono solo nel browser, quindi senza questo non
// esistono da nessuna parte. Vedi supabase/season-metrics.sql.
import { supabase } from "./supabaseClient";

// Tipi in uso. Non c'è un vincolo sul database: aggiungerne uno qui basta.
export const EVENTI = {
  SHARE_CARD: "share_card",
  EXPORT_ICS: "export_ics",
  PRINT_PROFILE: "print_profile",
  PRINT_REPORT: "print_report",
};

// Non blocca mai chi sta usando l'app: parte e non si aspetta la risposta.
// L'errore però finisce in console — ingoiarlo del tutto è esattamente ciò
// che ha tenuto vuoto "ultimo accesso" per mesi senza che nessuno lo notasse.
export function logEvent(kind, meta) {
  try {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data?.user?.id;
      if (!uid) return;
      supabase.from("app_events").insert({ user_id: uid, kind, meta: meta || null })
        .then(({ error }) => { if (error) console.warn("app_events:", kind, error.message); });
    });
  } catch (e) {
    console.warn("app_events:", kind, e?.message || e);
  }
}
