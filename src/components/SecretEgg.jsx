// Easter egg nascosto: 5 tocchi rapidi sul logo rivelano un piccolo
// segreto. Nessun tutorial, nessun indizio in giro — lo scopre chi
// esplora, e se lo racconta alle compagne.
import { useRef, useState } from "react";
import { X } from "lucide-react";
import { C, font, display } from "../theme";
import { fireConfetti } from "../effects";
import Mascot from "./Mascot";

const SECRETS = [
  "Hai trovato il segreto! 🎉 Il pallone ti fa un applauso.",
  "Shh... questo resta tra noi due. 🤫",
  "Livello \"esploratrice\" sbloccato — non ufficiale, ma vale lo stesso.",
  "Continua così, in campo e fuori. 💪",
  "Lo sapevi che ogni scambio inizia da un buon servizio? Anche le giornate.",
];

function secretOfTheDay() {
  const dayIndex = Math.floor(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) / 86400000);
  return SECRETS[((dayIndex % SECRETS.length) + SECRETS.length) % SECRETS.length];
}

export default function SecretEgg({ children }) {
  const [open, setOpen] = useState(false);
  const countRef = useRef(0);
  const timerRef = useRef(null);

  const onTap = () => {
    countRef.current += 1;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { countRef.current = 0; }, 2500);
    if (countRef.current >= 5) {
      countRef.current = 0;
      setOpen(true);
      fireConfetti({ count: 90, duration: 2200 });
      navigator.vibrate?.([15, 30, 15, 30, 60]);
    }
  };

  return (
    <>
      <div onClick={onTap}>{children}</div>
      {open && (
        <div onClick={() => setOpen(false)} className="a360-noprint"
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(6,10,30,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="a360-reveal" onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: 20, padding: 26, maxWidth: 300, textAlign: "center", position: "relative" }}>
            <button onClick={() => setOpen(false)} aria-label="Chiudi" style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: C.muted, cursor: "pointer" }}>
              <X size={18} />
            </button>
            <Mascot size={56} style={{ margin: "0 auto 10px", display: "block" }} />
            <div style={{ ...display, fontSize: 12, fontWeight: 700, color: C.orange, textTransform: "uppercase", letterSpacing: 0.5 }}>Segreto trovato!</div>
            <div style={{ ...font, fontSize: 14, color: C.ink, marginTop: 8, lineHeight: 1.5 }}>{secretOfTheDay()}</div>
          </div>
        </div>
      )}
    </>
  );
}
