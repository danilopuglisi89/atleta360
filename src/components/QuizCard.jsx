// Quiz settimanale sulla pallavolo + classifica della settimana.
import { useState } from "react";
import { HelpCircle, Trophy } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "./ui";
import { useWeeklyQuiz } from "../quiz";

export default function QuizCard({ uid }) {
  const { questions, mine, leaderboard, submit, loading, unavailable } = useWeeklyQuiz(uid);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [busy, setBusy] = useState(false);

  if (!uid || loading || unavailable) return null;

  const pick = async (optionIndex) => {
    const next = [...answers, optionIndex];
    setAnswers(next);
    if (step + 1 < questions.length) {
      setStep(step + 1);
      return;
    }
    const score = next.filter((a, i) => a === questions[i].correct).length;
    setBusy(true);
    await submit(score, questions.length);
    setBusy(false);
  };

  return (
    <Card title="Quiz della settimana" subtitle="5 domande sulla pallavolo, un tentativo a settimana" style={{ marginTop: 16 }} className="a360-noprint">
      {mine ? (
        <div style={{ ...font, fontSize: 13.5, color: C.ink, display: "flex", alignItems: "center", gap: 8 }}>
          <HelpCircle size={16} color={C.orange} /> Hai risposto <b>{mine.score}/{mine.total}</b> questa settimana — torna la prossima settimana per un nuovo quiz!
        </div>
      ) : busy ? (
        <div style={{ ...font, fontSize: 13.5, color: C.muted }}>Salvo il risultato…</div>
      ) : (
        <div>
          <div style={{ ...font, fontSize: 11.5, color: C.muted, marginBottom: 6 }}>Domanda {step + 1} di {questions.length}</div>
          <div style={{ ...display, fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 12 }}>{questions[step].q}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {questions[step].options.map((opt, i) => (
              <button key={i} onClick={() => pick(i)}
                style={{ ...font, textAlign: "left", fontSize: 13.5, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.grid}`, background: C.card, color: C.ink, cursor: "pointer" }}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {leaderboard.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.grid}`, marginTop: 16, paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, ...font, fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
            <Trophy size={13} /> Classifica di questa settimana
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {leaderboard.slice(0, 8).map((r, i) => (
              <div key={r.user_id} style={{ display: "flex", alignItems: "center", gap: 8, ...font, fontSize: 13 }}>
                <span style={{ width: 18, color: C.muted, fontWeight: 700 }}>{i + 1}.</span>
                <span style={{ flex: 1, color: C.ink }}>{r.first_name || "?"}{r.user_id === uid ? " (tu)" : ""}</span>
                <span style={{ color: C.muted }}>{r.score}/{r.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
