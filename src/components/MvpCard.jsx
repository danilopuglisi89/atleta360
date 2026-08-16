// Le volte in cui il mister l'ha scelta come giocatore del match.
// Vedi supabase/mvp.sql; se lo script non c'è ancora, la card non compare.
import { Trophy } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "./ui";
import { useMvp } from "../mvp";

const fmtDate = (iso) => new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });

export default function MvpCard({ athleteId, athleteName, personal }) {
  const mvp = useMvp();
  if (!athleteId || mvp.unavailable || mvp.loading) return null;
  const mine = mvp.forAthlete(athleteId);
  if (!mine.length) return null;

  return (
    <Card id="a360-mvp" title={personal ? "Giocatore del match" : `Giocatore del match — ${athleteName}`}
      subtitle={`${mine.length} ${mine.length === 1 ? "volta" : "volte"} scelta dal mister dopo la partita`} style={{ marginTop: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {mine.map((m) => (
          <div key={m.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#FFF8E6", border: "1px solid #F5D77A", borderRadius: 12, padding: "10px 13px" }}>
            <Trophy size={17} color="#C9971C" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ minWidth: 0 }}>
              {m.note && <div style={{ ...font, fontSize: 13.5, color: C.ink, lineHeight: 1.5 }}>{m.note}</div>}
              <div style={{ ...font, fontSize: 11.5, color: C.muted, marginTop: m.note ? 3 : 0 }}>{fmtDate(m.created_at)}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
