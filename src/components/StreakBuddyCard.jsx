// Streak di coppia stile Duolingo: scegli una compagna, se vi confermate a
// vicenda la fiamma cresce solo quando fate ENTRAMBE il check-in lo stesso
// giorno. Non è mia, è nostra — non la lasci morire.
import { useState } from "react";
import { Flame, Users, Check } from "lucide-react";
import { C, font, display } from "../theme";
import { Card, Select } from "./ui";
import { useStreakBuddy } from "../streakBuddy";

export default function StreakBuddyCard({ myAthleteId, roster }) {
  const { buddy, pick, loading, unavailable } = useStreakBuddy(myAthleteId);
  const [choice, setChoice] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  // `unavailable` = wow-2.sql non ancora eseguito: meglio non mostrare nulla
  // che un form che poi non salva.
  if (!myAthleteId || loading || unavailable) return null;

  const options = (roster || []).filter((r) => r.id !== myAthleteId).map((r) => r.identifier);
  const byName = Object.fromEntries((roster || []).map((r) => [r.identifier, r.id]));

  const confirm = async () => {
    if (!choice) return;
    setBusy(true); setErr(null);
    const error = await pick(byName[choice]);
    setBusy(false);
    if (error) setErr(error);
  };

  return (
    <Card title="Streak di coppia" subtitle="Scegli una compagna: se fate il check-in lo stesso giorno, la fiamma è vostra" style={{ marginTop: 16 }} className="a360-noprint">
      {!buddy && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Select value={choice} onChange={setChoice} options={["", ...options]} />
          <button onClick={confirm} disabled={!choice || busy}
            style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, padding: "9px 15px", borderRadius: 9, border: "none",
              background: C.orange, color: "#fff", cursor: choice ? "pointer" : "default", opacity: choice ? 1 : 0.5 }}>
            <Users size={15} /> Proponi
          </button>
        </div>
      )}

      {err && <div style={{ ...font, fontSize: 12.5, color: "#B4232A", marginTop: 8 }}>Non salvato: {err}</div>}

      {buddy && !buddy.confirmed && (
        <div style={{ ...font, fontSize: 13.5, color: C.muted, display: "flex", alignItems: "center", gap: 8 }}>
          <Users size={16} color={C.navy2} /> Hai proposto <b style={{ color: C.ink }}>{buddy.buddy_name}</b> — aspetta che vi scelga anche lei per far partire la streak.
        </div>
      )}

      {buddy && buddy.confirmed && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#FFF3E6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Flame size={24} color="#D2691E" />
          </div>
          <div>
            <div style={{ ...display, fontSize: 20, fontWeight: 700, color: C.ink }}>{buddy.couple_streak} giorni</div>
            <div style={{ ...font, fontSize: 12.5, color: C.muted, display: "flex", alignItems: "center", gap: 5 }}>
              <Check size={12} color="#0F7A4E" /> con {buddy.buddy_name} — check-in lo stesso giorno
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
