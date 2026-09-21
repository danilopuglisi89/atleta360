// Controllo di stato dell'app, solo per l'admin.
//
// Nasce da una giornata in cui sono venuti a galla tre guasti rimasti
// invisibili per settimane: "ultimo accesso" vuoto da mesi perché mancava una
// colonna, il Coach IA fermo da dieci giorni per crediti esauriti, e una
// pagina che andava in errore. Nessuno si era fatto notare: mancava un posto
// dove l'app dicesse che qualcosa è rotto.
//
// VOLUTAMENTE senza script SQL: uno script che serve a scoprire gli script non
// eseguiti avrebbe lo stesso problema che vuole risolvere. Qui si interroga
// quello che c'è, e funziona appena deployato.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

// Tabella → script che la crea, così il messaggio dice cosa eseguire.
const TABELLE = [
  ["notifications", "notifications.sql"],
  ["self_assessments", "self-assessments.sql"],
  ["goals", "goals.sql"],
  ["reports", "reports.sql"],
  ["attendance", "attendance.sql"],
  ["push_subscriptions", "push.sql"],
  ["events", "calendar.sql"],
  ["checkins", "wave3.sql"],
  ["photos", "wave4.sql"],
  ["certificates", "wave5.sql"],
  ["participation_points", "gamify-a.sql"],
  ["quiz_scores", "gamify-b.sql"],
  ["photo_reactions", "gamify-c.sql"],
  ["stars", "gamify-d.sql"],
  ["season_reports", "q3.sql"],
  ["video_clips", "q4.sql"],
  ["app_settings", "settings.sql"],
  ["wall_posts", "wall.sql"],
  ["streak_buddies", "wow-2.sql"],
  ["app_events", "season-metrics.sql"],
  ["season_snapshots", "season-metrics.sql"],
];

// Colonne aggiunte da uno script a una tabella che esisteva già: sono le più
// insidiose, perché la tabella c'è e sembra tutto a posto.
const COLONNE = [
  ["profiles", "last_seen_at", "fix-last-seen.sql"],
  ["profiles", "pwa_installed", "admin-status.sql"],
  ["profiles", "cover_url", "profile-page.sql"],
  ["profiles", "tiktok", "social-links.sql"],
];

// SOLO funzioni di sola lettura. Mai send_reminder, admin_* o set_my_*:
// un controllo non deve mandare notifiche a quindici famiglie né scrivere.
const FUNZIONI = [
  ["members_directory", {}, "members-directory.sql"],
  ["season_stats", {}, "season-metrics.sql"],
  ["staff_push_status", {}, "admin-status.sql"],
  ["my_participation_level", {}, "gamify-a.sql"],
  ["weekly_quiz_leaderboard", { p_week_key: "check" }, "gamify-b.sql"],
];

const manca = (error) =>
  !!error && (error.code === "42P01" || error.code === "42703" || error.code === "PGRST202" ||
    /does not exist|schema cache/i.test(error.message || ""));

const giorniDa = (iso) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null);

async function controllaTabella([nome, script]) {
  const { error } = await supabase.from(nome).select("*", { head: true, count: "exact" });
  if (manca(error)) return { id: `t-${nome}`, label: `Tabella ${nome}`, ok: false, dettaglio: "non esiste", fix: `Esegui supabase/${script} nel SQL Editor.` };
  return { id: `t-${nome}`, label: `Tabella ${nome}`, ok: true };
}

async function controllaColonna([tabella, colonna, script]) {
  const { error } = await supabase.from(tabella).select(colonna).limit(1);
  if (manca(error)) return { id: `c-${colonna}`, label: `Colonna ${tabella}.${colonna}`, ok: false, dettaglio: "non esiste", fix: `Esegui supabase/${script} nel SQL Editor.` };
  return { id: `c-${colonna}`, label: `Colonna ${tabella}.${colonna}`, ok: true };
}

async function controllaFunzione([nome, args, script]) {
  const { error } = await supabase.rpc(nome, args);
  if (manca(error)) return { id: `f-${nome}`, label: `Funzione ${nome}`, ok: false, dettaglio: "non esiste", fix: `Esegui supabase/${script} nel SQL Editor.` };
  // Un errore diverso (permessi, argomenti) significa che la funzione c'è:
  // qui interessa solo se esiste, non se sappiamo chiamarla bene.
  return { id: `f-${nome}`, label: `Funzione ${nome}`, ok: true };
}

