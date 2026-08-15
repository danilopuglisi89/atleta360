// Pillola del giorno: ruota ogni giorno tra una curiosità sulla pallavolo
// e un promemoria del quiz settimanale — con un puntino arancio finché non
// la si è aperta almeno una volta oggi. Serve un motivo diverso ogni volta
// per riaprire l'app: "sempre uguale" è il primo motivo di abbandono.
import { useState } from "react";
import { Lightbulb, HelpCircle } from "lucide-react";
import { C, font } from "../theme";
import { triviaOfTheDay } from "../trivia";

const SEEN_PREFIX = "a360-pill-seen-";
const todayKey = () => SEEN_PREFIX + new Date().toISOString().slice(0, 10);

export default function DailyPill({ quizDone, onOpenQuiz }) {
  const [seen, setSeen] = useState(() => !!localStorage.getItem(todayKey()));
  // Alterna in base al giorno: quiz non fatto -> promemoria quiz, altrimenti curiosità.
  const showQuizNudge = quizDone === null;

  const open = () => {
    if (showQuizNudge && onOpenQuiz) { onOpenQuiz(); }
    if (!seen) { localStorage.setItem(todayKey(), "1"); setSeen(true); }
  };

  return (
    <button onClick={open} className="a360-noprint"
      style={{ ...font, display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", cursor: "pointer",
        background: C.surface, border: `1px solid ${seen ? C.grid : C.orange}`, borderRadius: 99, padding: "8px 14px", marginBottom: 16 }}>
      {showQuizNudge ? <HelpCircle size={15} color={C.orange} style={{ flexShrink: 0 }} /> : <Lightbulb size={15} color={C.orange} style={{ flexShrink: 0 }} />}
      <span style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.4, flex: 1 }}>
        {showQuizNudge ? "Non hai ancora fatto il quiz di questa settimana — 5 domande, un minuto." : triviaOfTheDay()}
      </span>
      {!seen && <span style={{ width: 8, height: 8, borderRadius: 99, background: C.orange, flexShrink: 0 }} />}
    </button>
  );
}
