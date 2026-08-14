// Pannello staff: assegna una stella a un'atleta con una micro-motivazione.
// Sempre una scelta manuale del mister, mai automatica.
import { useState } from "react";
import { Star, Send } from "lucide-react";
import { C, font, display } from "../theme";
import { Card, Select } from "./ui";
import { useStars } from "../stars";

export default function AwardStarCard({ athletes }) {
  const { award } = useStars(null);
  const [athleteId, setAthleteId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);
  const [err, setErr] = useState(null);

  const options = athletes.map((a) => a.identifier);
  const byName = Object.fromEntries(athletes.map((a) => [a.identifier, a.id]));

  const send = async () => {
    setBusy(true); setErr(null);
    const error = await award(byName[athleteId], note);
    setBusy(false);
    if (error) { setErr(error); return; }
    setNote(""); setAthleteId("");
    setFlash("Stella inviata!");
    setTimeout(() => setFlash(null), 3000);
  };

  return (
    <Card title="Dai una stella" subtitle="Un riconoscimento con due parole: arriva come notifica push" style={{ marginTop: 20 }} className="a360-noprint">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <Select value={athleteId} onChange={setAthleteId} options={["", ...options]} />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="es. Bellissimo atteggiamento in allenamento oggi!" maxLength={140}
          style={{ ...font, fontSize: 13.5, border: `1px solid ${C.grid}`, borderRadius: 9, padding: "9px 12px", flex: "1 1 220px" }} />
        <button onClick={send} disabled={busy || !athleteId || !note.trim()}
          style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, padding: "9px 15px", borderRadius: 9, border: "none",
            background: "#C9971C", color: "#fff", cursor: busy ? "default" : "pointer", opacity: (busy || !athleteId || !note.trim()) ? 0.6 : 1 }}>
          <Star size={15} /> <Send size={14} /> Invia
        </button>
      </div>
      {flash && <div style={{ ...font, fontSize: 12.5, color: "#0F7A4E", fontWeight: 600 }}>{flash}</div>}
      {err && <div style={{ ...font, fontSize: 12.5, color: "#B4232A" }}>{err}</div>}
    </Card>
  );
}
