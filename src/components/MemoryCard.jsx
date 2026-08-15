// "Un anno fa..." — la nostalgia come motore di ritorno nelle app che
// durano: riusa lo storico dei rilevamenti già caricato, nessuna query in
// più. Mostra il rilevamento più vicino a 6 o 12 mesi fa, se esiste.
import { Clock } from "lucide-react";
import { C, font, display } from "../theme";

const MILESTONES = [
  { days: 365, label: "un anno fa" },
  { days: 182, label: "6 mesi fa" },
];

function overallOf(entry, keys) {
  const vals = keys.map((k) => entry[k]).filter((v) => typeof v === "number");
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export default function MemoryCard({ history, keys, currentOverall }) {
  if (!history?.length) return null;
  const now = Date.now();

  let best = null;
  for (const m of MILESTONES) {
    const targetTime = now - m.days * 86400e3;
    // Entry più vicina al traguardo, ma non oltre ±45 giorni (altrimenti
    // "un anno fa" diventerebbe "3 mesi fa" per chi ha uno storico corto).
    let closest = null, closestDiff = Infinity;
    for (const e of history) {
      const t = new Date(e.ts || 0).getTime();
      if (!t) continue;
      const diff = Math.abs(t - targetTime);
      if (diff < closestDiff) { closestDiff = diff; closest = e; }
    }
    if (closest && closestDiff <= 45 * 86400e3) { best = { ...closest, label: m.label }; break; }
  }
  if (!best) return null;

  const past = overallOf(best, keys);
  if (past === null || currentOverall === null || currentOverall === undefined) return null;
  const diff = Math.round((currentOverall - past) * 10) / 10;

  return (
    <div className="a360-reveal a360-noprint" style={{ display: "flex", alignItems: "center", gap: 10, background: C.surface, border: `1px solid ${C.grid}`, borderRadius: 14, padding: "12px 16px", marginBottom: 16 }}>
      <Clock size={18} color={C.navy2} style={{ flexShrink: 0 }} />
      <div style={{ ...font, fontSize: 13, color: C.ink, lineHeight: 1.4 }}>
        <b>{best.label}</b> eri a {past.toFixed(1)}
        {diff > 0 && <span style={{ color: "#0F7A4E", fontWeight: 700 }}> — oggi sei a +{diff}! 🚀</span>}
        {diff <= 0 && <span> — oggi sei a {currentOverall.toFixed(1)}.</span>}
      </div>
    </div>
  );
}
