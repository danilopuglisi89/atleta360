// "La tua settimana": mini recap stile Wrapped calcolato dai punti
// partecipazione degli ultimi 7 giorni — nessuna tabella nuova.
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "./ui";
import { supabase } from "../supabaseClient";
import { ShareButton } from "./ShareSheet";
import { useParticipation } from "../participation";

const ACTION_LABEL = {
  checkin: "check-in energia",
  rsvp: "conferme presenza",
  self_assessment: "autovalutazioni",
  applause_given: "applausi dati",
  daily_moment: "momenti del giorno",
  quiz: "risposte al quiz",
};

export default function WeeklyRecapCard({ uid, athleteId, name, avatarUrl, bgUrl, bgStyle }) {
  const [rows, setRows] = useState(null);   // null = caricamento, [] = niente questa settimana
  // Hook prima di ogni return condizionale (Rules of Hooks).
  const { streak, level } = useParticipation(athleteId);

  useEffect(() => {
    if (!uid) return;
    const since = new Date(Date.now() - 7 * 86400e3).toISOString();
    supabase.from("participation_points").select("action,points").eq("user_id", uid).gte("created_at", since)
      .then(({ data }) => setRows(data || []));
  }, [uid]);

  if (!uid || rows === null || rows.length === 0) return null;

  const total = rows.reduce((a, r) => a + r.points, 0);
  const byAction = {};
  rows.forEach((r) => { byAction[r.action] = (byAction[r.action] || 0) + 1; });
  const top = Object.entries(byAction).sort((a, b) => b[1] - a[1])[0];
  // Per la card condivisibile servono le etichette in chiaro, non i codici.
  const byLabel = Object.fromEntries(
    Object.entries(byAction).map(([a, n]) => [ACTION_LABEL[a] || a, n])
  );

  return (
    <Card title="La tua settimana" subtitle="Ultimi 7 giorni sull'app" style={{ marginTop: 16 }} className="a360-noprint">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Sparkles size={20} color={C.orange} />
        <div style={{ ...display, fontSize: 22, fontWeight: 700, color: C.ink }}>+{total} punti questa settimana</div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {Object.entries(byAction).map(([action, count]) => (
          <span key={action} style={{ ...font, fontSize: 12.5, color: C.ink, background: C.surface, border: `1px solid ${C.grid}`, borderRadius: 99, padding: "6px 12px" }}>
            {count}× {ACTION_LABEL[action] || action}
          </span>
        ))}
      </div>
      {top && (
        <div style={{ ...font, fontSize: 12.5, color: C.muted, marginTop: 12 }}>
          La tua attività più frequente: <b style={{ color: C.ink }}>{ACTION_LABEL[top[0]] || top[0]}</b>. Continua così! 💪
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        <ShareButton kind="recap" label="Condividi la settimana"
          data={{ name, avatarUrl, total, byAction: byLabel, streak, level, bgUrl, bgStyle }} />
      </div>
    </Card>
  );
}
