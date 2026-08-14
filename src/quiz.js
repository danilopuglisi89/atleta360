// Quiz settimanale sulla pallavolo (Ondata B gamification, vedi
// supabase/gamify-b.sql): 5 domande, un tentativo a settimana, +2 punti
// partecipazione per risposta esatta. Le domande ruotano ogni settimana
// in modo deterministico, stesso trucco di trivia.js/phrases.js.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const WEEKLY_SETS = [
  [
    { q: "Quanti giocatori per squadra sono in campo contemporaneamente?", options: ["5", "6", "7", "4"], correct: 1 },
    { q: "Quanti tocchi ha una squadra per rimandare la palla oltre la rete?", options: ["2", "3", "4", "Illimitati"], correct: 1 },
    { q: "Come si chiama il giocatore specializzato solo in difesa, che non può attaccare da sopra il nastro?", options: ["Libero", "Centrale", "Opposto", "Palleggiatore"], correct: 0 },
    { q: "Quanti set servono di solito per vincere una partita?", options: ["2 su 3", "3 su 5", "1 su 1", "4 su 7"], correct: 1 },
    { q: "A quanti punti si vince un set (con 2 di scarto), tranne il tie-break?", options: ["21", "25", "15", "30"], correct: 1 },
  ],
  [
    { q: "Cosa succede se la palla tocca la linea durante il gioco?", options: ["È fuori", "È dentro", "Si rigioca il punto", "Dipende dall'arbitro"], correct: 1 },
    { q: "Come si chiama l'azione di bloccare l'attacco avversario a rete?", options: ["Bagher", "Palleggio", "Muro", "Schiacciata"], correct: 2 },
    { q: "In quale posizione si trova chi serve, rispetto alle altre?", options: ["Zona 1 (dietro a destra)", "Zona 4 (avanti a sinistra)", "Zona 3 (centro rete)", "Non ha una zona fissa"], correct: 0 },
    { q: "Quanti punti di scarto servono nel set decisivo (tie-break) a 15?", options: ["1", "2", "3", "Nessuno"], correct: 1 },
    { q: "Come si chiama l'errore di chi non è nella posizione corretta al momento del servizio?", options: ["Fallo di rotazione", "Fallo di posizione", "Fallo di piede", "Invasione"], correct: 1 },
  ],
  [
    { q: "Qual è il gesto tecnico usato di solito per ricevere una battuta forte?", options: ["Palleggio", "Bagher", "Muro", "Schiacciata"], correct: 1 },
    { q: "Quanti giocatori al massimo può avere una squadra in una gara (in panchina inclusa)?", options: ["6", "9", "12", "15"], correct: 2 },
    { q: "Cosa fa il palleggiatore, di solito?", options: ["Attacca sempre", "Distribuisce il gioco alle attaccanti", "Serve solo in difesa", "Blocca a muro"], correct: 1 },
    { q: "Come si chiama l'attacco fatto da dietro la linea dei 3 metri?", options: ["Attacco di seconda linea", "Schiacciata centrale", "Pallonetto", "Muro offensivo"], correct: 0 },
    { q: "Quante sostituzioni può fare al massimo una squadra in un set?", options: ["3", "6", "12 (illimitate coi liberi)", "Nessun limite"], correct: 1 },
  ],
  [
    { q: "Che cos'è un \"ace\"?", options: ["Un attacco vincente", "Un servizio che porta punto diretto", "Un muro vincente", "Una ricezione perfetta"], correct: 1 },
    { q: "Quale colore di maglia indossa di solito il libero?", options: ["Uguale alle compagne", "Diverso dalle compagne", "Sempre bianco", "Non ha una regola"], correct: 1 },
    { q: "Cosa succede in caso di \"tocco a rete\" durante il gioco?", options: ["Fallo, punto all'avversario", "Si rigioca", "Nulla, è permesso", "Ammonizione"], correct: 0 },
    { q: "Quanti time-out per squadra si possono chiedere in un set (oltre ai tecnici)?", options: ["1", "2", "3", "Nessuno"], correct: 1 },
    { q: "Come si chiama la linea che divide il campo a metà, sotto la rete?", options: ["Linea di fondo", "Linea centrale", "Linea dei 3 metri", "Linea laterale"], correct: 1 },
  ],
];

function weekIndex(date = new Date()) {
  const dayIndex = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return Math.floor(dayIndex / 7);
}
export function currentWeekKey(date = new Date()) {
  return `w${weekIndex(date)}`;
}
export function questionsOfTheWeek(date = new Date()) {
  const i = weekIndex(date);
  return WEEKLY_SETS[((i % WEEKLY_SETS.length) + WEEKLY_SETS.length) % WEEKLY_SETS.length];
}

export function useWeeklyQuiz(uid) {
  const weekKey = currentWeekKey();
  const [mine, setMine] = useState(undefined);   // undefined = caricamento, null = non ancora fatto
  const [leaderboard, setLeaderboard] = useState([]);
  const [unavailable, setUnavailable] = useState(false);   // tabella non ancora creata

  const load = useCallback(async () => {
    const [mineRes, boardRes] = await Promise.all([
      uid ? supabase.from("quiz_scores").select("*").eq("user_id", uid).eq("week_key", weekKey).maybeSingle() : Promise.resolve({ data: null, error: null }),
      supabase.rpc("weekly_quiz_leaderboard", { p_week_key: weekKey }),
    ]);
    setUnavailable(!!mineRes.error || !!boardRes.error);
    setMine(mineRes.data || null);
    setLeaderboard(boardRes.data || []);
  }, [uid, weekKey]);

  useEffect(() => { load(); }, [load]);

  const submit = async (score, total) => {
    if (!uid) return "Utente non riconosciuto.";
    const { error } = await supabase.from("quiz_scores").insert({ user_id: uid, week_key: weekKey, score, total });
    if (error) return error.message;
    await load();
    return null;
  };

  return { weekKey, questions: questionsOfTheWeek(), mine, leaderboard, submit, loading: mine === undefined, unavailable };
}
