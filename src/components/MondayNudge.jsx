// "L'applausometro del lunedì": ogni lunedì, un piccolo spunto a mandare un
// applauso a chi ti ha aiutato durante la settimana — riusa il sistema di
// applausi già esistente, nessuna tabella nuova.
import { Heart } from "lucide-react";
import { C, font } from "../theme";

export default function MondayNudge({ onGoTeam }) {
  const isMonday = new Date().getDay() === 1;
  if (!isMonday) return null;

  return (
    <button onClick={onGoTeam} className="a360-noprint"
      style={{ ...font, display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", cursor: "pointer",
        background: "#FCE7F1", border: "1px solid #F3B8D3", borderRadius: 12, padding: "10px 14px", marginBottom: 16 }}>
      <Heart size={15} color="#E11D74" style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, color: "#8A1050" }}>
        Buon lunedì! C'è qualcuna che ti ha aiutata la settimana scorsa? Mandale un applauso 👉
      </span>
    </button>
  );
}
