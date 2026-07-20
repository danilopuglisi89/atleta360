// ============================================================
// Badge / obiettivi — riconoscimenti automatici calcolati dai dati
// già presenti (rilevamenti, storico, classifica). Nessun dato nuovo.
// computeBadges(model, name) -> array di badge conquistati dall'atleta.
// ============================================================
import { C } from "./theme";
import { growthStreak } from "./gamification";

// Media di un rilevamento sui focus presenti.
function entryOverall(entry, keys) {
  const vals = keys.map((k) => entry[k]).filter((v) => typeof v === "number");
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

export function computeBadges(model, name) {
  const { keys, SHORT, atleti, storico, NOMI, overall, RANK } = model;
  const me = atleti[name];
  if (!me) return [];
  const hist = storico[name] || [];
  const badges = [];

  // 1) Sul podio — tra le prime 3 della classifica generale.
  const rankPos = RANK.indexOf(name);
  if (rankPos === 0) {
    badges.push({ id: "regina", emoji: "👑", label: "Regina del campo", desc: "1ª nella classifica generale", color: "#E8A400" });
  } else if (rankPos === 1 || rankPos === 2) {
    badges.push({ id: "podio", emoji: "🏅", label: "Sul podio", desc: `${rankPos + 1}ª nella classifica generale`, color: C.orange });
  }

  // 2) Migliore della squadra in un focus (leader assoluta, punteggio unico più alto).
  keys.forEach((k) => {
    const vals = NOMI.map((n) => atleti[n]?.scores[k] ?? 0);
    const max = Math.max(...vals);
    const leaders = NOMI.filter((n) => (atleti[n]?.scores[k] ?? 0) === max);
    if (max > 0 && leaders.length === 1 && leaders[0] === name) {
      badges.push({ id: `top-${k}`, emoji: "⭐", label: `Regina di ${SHORT[k]}`, desc: `Miglior punteggio della squadra in ${SHORT[k]}`, color: C.navy2 });
    }
  });

  // 3) Più migliorata — crescita complessiva più alta dal primo all'ultimo rilevamento.
  const growth = NOMI.map((n) => {
    const h = storico[n] || [];
    if (h.length < 2) return null;
    return { n, g: entryOverall(h[h.length - 1], keys) - entryOverall(h[0], keys) };
  }).filter(Boolean).sort((a, b) => b.g - a.g);
  if (growth.length && growth[0].n === name && growth[0].g > 0) {
    badges.push({ id: "piu-migliorata", emoji: "🚀", label: "Più migliorata", desc: `+${growth[0].g.toFixed(1)} dal primo rilevamento`, color: "#0F7A4E" });
  }

  // 4) In crescita — ultimo rilevamento migliore del precedente.
  if (hist.length >= 2) {
    const last = entryOverall(hist[hist.length - 1], keys);
    const prev = entryOverall(hist[hist.length - 2], keys);
    if (last > prev) {
      badges.push({ id: "in-crescita", emoji: "📈", label: "In crescita", desc: `+${(last - prev).toFixed(1)} dall'ultimo rilevamento`, color: "#0F7A4E" });
    }
  }

  // 5) Serie di crescite consecutive (rilevamento dopo rilevamento).
  const streak = growthStreak(hist, keys);
  if (streak >= 5) {
    badges.push({ id: "streak5", emoji: "🔥🔥", label: "Serie leggendaria", desc: `${streak} rilevamenti di fila in crescita`, color: "#E11D74" });
  } else if (streak >= 3) {
    badges.push({ id: "streak3", emoji: "🔥", label: "In fiamme", desc: `${streak} rilevamenti di fila in crescita`, color: "#E11D74" });
  }

  // 6) Costanza — almeno 3 rilevamenti registrati.
  if (hist.length >= 3) {
    badges.push({ id: "costanza", emoji: "🎯", label: "Costanza", desc: `${hist.length} rilevamenti registrati`, color: C.navy2 });
  }

  // 7) Fuoriclasse — almeno un focus a punteggio pieno (10).
  if (keys.some((k) => (me.scores[k] ?? 0) >= 10)) {
    badges.push({ id: "top10", emoji: "💎", label: "Punteggio pieno", desc: "Un focus a 10/10", color: "#0EA5E9" });
  }

  // 8) Completa — tutti i focus almeno a 7.
  if (keys.length && keys.every((k) => (me.scores[k] ?? 0) >= 7)) {
    badges.push({ id: "completa", emoji: "🌟", label: "Atleta completa", desc: "Tutti i focus almeno a 7/10", color: C.orange });
  }

  return badges;
}
