// ============================================================
// Curiosità del giorno sulla pallavolo — pillola informativa/divertente,
// ruota ogni giorno in modo deterministico come phraseOfTheDay(). Nessun
// backend: stesso trucco "giorni dall'epoca % lunghezza array".
// ============================================================
export const TRIVIA = [
  "Il muro è l'unico fondamentale che non conta come tocco di squadra: puoi rimurare e poi toccare di nuovo.",
  "La pallavolo è nata nel 1895 negli USA, inventata da William G. Morgan come alternativa meno faticosa della pallacanestro.",
  "Il rally point system (un punto per ogni scambio, anche in ricezione) è arrivato solo nel 1999: prima si segnava solo al servizio.",
  "Il libero non può mai attaccare la palla se è più alta del nastro della rete, nemmeno in salto da dietro la linea dei 3 metri.",
  "In un set, la squadra che serve per prima cambia ogni set: si alterna in base a chi ha vinto il precedente.",
  "Il record mondiale di rally più lungo in una partita ufficiale ha superato i 2 minuti consecutivi di scambio.",
  "La rotazione in senso orario è obbligatoria: sbagliare posizione al servizio è un errore arbitrale reale, il \"fallo di posizione\".",
  "Il bagher nasce come gesto d'emergenza: fino agli anni '50 si giocava quasi tutto palleggiando, anche in ricezione.",
  "Un attacco può toccare le antenne? No: se la palla tocca l'antenna o esce dallo spazio tra le due, è fuori.",
  "Il timeout tecnico automatico (a 8 e 16 punti) è stato eliminato nel 2016: ora ci sono solo i timeout chiesti dagli allenatori.",
  "La pallavolo femminile è stata introdotta alle Olimpiadi nel 1964, insieme a quella maschile, a Tokyo.",
  "Il palleggio alto perfetto tocca la palla per meno di 0,1 secondi: sembra un tocco netto ma è già al limite del regolamento.",
  "Uno schiacciatore professionista può saltare oltre 80 cm da fermo: l'elevazione conta più della rincorsa nei primi centimetri.",
  "Il termine \"pipe\" indica l'attacco da seconda linea dal centro: è uno dei colpi più difficili da murare per gli avversari.",
  "In Italia la pallavolo è lo sport di squadra femminile più seguito allo stadio dopo il calcio maschile.",
];

export function triviaOfTheDay(date = new Date()) {
  const dayIndex = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000
  );
  return TRIVIA[((dayIndex % TRIVIA.length) + TRIVIA.length) % TRIVIA.length];
}
