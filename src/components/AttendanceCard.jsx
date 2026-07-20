import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle, Save } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "./ui";

const todayIso = () => new Date().toISOString().slice(0, 10);

// Registro presenze: check-in rapido per allenamento + percentuale di
// presenza per atleta su tutte le sessioni registrate (tabella attendance,
// vedi supabase/attendance.sql). Solo strumento di lavoro: non va in stampa.
export default function AttendanceCard({ athletes, rows, onSave }) {
  const [date, setDate] = useState(todayIso);
  const [presence, setPresence] = useState({});
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);

  // Precompila dai dati già salvati per quella data; altrimenti tutte presenti
  // di default (il mister toglie le assenti, più veloce che spuntarle tutte).
  useEffect(() => {
    const byAthlete = {};
    rows.filter((r) => r.session_date === date).forEach((r) => { byAthlete[r.athlete_id] = r.present; });
    const init = {};
    athletes.forEach((a) => { init[a.id] = byAthlete[a.id] ?? true; });
    setPresence(init);
  }, [date, rows, athletes]);

  const toggle = (id) => setPresence((p) => ({ ...p, [id]: !p[id] }));

  const save = async () => {
    setBusy(true); setFlash(null);
    const err = await onSave(date, presence);
    setBusy(false);
    if (!err) { setFlash("Presenze salvate."); setTimeout(() => setFlash(null), 3000); }
  };

  const sessionsCount = useMemo(() => new Set(rows.map((r) => r.session_date)).size, [rows]);

  const summary = useMemo(() => athletes.map((a) => {
    const mine = rows.filter((r) => r.athlete_id === a.id);
    const present = mine.filter((r) => r.present).length;
    return { id: a.id, identifier: a.identifier, total: mine.length, pct: mine.length ? Math.round((present / mine.length) * 100) : null };
  }).filter((s) => s.total > 0).sort((a, b) => a.pct - b.pct), [rows, athletes]);

  return (
    <Card title="Registro presenze" subtitle="Check-in rapido per allenamento" style={{ marginTop: 20 }} className="a360-noprint">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          style={{ ...font, fontSize: 13.5, color: C.ink, background: "#fff", border: `1px solid ${C.grid}`, borderRadius: 9, padding: "8px 10px" }} />
        <button onClick={save} disabled={busy}
          style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 9, border: "none",
            background: C.orange, color: "#fff", fontSize: 13, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
          <Save size={15} /> {busy ? "Salvo…" : "Salva presenze"}
        </button>
        {flash && <span style={{ ...font, fontSize: 12.5, color: "#0F7A4E", fontWeight: 600 }}>{flash}</span>}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: summary.length ? 20 : 0 }}>
        {athletes.map((a) => {
          const present = presence[a.id] ?? true;
          return (
            <button key={a.id} onClick={() => toggle(a.id)}
              style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, padding: "8px 12px", borderRadius: 99, cursor: "pointer",
                border: `1.5px solid ${present ? "#0F7A4E" : "#B4232A"}`, background: present ? "#DDF3E7" : "#FDECEC", color: present ? "#0F7A4E" : "#B4232A", fontWeight: 600 }}>
              {present ? <CheckCircle2 size={15} /> : <XCircle size={15} />} {a.identifier}
            </button>
          );
        })}
        {athletes.length === 0 && <div style={{ ...font, fontSize: 13, color: C.muted }}>Nessuna atleta attiva.</div>}
      </div>

      {summary.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.grid}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ ...font, fontSize: 12.5, fontWeight: 600, color: C.muted }}>Percentuale di presenza ({sessionsCount} allenamenti registrati)</div>
          {summary.map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ ...font, fontSize: 13.5, color: C.ink, flex: 1 }}>{s.identifier}</span>
              <div style={{ flex: 2, height: 7, background: C.surface, borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${s.pct}%`, background: s.pct >= 80 ? "#0F7A4E" : s.pct >= 60 ? C.orange : "#B4232A", borderRadius: 99 }} />
              </div>
              <span style={{ ...display, fontSize: 13, fontWeight: 700, color: C.navy, width: 40, textAlign: "right" }}>{s.pct}%</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
