// Feste stagionali: la Home si veste a festa in certe finestre dell'anno,
// e chi si allena/valuta in quella finestra sblocca un badge a tempo.
// Date per mese/giorno (senza anno): valgono ogni anno.
export const SEASONS = [
  { key: "halloween", label: "Halloween", emoji: "🎃", from: [10, 24], to: [11, 2],
    banner: "Atmosfera da paura in palestra 🎃 — chi si allena in questi giorni si porta a casa un badge speciale.",
    badge: { id: "s-halloween", emoji: "🎃", label: "Zucca da 10 e lode", desc: "Rilevamento fatto nella settimana di Halloween" } },
  { key: "natale", label: "Natale", emoji: "🎄", from: [12, 15], to: [12, 26],
    banner: "Buone feste da Atleta360! 🎄 Un regalo speciale per chi si fa valutare in questi giorni.",
    badge: { id: "s-natale", emoji: "🎄", label: "Palla sotto l'albero", desc: "Rilevamento fatto durante le feste di Natale" } },
  { key: "capodanno", label: "Nuovo anno", emoji: "🎆", from: [12, 27], to: [1, 6],
    banner: "Un nuovo anno di crescita comincia ora ✨",
    badge: { id: "s-capodanno", emoji: "🎆", label: "Prima dell'anno", desc: "Rilevamento fatto a cavallo del nuovo anno" } },
  { key: "finestagione", label: "Fine campionato", emoji: "🏆", from: [5, 20], to: [6, 10],
    banner: "Si chiude la stagione: che percorso! 🏆",
    badge: { id: "s-finestagione", emoji: "🏆", label: "Fino all'ultimo punto", desc: "Rilevamento fatto a fine campionato" } },
];

// Confronta (mese,giorno) di "d" con l'intervallo [from,to], gestendo anche
// le finestre che scavalcano l'anno (es. 27 dicembre → 6 gennaio).
function inWindow(d, [fm, fd], [tm, td]) {
  const md = d.getMonth() + 1, dd = d.getDate();
  const val = md * 100 + dd, from = fm * 100 + fd, to = tm * 100 + td;
  if (from <= to) return val >= from && val <= to;
  return val >= from || val <= to; // scavalca l'anno
}

export function activeSeason(date = new Date()) {
  return SEASONS.find((s) => inWindow(date, s.from, s.to)) || null;
}
