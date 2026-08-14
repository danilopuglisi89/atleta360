// Avviso una tantum per chi ha GIÀ l'app installata su iPhone: icona e nome
// nuovi (rebrand 2026-08-14) su iOS si prendono solo rimuovendo e
// ri-aggiungendo l'app alla Home. Su Android si aggiornano da soli, quindi
// il banner è solo iOS. Scade da solo (CUTOFF) così le nuove installazioni
// non lo vedranno mai.
import { useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { C, font, display } from "../theme";

const DISMISS_KEY = "a360-rebrand-2026-08";
const CUTOFF = new Date("2026-09-15");

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

export default function RebrandNotice() {
  const show = isIos() && isStandalone() && new Date() < CUTOFF && !localStorage.getItem(DISMISS_KEY);
  const [open, setOpen] = useState(show);
  if (!open) return null;

  const dismiss = () => { localStorage.setItem(DISMISS_KEY, "1"); setOpen(false); };

  return (
    <div className="a360-noprint" style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 75, padding: "0 12px calc(14px + env(safe-area-inset-bottom))" }}>
      <div className="a360-reveal" style={{ maxWidth: 480, margin: "0 auto", background: C.card, borderRadius: 18, border: `1px solid ${C.grid}`, boxShadow: "0 18px 50px rgba(10,22,80,0.28)", padding: 18, position: "relative" }}>
        <button onClick={dismiss} aria-label="Chiudi" style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 6 }}>
          <X size={18} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: C.orangeSoft, color: C.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <RefreshCw size={18} />
          </div>
          <div style={{ ...display, fontSize: 15.5, fontWeight: 700, color: C.ink, paddingRight: 20 }}>Icona e nome nuovi! ✨</div>
        </div>
        <p style={{ ...font, fontSize: 13, color: C.muted, lineHeight: 1.55, margin: "10px 0 0" }}>
          Abbiamo rinnovato l'app. Su iPhone, per vedere la nuova icona serve reinstallarla (1 minuto,
          <b style={{ color: C.ink }}> nessun dato si perde</b> — è tutto nel cloud):
        </p>
        <ol style={{ ...font, fontSize: 13, color: C.ink, lineHeight: 1.7, margin: "8px 0 0", paddingLeft: 20 }}>
          <li>Tieni premuta l'icona dell'app → <b>Rimuovi app</b></li>
          <li>Apri il sito in Safari → <b>Condividi → Aggiungi a Home</b></li>
          <li>Riapri dall'icona nuova e <b>riattiva le notifiche</b> quando te lo chiede</li>
        </ol>
        <button onClick={dismiss}
          style={{ ...font, marginTop: 12, padding: "10px 16px", borderRadius: 10, border: "none", background: C.orange, color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
          Ok, ho capito
        </button>
      </div>
    </div>
  );
}
