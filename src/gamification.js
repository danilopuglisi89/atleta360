// ============================================================
// Livelli e streak — calcolati dai dati già presenti (rilevamenti,
// storico), nessuna tabella nuova. Usati da ProfiloView e badges.js.
// ============================================================

export const LEVELS = [
  { min: 0, label: "Esordiente", emoji: "🌱" },
  { min: 5, label: "In Crescita", emoji: "🌿" },
  { min: 6.5, label: "Solida", emoji: "💪" },
  { min: 8, label: "Top Player", emoji: "🏆" },
];

export function levelFor(overallScore) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) if (overallScore >= l.min) lvl = l;
  return lvl;
}

function entryOverall(entry, keys) {
  const vals = keys.map((k) => entry[k]).filter((v) => typeof v === "number");
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

// Numero di rilevamenti consecutivi (dal più recente indietro) in cui la
// media è cresciuta rispetto al precedente.
export function growthStreak(hist, keys) {
  let streak = 0;
  for (let i = hist.length - 1; i > 0; i--) {
    if (entryOverall(hist[i], keys) > entryOverall(hist[i - 1], keys)) streak++;
    else break;
  }
  return streak;
}
