// Missione del giorno: compare SOLO nei giorni con un allenamento/partita in
// programma, e SOLO se l'atleta non ha ancora fatto il check-in energia di
// oggi — nessuna tabella nuova, calcolata al volo da calendario + check-in.
import { useMemo } from "react";
import { Target } from "lucide-react";
import { C, font, display } from "../theme";
import { useCalendar } from "../calendar";
import { useCheckins } from "../wellbeing";

const KIND_LABEL = { match: "la partita", training: "l'allenamento", other: "l'impegno" };
const isToday = (iso) => {
  const d = new Date(iso), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};

export default function MissionCard({ uid, athleteId }) {
  const cal = useCalendar(uid);
  const { today: checkedIn } = useCheckins(athleteId);

  const todaysEvent = useMemo(() => {
    if (!cal.events) return null;
    return cal.events.find((e) => !e.cancelled && isToday(e.starts_at)) || null;
  }, [cal.events]);

  if (!athleteId || checkedIn || !todaysEvent) return null;

  return (
    <div className="a360-reveal a360-noprint" style={{ display: "flex", alignItems: "center", gap: 10, background: "linear-gradient(120deg, #FFF3E6 0%, #FFE9D5 100%)", border: "1px solid #FFC98A", borderRadius: 14, padding: "12px 16px", marginBottom: 16 }}>
      <Target size={20} color={C.orange} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...display, fontSize: 13.5, fontWeight: 700, color: "#7A3E00" }}>Missione di oggi</div>
        <div style={{ ...font, fontSize: 12.5, color: "#7A3E00", lineHeight: 1.4 }}>
          Fai il check-in energia prima di {KIND_LABEL[todaysEvent.kind] || "l'impegno"} di oggi (+5 punti).
        </div>
      </div>
      <button onClick={() => document.getElementById("a360-checkin")?.scrollIntoView({ behavior: "smooth", block: "center" })}
        style={{ ...font, fontSize: 12.5, fontWeight: 600, padding: "8px 13px", borderRadius: 9, border: "none", background: C.orange, color: "#fff", cursor: "pointer", flexShrink: 0 }}>
        Vai
      </button>
    </div>
  );
}
