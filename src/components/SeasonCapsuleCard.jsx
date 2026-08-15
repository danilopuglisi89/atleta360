// "La capsula di inizio stagione": un messaggio sigillato alla te di fine
// stagione. Costo minimo, magia vera — scelta esplicita nell'intervista.
import { useState } from "react";
import { Mail, Lock, PartyPopper } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "./ui";
import { useSeasonCapsule } from "../rituals";

const MONTHS_AHEAD = 9;
const defaultUnlock = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + MONTHS_AHEAD);
  return d.toISOString().slice(0, 10);
};
const fmtDate = (iso) => new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });

export default function SeasonCapsuleCard({ uid }) {
  const { capsule, isUnlocked, write, loading } = useSeasonCapsule(uid);
  const [message, setMessage] = useState("");
  const [writing, setWriting] = useState(false);

  if (!uid || loading) return null;

  const submit = async () => {
    if (!message.trim()) return;
    setWriting(true);
    await write(message, defaultUnlock());
    setWriting(false);
  };

  return (
    <Card title="La capsula di inizio stagione" subtitle="Un messaggio sigillato alla te di fine stagione" style={{ marginTop: 16 }} className="a360-noprint">
      {!capsule && !writing && (
        <>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={500}
            placeholder="Scrivi qualcosa alla te di tra qualche mese: un obiettivo, una paura, una promessa…"
            style={{ ...font, fontSize: 13.5, width: "100%", boxSizing: "border-box", border: `1px solid ${C.grid}`, borderRadius: 10, padding: "10px 12px", outline: "none", resize: "vertical" }} />
          <button onClick={submit} disabled={!message.trim()}
            style={{ ...font, display: "inline-flex", alignItems: "center", gap: 8, marginTop: 10, padding: "10px 16px", borderRadius: 10, border: "none",
              background: C.orange, color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: message.trim() ? "pointer" : "default", opacity: message.trim() ? 1 : 0.5 }}>
            <Mail size={16} /> Sigilla la capsula
          </button>
          <div style={{ ...font, fontSize: 11.5, color: C.muted, marginTop: 8 }}>Si apre il {fmtDate(defaultUnlock())} — nemmeno tu potrai rileggerla prima.</div>
        </>
      )}

      {capsule && !isUnlocked && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, ...font, fontSize: 13.5, color: C.muted }}>
          <Lock size={18} color={C.orange} /> Capsula sigillata — si apre il <b style={{ color: C.ink }}>{fmtDate(capsule.unlock_date)}</b>.
        </div>
      )}

      {capsule && isUnlocked && (
        <div style={{ background: "#FFF8E6", border: "1px solid #F5D77A", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, ...font, fontSize: 12, fontWeight: 700, color: "#7A5A00", marginBottom: 8 }}>
            <PartyPopper size={16} /> È il momento di leggerla!
          </div>
          <div style={{ ...font, fontSize: 14, color: "#5A4200", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{capsule.message}</div>
        </div>
      )}
    </Card>
  );
}
