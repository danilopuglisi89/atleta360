// "Momento del giorno" stile BeReal: un'emoji + una nota facoltativa al
// giorno, visibile a tutta la squadra (tabella daily_moments, Ondata A).
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "./ui";
import { useDailyMoments } from "../participation";

const EMOJI = ["😄", "💪", "😅", "😴", "🔥", "😤", "🥳", "😌"];

export default function DailyMomentCard({ uid }) {
  const { feed, mine, save, unavailable } = useDailyMoments(uid);
  const [picked, setPicked] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!uid || feed === null || unavailable) return null;

  const submit = async (emoji) => {
    setBusy(true);
    await save(emoji, note);
    setBusy(false);
    setPicked(null);
    setNote("");
  };

  return (
    <Card title="Il momento del giorno" subtitle="Com'è andata oggi? Scegli l'emoji che ti rappresenta" style={{ marginTop: 16 }} className="a360-noprint">
      {mine ? (
        <div style={{ ...font, fontSize: 13.5, color: C.ink, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>{mine.emoji}</span> Registrato per oggi{mine.note ? `: “${mine.note}”` : ""} — puoi cambiarlo quando vuoi.
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {EMOJI.map((e) => (
            <button key={e} onClick={() => setPicked(e)} disabled={busy}
              style={{ fontSize: 22, padding: "8px 10px", borderRadius: 10, cursor: "pointer",
                border: `2px solid ${picked === e ? C.orange : C.grid}`, background: picked === e ? C.orangeSoft : C.card }}>
              {e}
            </button>
          ))}
        </div>
      )}

      {picked && !mine && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Una parola su oggi (facoltativo)" maxLength={80}
            style={{ ...font, fontSize: 13, border: `1px solid ${C.grid}`, borderRadius: 9, padding: "8px 11px", flex: "1 1 160px" }} />
          <button onClick={() => submit(picked)} disabled={busy}
            style={{ ...font, fontSize: 12.5, fontWeight: 600, padding: "8px 14px", borderRadius: 9, border: "none", background: C.orange, color: "#fff", cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
            {busy ? "Pubblico…" : "Pubblica"}
          </button>
        </div>
      )}

      {feed.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16, borderTop: `1px solid ${C.grid}`, paddingTop: 14 }}>
          {feed.map((m) => (
            <div key={m.user_id} title={m.note || ""} style={{ display: "flex", alignItems: "center", gap: 6, background: C.surface, borderRadius: 99, padding: "6px 12px" }}>
              <span style={{ fontSize: 17 }}>{m.emoji}</span>
              <span style={{ ...font, fontSize: 12.5, color: C.ink }}>{m.first_name || "?"}</span>
            </div>
          ))}
        </div>
      )}
      {feed.length === 0 && (
        <div style={{ ...font, fontSize: 12.5, color: C.muted, marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={13} /> Ancora nessuno oggi: sii la prima!
        </div>
      )}
    </Card>
  );
}
