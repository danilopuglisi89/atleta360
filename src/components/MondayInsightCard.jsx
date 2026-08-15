// Insight del lunedì: l'IA prepara da sola 3 osservazioni sulla squadra,
// generate una sola volta a settimana (localStorage), non a ogni apertura —
// stesso principio di risparmio crediti già usato per il coach nudge.
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "./ui";

function weekKey() {
  const d = new Date();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

export default function MondayInsightCard({ team, skills }) {
  const [text, setText] = useState(null);
  const [busy, setBusy] = useState(false);
  const isMonday = new Date().getDay() === 1;

  useEffect(() => {
    if (!isMonday || !team || team.count === 0) return;
    const key = `a360-monday-insight-${weekKey()}`;
    const cached = localStorage.getItem(key);
    if (cached) { setText(cached); return; }
    setBusy(true);
    fetch("/api/coach", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "È lunedì: dammi in 3 righe brevi e concrete cosa dovrei notare questa settimana sulla squadra, senza premesse né saluti." }],
        team, skills,
      }),
    }).then((r) => r.json()).then((data) => {
      if (data.reply) { setText(data.reply); localStorage.setItem(key, data.reply); }
    }).catch(() => {}).finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMonday, team?.count]);

  if (!isMonday || (!text && !busy)) return null;

  return (
    <Card style={{ marginTop: 20, background: "linear-gradient(120deg, #FFF3E6 0%, #FFE9D5 100%)", border: "1px solid #FFD3A0" }} className="a360-noprint">
      <div style={{ display: "flex", alignItems: "center", gap: 8, ...font, fontSize: 12, color: "#B4520A", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
        <Sparkles size={14} /> Insight del lunedì
      </div>
      {busy ? (
        <div style={{ ...font, fontSize: 13.5, color: C.muted }}>Il coach sta guardando i dati della squadra…</div>
      ) : (
        <div style={{ ...font, fontSize: 14, color: C.ink, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{text}</div>
      )}
    </Card>
  );
}
