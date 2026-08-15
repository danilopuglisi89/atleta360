// Easter egg nascosto: ai traguardi di streak (7/30/100 giorni) una piccola
// festa a sorpresa, una volta sola per traguardo (nessun indizio prima).
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { C, font, display } from "../theme";
import { fireConfetti } from "../effects";
import Mascot from "./Mascot";

const MILESTONES = { 7: "Una settimana intera di fila!", 30: "Un mese di fila!! Roba seria.", 100: "100 giorni di fila?! Sei leggendaria." };

export default function StreakMilestone({ streak }) {
  const [show, setShow] = useState(null);

  useEffect(() => {
    if (!MILESTONES[streak]) return;
    const key = `a360-streak-milestone-${streak}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    setShow(streak);
    fireConfetti({ count: 120, duration: 2600 });
    navigator.vibrate?.([20, 40, 20, 40, 80]);
  }, [streak]);

  if (!show) return null;
  return (
    <div onClick={() => setShow(null)} className="a360-noprint"
      style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(6,10,30,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="a360-reveal" onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: 20, padding: 28, maxWidth: 320, textAlign: "center", position: "relative" }}>
        <button onClick={() => setShow(null)} aria-label="Chiudi" style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: C.muted, cursor: "pointer" }}>
          <X size={18} />
        </button>
        <Mascot size={60} style={{ margin: "0 auto 12px", display: "block" }} />
        <div style={{ fontSize: 40 }}>🔥</div>
        <div style={{ ...display, fontSize: 18, fontWeight: 700, color: C.ink, marginTop: 6 }}>{show} giorni di fila!</div>
        <div style={{ ...font, fontSize: 13.5, color: C.muted, marginTop: 4 }}>{MILESTONES[show]}</div>
      </div>
    </div>
  );
}
