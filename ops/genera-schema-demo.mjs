// Genera supabase/demo/01-schema-completo.sql: tutti gli script di Oasi in un
// solo file, nell'ordine in cui sono nati (= ordine delle dipendenze), per
// creare da zero un database vuoto (demo, banco di prova). 27/09/2026.
//
// Uso: node ops/genera-schema-demo.mjs
// Aggiungendo uno script nuovo in supabase/, aggiungerlo in fondo a ORDINE.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const ORDINE = [
  "schema", "data-model", "mister-permission", "admin-delete", "profile-fields", "chat", "chat-v2",
  "chat-reactions", "athlete-card", "notifications", "goals", "self-assessments", "attendance", "reports",
  "push", "calendar", "wave2", "wave3", "wave4", "wave5", "gamify-a", "gamify-b", "gamify-c", "gamify-d",
  "card-background", "team-feed", "avatar-2d", "cameretta", "figurine", "riti-stagioni", "drops",
  "gamify-athlete-only", "wow-1", "wow-2", "admin-status", "q1", "q3", "q4", "notification-anchors",
  "notifications-delete", "mvp", "settings", "wall", "profile-page", "social-links", "fix-last-seen",
  "members-directory", "season-metrics", "avatars-names", "chat-names", "evening-training-only", "study",
  "assessment-notes-private", "staff-texts-private", "ruoli-inviti", "autovalutazioni-private",
  "rilevamenti-doppi",
];
// Esclusi di proposito:
//   notify-email.sql  → email a ogni iscrizione via Resend, con chiave: non serve fuori da Oasi
//   last-seen.sql     → crea una seconda touch_last_seen() senza parametri (vedi fix-last-seen.sql)

let out = `-- ============================================================
-- ATLETA360 — SCHEMA COMPLETO PER UN DATABASE VUOTO
-- Generato da ops/genera-schema-demo.mjs il ${new Date().toISOString().slice(0, 10)}. NON modificare a mano:
-- si rigenera dagli script in supabase/.
--
-- Solo per un progetto Supabase NUOVO e vuoto (demo, prove). Mai su Oasi.
-- Incolla tutto nel SQL Editor e premi Run. Se si ferma con un errore,
-- il SQL Editor annulla tutto: copia il messaggio a Claude, si corregge e
-- si riesegue da capo (gli script sono rieseguibili).
-- ============================================================

`;
for (const nome of ORDINE) {
  const testo = readFileSync(`supabase/${nome}.sql`, "utf8").replace(/\r\n/g, "\n");
  out += `\n-- ############################################################\n-- ### ${nome}.sql\n-- ############################################################\n\n${testo.trim()}\n`;
}
out += `
-- ############################################################
-- ### Solo per la demo
-- ############################################################

-- Le notifiche push di Oasi passano dal server di oasi.danilopuglisi.com:
-- la demo non deve toccarlo. La campanella nell'app funziona lo stesso.
drop trigger if exists on_notification_push on public.notifications;

select 'schema completo installato' as esito,
       (select count(*) from information_schema.tables where table_schema = 'public') as tabelle,
       (select count(*) from pg_proc where pronamespace = 'public'::regnamespace) as funzioni;
`;
mkdirSync("supabase/demo", { recursive: true });
writeFileSync("supabase/demo/01-schema-completo.sql", out);
console.log(`scritti ${ORDINE.length} script, ${out.split("\n").length} righe`);
