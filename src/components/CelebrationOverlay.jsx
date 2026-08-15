// Celebrazione a tutto schermo per un traguardo nuovo (badge appena
// sbloccato). Chi la mostra tiene la logica di "cos'è nuovo" (localStorage);
// qui solo la festa + la condivisione del traguardo.
//
// È il momento con più probabilità di condivisione (entusiasmo appena
// sbloccato), quindi la card del traguardo si genera direttamente da qui:
// niente rimbalzo ad altre schermate.
import { useEffect } from "react";
import { PartyPopper, X } from "lucide-react";
import { C, font, display } from "../theme";
import { fireConfetti } from "../effects";
import { ShareButton } from "./ShareSheet";

export default function CelebrationOverlay({ badge, onClose, shareData }) {
  useEffect(() => {
    if (badge) fireConfetti({ count: 140, duration: 3000 });
  }, [badge?.id]);

  if (!badge) return null;

  return (
    <div className="a360-noprint" style={{ position: "fixed", inset: 0, zIndex: 95, background: "rgba(10,19,48,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="a360-reveal" style={{ background: C.card, borderRadius: 22, padding: 30, textAlign: "center", maxWidth: 360, position: "relative" }}>
        <button onClick={onClose} aria-label="Chiudi" style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: C.muted, cursor: "pointer" }}>
          <X size={20} />
        </button>
        <div style={{ fontSize: 54, lineHeight: 1 }}>{badge.emoji}</div>
        <div style={{ ...font, fontSize: 12, color: C.orange, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 10 }}>Nuovo traguardo!</div>
        <div style={{ ...display, fontSize: 20, fontWeight: 700, color: C.ink, marginTop: 4 }}>{badge.label}</div>
        <p style={{ ...font, fontSize: 13.5, color: C.muted, marginTop: 6 }}>{badge.desc}</p>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
          <ShareButton kind="badge" label="Condividi il traguardo" icon={PartyPopper}
            data={{ ...shareData, badge }}
            style={{ padding: "12px 22px", borderRadius: 12, fontSize: 14.5 }} />
        </div>
        <button onClick={onClose}
          style={{ ...font, marginTop: 10, background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer" }}>
          Più tardi
        </button>
      </div>
    </div>
  );
}