// È il controllo che avrebbe intercettato il Coach fermo per dieci giorni.
async function controllaRelay() {
  try {
    const r = await fetch("/api/health", { cache: "no-store" });
    const d = await r.json();
    const spenti = ["coach", "push", "summary"].filter((k) => !d[k]);
    if (spenti.length) {
      return { id: "relay", label: "Servizi sul server", ok: false, dettaglio: `spenti: ${spenti.join(", ")}`,
        fix: "Sul VPS, controlla le variabili in .env.coach e riavvia atleta360-coach esportandole prima." };
    }
    return { id: "relay", label: "Servizi sul server", ok: true, dettaglio: "coach, notifiche e riepilogo attivi" };
  } catch {
    return { id: "relay", label: "Servizi sul server", ok: false, dettaglio: "non risponde",
      fix: "Il processo atleta360-coach è fermo: riavvialo sul VPS." };
  }
}

async function controllaFreschezza() {
  const out = [];

  const { data: ult } = await supabase.from("assessments").select("created_at").order("created_at", { ascending: false }).limit(1);
  const g = giorniDa(ult?.[0]?.created_at);
  out.push(g === null
    ? { id: "rilev", label: "Rilevamenti del mister", ok: false, dettaglio: "nessuno, mai",
        fix: "Senza il primo rilevamento restano vuoti badge, classifica, andamento e confronto." }
    : { id: "rilev", label: "Rilevamenti del mister", ok: g <= 45, dettaglio: g === 0 ? "oggi" : `${g} giorni fa`,
        fix: g > 45 ? "Più di un mese e mezzo senza valutazioni: il percorso si è fermato." : undefined });

  const { data: snap, error: eSnap } = await supabase.from("season_snapshots").select("taken_on").order("taken_on", { ascending: false }).limit(1);
  if (!manca(eSnap)) {
    const gs = giorniDa(snap?.[0]?.taken_on);
    out.push({ id: "snap", label: "Fotografia di stagione", ok: gs !== null && gs <= 10,
      dettaglio: gs === null ? "mai presa" : `${gs} giorni fa`,
      fix: gs === null || gs > 10 ? "Il lavoro pianificato settimanale non sta girando: controlla pg_cron." : undefined });
  }

  const { data: push } = await supabase.rpc("staff_push_status");
  const { data: prof } = await supabase.from("profiles").select("id, last_seen_at").eq("status", "approved").eq("category", "atleta");
  const atlete = (prof || []).length;
  const conPush = new Set((push || []).map((r) => r.user_id));
  const nPush = (prof || []).filter((p) => conPush.has(p.id)).length;
  const nEntrate = (prof || []).filter((p) => p.last_seen_at).length;

  out.push({ id: "push", label: "Notifiche attive", ok: atlete === 0 || nPush > atlete / 2,
    dettaglio: `${nPush} atlete su ${atlete}`,
    fix: nPush <= atlete / 2 ? "Meno di metà squadra riceve le notifiche: ricordaglielo in palestra." : undefined });

  out.push({ id: "accessi", label: "Atlete che sono entrate", ok: atlete === 0 || nEntrate > 0,
    dettaglio: `${nEntrate} su ${atlete}`,
    fix: nEntrate === 0 ? "Nessuna è ancora entrata da quando l'ultimo accesso viene registrato." : undefined });

  return out;
}

export function useSystemHealth() {
  const [checks, setChecks] = useState(null);

  const esegui = useCallback(async () => {
    setChecks(null);
    const [tab, col, fun, relay, fresh] = await Promise.all([
      Promise.all(TABELLE.map(controllaTabella)),
      Promise.all(COLONNE.map(controllaColonna)),
      Promise.all(FUNZIONI.map(controllaFunzione)),
      controllaRelay(),
      controllaFreschezza(),
    ]);
    setChecks([
      { gruppo: "Servizi", voci: [relay] },
      { gruppo: "Dati", voci: fresh },
      { gruppo: "Struttura del database", voci: [...col, ...fun, ...tab] },
    ]);
  }, []);

  useEffect(() => { esegui(); }, [esegui]);

  const problemi = (checks || []).flatMap((g) => g.voci).filter((v) => !v.ok);
  return { checks, problemi, loading: checks === null, ricontrolla: esegui };
}
