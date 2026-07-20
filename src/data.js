import { supabase } from "./supabaseClient";

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short" }) : "";

// Costruisce il modello usato dalle viste a partire dalle righe Supabase.
export function buildModel(skills, athletes, assessments, selfAssessments = []) {
  const active = skills.filter((s) => s.active !== false).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const keys = active.map((s) => s.key);
  const SHORT = Object.fromEntries(active.map((s) => [s.key, s.short || s.title || s.key]));
  const TITLE = Object.fromEntries(active.map((s) => [s.key, s.title || s.key]));
  const DESC = Object.fromEntries(active.map((s) => [s.key, s.description || ""]));

  const idToIdentifier = Object.fromEntries(athletes.map((a) => [a.id, a.identifier]));
  const roster = athletes
    .filter((a) => a.active !== false)
    .map((a) => ({ id: a.id, identifier: a.identifier, position: a.position || "" }))
    .sort((x, y) => x.identifier.localeCompare(y.identifier, "it"));

  // Raggruppa i rilevamenti per atleta (identificatore), ordinati nel tempo.
  const byId = {};
  const allTs = [];
  [...assessments]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .forEach((r) => {
      const identifier = idToIdentifier[r.athlete_id];
      if (!identifier) return;
      const scores = {};
      keys.forEach((k) => {
        const v = Number(r.scores?.[k]);
        if (!Number.isNaN(v) && r.scores?.[k] !== null && r.scores?.[k] !== undefined && r.scores?.[k] !== "") scores[k] = v;
      });
      allTs.push(new Date(r.created_at).getTime());
      (byId[identifier] ||= []).push({ ts: r.created_at, scores, nota: (r.note || "").trim() });
    });

  const atleti = {}, storico = {};
  Object.entries(byId).forEach(([identifier, entries]) => {
    const last = entries[entries.length - 1];
    const ath = athletes.find((a) => a.identifier === identifier);
    atleti[identifier] = {
      id: identifier,
      athleteId: ath?.id,
      position: ath?.position || "",
      scores: last.scores,
      nota: last.nota,
    };
    storico[identifier] = entries.map((e) => ({ periodo: fmtDate(e.ts), nota: e.nota, ...e.scores }));
  });

  // Ultima autovalutazione per atleta (stesso raggruppamento delle assessments
  // del mister). Tabella facoltativa: se non esiste ancora, selfAssessments è [].
  const selfById = {};
  [...selfAssessments]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .forEach((r) => {
      const identifier = idToIdentifier[r.athlete_id];
      if (!identifier) return;
      const scores = {};
      keys.forEach((k) => {
        const v = Number(r.scores?.[k]);
        if (!Number.isNaN(v) && r.scores?.[k] !== null && r.scores?.[k] !== undefined && r.scores?.[k] !== "") scores[k] = v;
      });
      (selfById[identifier] ||= []).push({ ts: r.created_at, scores });
    });
  Object.entries(selfById).forEach(([identifier, entries]) => {
    if (atleti[identifier]) atleti[identifier].self = entries[entries.length - 1];
  });

  const NOMI = Object.keys(atleti);
  const overall = (n) =>
    Math.round((keys.reduce((a, k) => a + (atleti[n]?.scores[k] ?? 0), 0) / Math.max(keys.length, 1)) * 10) / 10;
  const RANK = [...NOMI].sort((a, b) => overall(b) - overall(a));
  const TEAM_AVG = keys.map((k) => ({
    skill: SHORT[k], full: 10,
    valore: Math.round((NOMI.reduce((a, n) => a + (atleti[n].scores[k] ?? 0), 0) / Math.max(NOMI.length, 1)) * 10) / 10,
  }));
  const maxTs = allTs.length ? Math.max(...allTs) : 0;
  const lastPeriod = maxTs ? fmtDate(new Date(maxTs).toISOString()) : "—";

  return {
    keys, SHORT, TITLE, DESC, skills: active,
    atleti, storico, lastPeriod, NOMI, roster, overall, RANK, TEAM_AVG,
  };
}

// Legge atlete, focus e rilevamenti da Supabase e costruisce il modello.
export async function fetchModel() {
  const [skillsRes, athletesRes, assessmentsRes, selfRes] = await Promise.all([
    supabase.from("skills").select("*").order("sort_order", { ascending: true }),
    supabase.from("athletes").select("*").order("identifier", { ascending: true }),
    supabase.from("assessments").select("*").order("created_at", { ascending: true }),
    // Tabella facoltativa (Ondata 3): se non è ancora stata creata, l'errore
    // non blocca il resto della dashboard, l'autovalutazione resta assente.
    supabase.from("self_assessments").select("*").order("created_at", { ascending: true }),
  ]);
  const err = skillsRes.error || athletesRes.error || assessmentsRes.error;
  if (err) throw new Error(err.message);
  return buildModel(skillsRes.data || [], athletesRes.data || [], assessmentsRes.data || [], selfRes.data || []);
}
