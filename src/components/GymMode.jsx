// Modalità palestra: schermata unica per il bordocampo, mani occupate.
// Solo oggi, bottoni grandi: presenze + un appunto veloce per atleta.
// Nessun dato nuovo — riusa attendance e athlete_notes già esistenti.
import { useState } from "react";
import { X, CheckCircle2, XCircle, Send, StickyNote } from "lucide-react";
import { C, font, display } from "../theme";
import { useAthleteNotes } from "../athleteNotes";

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function GymMode({ athletes, rows, onSave, onClose }) {
  const [presence, setPresence] = useState(() => {
    const byAthlete = {};
    rows.filter((r) => r.session_date === todayIso()).forEach((r) => { byAthlete[r.athlete_id] = r.present; });
    const init = {};
    athletes.forEach((a) => { init[a.id] = byAthlete[a.id] ?? true; });
    return init;
  });
  const [saved, setSaved] = useState(false);
  const [noteAthlete, setNoteAthlete] = useState(athletes[0]?.id || "");
  const [noteText, setNoteText] = useState("");
  const notes = useAthleteNotes(noteAthlete);

  const toggle = (id) => { setPresence((p) => ({ ...p, [id]: !p[id] })); setSaved(false); };

  const savePresence = async () => {
    await onSave(todayIso(), presence);
    setSaved(true);
    navigator.vibrate?.(15);
    setTimeout(() => setSaved(false), 2500);
  };

  const sendNote = async () => {
    if (!noteText.trim()) return;
    await notes.addNote(noteText);
    setNoteText("");
    navigator.vibrate?.(15);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 210, background: C.surface, display: "flex", flexDirection: "column", padding: "calc(16px + env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom))" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ ...display, fontSize: 19, fontWeight: 700, color: C.ink }}>🏐 Modalità palestra</div>
        <button onClick={onClose} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: 12, border: `1px solid ${C.grid}`, background: C.card, color: C.muted, cursor: "pointer" }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ ...font, fontSize: 12.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Presenze di oggi</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {athletes.map((a) => {
            const present = presence[a.id] ?? true;
            return (
              <button key={a.id} onClick={() => toggle(a.id)}
                style={{ ...font, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 17, fontWeight: 600, padding: "16px 18px", borderRadius: 14, cursor: "pointer",
                  border: `2px solid ${present ? "#0F7A4E" : "#B4232A"}`, background: present ? "#DDF3E7" : "#FDECEC", color: present ? "#0F7A4E" : "#B4232A" }}>
                {a.identifier}
                {present ? <CheckCircle2 size={26} /> : <XCircle size={26} />}
              </button>
            );
          })}
        </div>
        <button onClick={savePresence}
          style={{ ...font, width: "100%", padding: "16px", borderRadius: 14, border: "none", background: C.orange, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 24 }}>
          {saved ? "✓ Salvato" : "Salva presenze"}
        </button>

        <div style={{ ...font, fontSize: 12.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <StickyNote size={14} /> Appunto veloce
        </div>
        <select value={noteAthlete} onChange={(e) => setNoteAthlete(e.target.value)}
          style={{ ...font, width: "100%", fontSize: 16, padding: "14px 14px", borderRadius: 12, border: `1px solid ${C.grid}`, background: C.card, color: C.ink, marginBottom: 10, boxSizing: "border-box" }}>
          {athletes.map((a) => <option key={a.id} value={a.id}>{a.identifier}</option>)}
        </select>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input value={noteText} onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendNote()}
            placeholder="Es. oggi ottima in ricezione…"
            style={{ ...font, flex: 1, fontSize: 16, padding: "14px 14px", borderRadius: 12, border: `1px solid ${C.grid}`, background: C.card, color: C.ink, boxSizing: "border-box" }} />
          <button onClick={sendNote} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 52, borderRadius: 12, border: "none", background: C.navy2, color: "#fff", cursor: "pointer" }}>
            <Send size={20} />
          </button>
        </div>
        {notes.notes.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {notes.notes.slice(0, 5).map((n) => (
              <div key={n.id} style={{ ...font, fontSize: 13.5, color: C.ink, background: C.card, border: `1px solid ${C.grid}`, borderRadius: 10, padding: "10px 12px" }}>
                {n.note}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
