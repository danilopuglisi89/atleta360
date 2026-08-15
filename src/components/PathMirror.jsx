// "Lo specchio del percorso": la magia impossibile-ma-possibile scelta
// nell'intervista — una timeline di tutta la storia dell'atleta, che
// cresce con lei. Costruita SOLO da dati già esistenti (storico dei
// rilevamenti + stelle ricevute), nessuna tabella nuova.
import { useState } from "react";
import { Milestone, ChevronDown, ChevronUp, Star, TrendingUp, Flag } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "./ui";
import { useStars } from "../stars";

function overallOf(entry, keys) {
  const vals = keys.map((k) => entry[k]).filter((v) => typeof v === "number");
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

const fmtDate = (d) => new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });

export default function PathMirror({ athleteId, history, keys }) {
  const [open, setOpen] = useState(false);
  const { stars } = useStars(athleteId);

  const assessmentEvents = (history || [])
    .filter((e) => e.ts)
    .map((e, i) => ({
      kind: "assessment", ts: e.ts,
      label: i === 0 ? "Il tuo inizio" : "Rilevamento del mister",
      detail: `Media ${(overallOf(e, keys) ?? 0).toFixed(1)}`,
      icon: i === 0 ? Flag : TrendingUp,
    }));

  const starEvents = (stars || []).map((s) => ({
    kind: "star", ts: s.created_at, label: "Stella del mister", detail: s.note, icon: Star,
  }));

  const timeline = [...assessmentEvents, ...starEvents].sort((a, b) => new Date(a.ts) - new Date(b.ts));
  if (timeline.length === 0) return null;

  const shown = open ? timeline : timeline.slice(-4);

  return (
    <Card title="Il tuo percorso" subtitle="Tutta la tua storia, un passo alla volta" style={{ marginTop: 20 }} className="a360-noprint">
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {shown.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: e.kind === "star" ? "#FFF3D0" : C.orangeSoft,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <e.icon size={14} color={e.kind === "star" ? "#C9971C" : C.orange} />
              </div>
              {i < shown.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 20, background: C.grid }} />}
            </div>
            <div style={{ paddingBottom: 16 }}>
              <div style={{ ...font, fontSize: 11, color: C.muted }}>{fmtDate(e.ts)}</div>
              <div style={{ ...display, fontSize: 13.5, fontWeight: 700, color: C.ink, marginTop: 1 }}>{e.label}</div>
              {e.detail && <div style={{ ...font, fontSize: 12.5, color: C.muted, marginTop: 1 }}>{e.detail}</div>}
            </div>
          </div>
        ))}
      </div>
      {timeline.length > 4 && (
        <button onClick={() => setOpen((v) => !v)}
          style={{ ...font, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: C.navy2, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {open ? "Mostra solo le ultime tappe" : `Vedi tutto il percorso (${timeline.length} tappe)`}
        </button>
      )}
      {!open && <div style={{ ...font, fontSize: 11, color: C.muted, display: "flex", alignItems: "center", gap: 5, marginTop: timeline.length > 4 ? 0 : 4 }}>
        <Milestone size={11} /> Cresce con te a ogni rilevamento.
      </div>}
    </Card>
  );
}
