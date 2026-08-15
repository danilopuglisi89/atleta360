// Storico delle stelle ricevute dal mister — riconoscimento manuale, mai
// automatico (vedi supabase/gamify-d.sql).
import { Star } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "./ui";
import { useStars } from "../stars";

const fmtDate = (iso) => new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });

export default function StarsCard({ athleteId, personal }) {
  const { stars } = useStars(athleteId);
  if (!athleteId || !stars || stars.length === 0) return null;

  return (
    <Card id="a360-stars" title={personal ? "Le tue stelle" : "Stelle ricevute"} subtitle="Riconoscimenti del mister" style={{ marginTop: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {stars.map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#FFF8E6", border: "1px solid #F5D77A", borderRadius: 12, padding: "10px 13px" }}>
            <Star size={17} color="#C9971C" fill="#F5D77A" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ ...font, fontSize: 13.5, color: "#7A5A00", lineHeight: 1.4 }}>{s.note}</div>
              <div style={{ ...font, fontSize: 11, color: "#9A7A20", marginTop: 3 }}>{fmtDate(s.created_at)}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
