// "Come ti sei sentita in partita?": il gemello del check-in energia
// pre-allenamento, ma dopo la gara. Appare solo il giorno di una partita
// già iniziata, e solo finché non è stato compilato.
import { useMemo, useState } from "react";
import { HeartHandshake } from "lucide-react";
import { C, font } from "../theme";
import { useCalendar } from "../calendar";
import { useCheckins } from "../wellbeing";

const FEELINGS = ["😞", "😕", "😐", "😊", "🤩"];

export default function PostMatchCheckinCard({ uid, athleteId }) {
  const cal = useCalendar(uid);
  const { today, setEnergy } = useCheckins(athleteId, "post");
  const [err, setErr] = useState(null);

  const todaysMatch = useMemo(() => {
    if (!cal.events) return null;
    const now = new Date();
    return cal.events.find((e) => e.kind === "match" && !e.cancelled
      && new Date(e.starts_at) <= now
      && new Date(e.starts_at).toDateString() === now.toDateString()) || null;
  }, [cal.events]);

  if (!athleteId || !todaysMatch || today) return null;

  const onPick = async (n) => {
    setErr(null);
    navigator.vibrate?.(12);
    const error = await setEnergy(n);
    if (error) setErr(error);
  };

  return (
    <div className="a360-reveal a360-noprint" style={{ background: C.card, border: `1px solid ${C.grid}`, borderRadius: 16, padding: 18, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, ...font, fontSize: 12, color: C.orange, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
        <HeartHandshake size={14} /> Come ti sei sentita in partita?
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        {FEELINGS.map((e, i) => (
          <button key={i} onClick={() => onPick(i + 1)}
            style={{ flex: 1, padding: "10px 0", borderRadius: 10, cursor: "pointer", fontSize: 20, border: `2px solid ${C.grid}`, background: C.card }}>
            {e}
          </button>
        ))}
      </div>
      {err && <div style={{ ...font, fontSize: 12, color: "#B4232A", marginTop: 6 }}>{err}</div>}
    </div>
  );
}
