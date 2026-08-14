// Punti partecipazione + streak check-in, nel profilo dell'atleta.
import { Flame, Trophy } from "lucide-react";
import { C, font, display } from "../theme";
import { useParticipation } from "../participation";

export default function ParticipationCard({ athleteId }) {
  const { level, streak, loading } = useParticipation(athleteId);
  if (!athleteId || loading || !level) return null;
  if ((level.total_points ?? 0) === 0 && streak === 0) return null;

  return (
    <div className="a360-reveal a360-noprint" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.grid}`, borderRadius: 12, padding: "10px 14px" }}>
        <Trophy size={16} color={C.orange} />
        <div>
          <div style={{ ...display, fontSize: 14, fontWeight: 700, color: C.ink }}>{level.total_points} punti</div>
          <div style={{ ...font, fontSize: 11.5, color: C.muted }}>Livello {level.level_label}</div>
        </div>
      </div>
      {streak >= 2 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#FFF3E6", border: "1px solid #FFC98A", borderRadius: 12, padding: "10px 14px" }}>
          <Flame size={16} color="#D2691E" />
          <div>
            <div style={{ ...display, fontSize: 14, fontWeight: 700, color: "#7A3E00" }}>{streak} giorni di fila</div>
            <div style={{ ...font, fontSize: 11.5, color: "#7A3E00" }}>Check-in energia consecutivi</div>
          </div>
        </div>
      )}
    </div>
  );
}
