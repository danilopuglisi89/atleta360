import { useState } from "react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer } from "recharts";
import { Printer, Sparkles } from "lucide-react";
import { C, font, display } from "../theme";
import { CORE, TITLE, SKILL_META } from "../skills";
import { Card, tooltipStyle } from "../components/ui";
import Classifica from "../components/Classifica";
import CoachChat from "../CoachChat";

// items: stringhe, oppure { name, label } per righe cliccabili (→ profilo).
function ReportBlock({ label, color, items, onOpen }) {
  return (
    <div style={{ border: `1px solid ${C.grid}`, borderRadius: 12, padding: 14 }}>
      <div style={{ ...font, fontSize: 12.5, fontWeight: 600, color, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.length ? items.map((t, i) => {
          const isObj = t && typeof t === "object";
          const text = isObj ? t.label : t;
          const clickable = isObj && t.name && onOpen;
          return (
            <span key={i} className={clickable ? "a360-clickname" : undefined}
              onClick={clickable ? () => onOpen(t.name) : undefined}
              title={clickable ? `Apri il profilo di ${t.name}` : undefined}
              style={{ ...font, fontSize: 13.5, color: C.ink }}>{text}</span>
          );
        }) : <span style={{ ...font, fontSize: 13, color: C.muted }}>—</span>}
      </div>
    </div>
  );
}

export default function StaffView({ d, onOpenCard }) {
  const { NOMI, atleti, overall, RANK, TEAM_AVG, lastPeriod } = d;
  const [report, setReport] = useState(null);
  const [repBusy, setRepBusy] = useState(false);
  const [repErr, setRepErr] = useState(null);

  const teamAvg = (k) => Math.round((NOMI.reduce((a, n) => a + (atleti[n].scores[k] ?? 0), 0) / Math.max(NOMI.length, 1)) * 10) / 10;
  const bySkill = CORE.map((k) => ({ key: k, title: TITLE[k], value: teamAvg(k) })).sort((a, b) => a.value - b.value);
  const weakest = bySkill.slice(0, 3);
  const strongest = [...bySkill].reverse().slice(0, 3);
  const attention = [...NOMI].sort((a, b) => overall(a) - overall(b)).slice(0, 3);
  const teamMean = (NOMI.reduce((a, n) => a + overall(n), 0) / Math.max(NOMI.length, 1)).toFixed(1);

  const team = {
    count: NOMI.length,
    lastPeriod,
    averages: CORE.map((k) => ({ title: TITLE[k], value: teamAvg(k) })),
    roster: RANK.map((n) => ({ id: n, overall: overall(n).toFixed(1) })),
  };
  const skills = SKILL_META.map((s) => ({ title: s.title, desc: s.description }));

  const genReport = async () => {
    setRepBusy(true); setRepErr(null);
    try {
      const res = await fetch("/api/coach", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Genera un breve report di analisi della squadra: 1) punti di forza, 2) le competenze da allenare come priorità, 3) due o tre azioni concrete per il prossimo allenamento. Usa elenchi puntati e resta sintetico." }],
          team, skills,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Report non disponibile.");
      setReport(data.reply);
    } catch (e) { setRepErr(e.message); } finally { setRepBusy(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <div style={{ ...display, fontSize: 16, fontWeight: 700, color: C.ink }}>Report squadra — Oasi Volley U18</div>
          <div style={{ ...font, fontSize: 12.5, color: C.muted }}>Aggiornato al {lastPeriod}</div>
        </div>
        <button className="a360-noprint" onClick={() => window.print()}
          style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 500, padding: "9px 13px", borderRadius: 10, border: `1px solid ${C.grid}`, background: "#fff", color: C.ink, cursor: "pointer" }}>
          <Printer size={16} /> Stampa / PDF
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        {[
          { l: "Atlete monitorate", v: NOMI.length },
          { l: "Competenze core", v: CORE.length },
          { l: "Media squadra", v: teamMean },
          { l: "Ultimo rilevamento", v: lastPeriod },
        ].map((s) => (
          <div key={s.l} style={{ flex: "1 1 140px", background: C.card, border: `1px solid ${C.grid}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ ...display, fontSize: 26, fontWeight: 700, color: C.navy }}>{s.v}</div>
            <div style={{ ...font, fontSize: 12.5, color: C.muted, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        <Card title="Profilo medio della squadra" subtitle="Media delle competenze su tutte le atlete">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={TEAM_AVG} outerRadius="72%">
              <PolarGrid stroke={C.grid} />
              <PolarAngleAxis dataKey="skill" tick={{ fill: C.muted, fontSize: 11, ...font }} />
              <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
              <Radar name="Media" dataKey="valore" stroke={C.navy2} fill={C.navy2} fillOpacity={0.28} strokeWidth={2} />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Classifica generale" subtitle="Tocca un nome per vedere il profilo">
          <Classifica RANK={RANK} overall={overall} onOpen={onOpenCard} />
        </Card>
      </div>

      <Card title="Report & analisi" subtitle="Sintesi automatica dai dati della squadra" style={{ marginTop: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <ReportBlock label="Punti di forza (squadra)" color="#0F7A4E" items={strongest.map((s) => `${s.title} · ${s.value}/10`)} />
          <ReportBlock label="Priorità di allenamento" color="#B4232A" items={weakest.map((s) => `${s.title} · ${s.value}/10`)} />
          <ReportBlock label="Atlete da seguire" color={C.navy2} onOpen={onOpenCard} items={attention.map((n) => ({ name: n, label: `${n} · ${overall(n).toFixed(1)}` }))} />
        </div>

        <div style={{ marginTop: 16, borderTop: `1px solid ${C.grid}`, paddingTop: 16 }}>
          <button onClick={genReport} disabled={repBusy} className="a360-noprint"
            style={{ ...font, display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, border: "none", background: C.orange, color: "#fff", fontSize: 14, fontWeight: 600, cursor: repBusy ? "default" : "pointer", opacity: repBusy ? 0.7 : 1 }}>
            <Sparkles size={16} /> {repBusy ? "Genero l'analisi…" : "Genera analisi con IA"}
          </button>
          {repErr && <div style={{ ...font, fontSize: 13, color: "#B4232A", marginTop: 10 }}>{repErr}</div>}
          {report && (
            <div style={{ ...font, fontSize: 14, color: C.ink, lineHeight: 1.6, whiteSpace: "pre-wrap", background: C.surface, borderRadius: 12, padding: "14px 16px", marginTop: 14, borderLeft: `3px solid ${C.orange}` }}>
              {report}
            </div>
          )}
        </div>
      </Card>

      <CoachChat
        title="Coach IA — Squadra"
        subtitle="Consigli allo staff su come allenare le soft skill del gruppo"
        suggestions={[
          "Su quale competenza dovremmo concentrarci come squadra?",
          "Proponi una seduta di allenamento mentale di gruppo.",
          "Come far crescere le atlete più in difficoltà?",
        ]}
        payload={{ team, skills }}
      />
    </div>
  );
}
