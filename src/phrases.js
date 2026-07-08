// ============================================================
// Frase motivazionale del giorno — mindset sportivo, originali.
// Ruota ogni giorno in modo deterministico (stessa frase per tutte
// nello stesso giorno), senza bisogno di backend.
// ============================================================
export const PHRASES = [
  "Il talento porta al campo, il carattere ti fa restare.",
  "Non devi essere perfetta: devi essere presente, punto dopo punto.",
  "L'errore di ieri è l'allenamento di oggi.",
  "La squadra è forte quanto la sua voce più incoraggiante.",
  "Concentrati su ciò che puoi controllare: il prossimo pallone.",
  "Le grandi giocatrici non nascono pronte, si costruiscono a ogni ripetizione.",
  "Respira, resetta, riparti. Un punto alla volta.",
  "La costanza batte l'entusiasmo dei giorni buoni.",
  "Chi comunica in campo, vince fuori.",
  "Il coraggio è servire ancora dopo un errore.",
  "Alza lo sguardo: la tua compagna ha bisogno della tua energia.",
  "La fatica di oggi è la sicurezza di domani.",
  "Non contare i palloni sbagliati, conta quelli che rialzano la squadra.",
  "La disciplina è scegliere ciò che vuoi di più rispetto a ciò che vuoi adesso.",
  "Ogni campionessa è stata prima una che non si è arresa.",
  "Il tuo linguaggio del corpo parla prima di te: tienilo forte.",
  "Vinci la testa e le gambe ti seguiranno.",
  "Piccoli miglioramenti ogni giorno fanno campionesse ogni anno.",
  "In campo non esistono errori, solo informazioni per il prossimo punto.",
  "La pressione è un privilegio: significa che conti.",
  "Sii la compagna che avresti voluto avere accanto.",
  "Allenati come giochi, gioca come ti alleni.",
  "La differenza tra provarci e riuscirci è non fermarsi.",
  "Le vittorie si costruiscono nei momenti in cui nessuno guarda.",
  "Testa alta anche sotto di due set: si gioca sempre punto a punto.",
  "Il focus è un muscolo: allenalo a ogni scambio.",
  "Non aspettare la motivazione, crea l'abitudine.",
  "La tua energia è contagiosa: scegli bene cosa trasmettere.",
  "Cadere fa parte del gioco, rialzarsi fa parte di te.",
  "Oggi dai un uno percento in più: domani si vede.",
];

// Indice del giorno: numero di giorni dall'epoca, stabile per tutta la giornata.
export function phraseOfTheDay(date = new Date()) {
  const dayIndex = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000
  );
  return PHRASES[((dayIndex % PHRASES.length) + PHRASES.length) % PHRASES.length];
}
