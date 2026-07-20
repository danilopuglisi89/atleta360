import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { C, font, display, CORE_COLORS } from "../theme";
import { CORE, SKILLS, SHORT } from "../skills";
import { Card, Select, tooltipStyle } from "../components/ui";

export default function AndamentoView({ d, onOpenCard }) {
  const { NOMI, storico } = d;
  const [n, setN] = useState(NOMI[0]);
  const sel = storico[n] ? n : NOMI[0];
  const data = storico[sel];
  const single = data.length < 2;
  const lastI = data.length - 1;

  // Confronto tra due rilevamenti scelti (default: penultimo → ultimo).
  const [fromI, setFromI] = useState(Math.max(0, lastI - 1));
  const [toI, setToI] = useState(lastI);
  const fi = Math.min(fromI, lastI);
  const ti = Math.min(toI, lastI);
  const deltas = single ? [] : CORE.map((k) => ({
    k, short: SHORT[k],
    diff: Math.round(((data[ti][k] ?? 0) - (data[fi][k] ?? 0)) * 10) / 10,
  }));

  const note = data.filter((e) => e.nota).map((e) => ({ periodo: e.periodo, nota: e.nota }));

  // Chi è cresciuto di più: variazione della media dal primo all'ultimo rilevamento.
  const overallOf = (e) => {
    const vals = SKILLS.map((k) => e[k]).filter((v) => typeof v === "number");
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };
  const growth = NOMI.map((name) => {
    const h = storico[name];
    if (!h || h.length < 2) return null;
    return { name, g: Math.round((overallOf(h[h.length - 1]) - overallOf(h[0])) * 10) / 10 };
  }).filter(Boolean).sort((a, b) => b.g - a.g);

  const selStyle = { ...font, fontSize: 13, color: C.ink, background: "#fff", border: `1px solid ${C.grid}`, borderRadius: 9, padding: "7px 10px", cursor: "pointer" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ ...font, fontSize: 13, color: C.muted }}>Atleta</span>
        <Select value={sel} onChange={setN} options={NOMI} />
      </div>

      {!single && (
        <Card title="Confronto tra due rilevamenti" subtitle="Scegli due date e osserva la variazione competenza per competenza" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={{ ...font, fontSize: 13, color: C.muted }}>Dal</span>
            <select value={fi} onChange={(e) => setFromI(+e.target.value)} style={selStyle}>
              {data.map((e, i) => <option key={i} value={i}>{e.periodo || `#${i + 1}`}</option>)}
            </select>
            <span style={{ ...font, fontSize: 13, color: C.muted }}>al</span>
            <select value={ti} onChange={(e) => setToI(+e.target.value)} style={selStyle}>
              {data.map((e, i) => <option key={i} value={i}>{e.periodo || `#${i + 1}`}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {deltas.map(({ k, short, diff }) => {
              const up = diff > 0, down = diff < 0;
              const col = up ? "#0F7A4E" : down ? "#B4232A" : C.muted;
              const bg = up ? "#DDF3E7" : down ? "#FDECEC" : C.surface;
              return (
                <div key={k} style={{ ...font, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6,
                  background: bg, color: col, borderRadius: 99, padding: "6px 12px", fontWeight: 600 }}>
                  <span style={{ color: C.ink, fontWeight: 500 }}>{short}</span>
                  {up ? "▲" : down ? "▼" : "="} {diff > 0 ? `+${diff}` : diff}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card title="Evoluzione nel tempo" subtitle="Andamento delle competenze core rilevamento dopo rilevamento">
        {single && (
          <div style={{ ...font, fontSize: 13, color: C.muted, background: C.surface, borderRadius: 12, padding: 14, marginBottom: 16 }}>
            C'è un solo rilevamento per questa atleta: la curva comparirà appena il mister compilerà di nuovo il modulo.
          </div>
        )}
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
            <XAxis dataKey="periodo" tick={{ fill: C.muted, fontSize: 12, ...font }} />
            <YAxis domain={[0, 10]} tick={{ fill: C.muted, fontSize: 11, ...font }} />
            {CORE.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} name={SHORT[k]} stroke={CORE_COLORS[i % CORE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            ))}
            <Legend wrapperStyle={{ ...font, fontSize: 12 }} />
            <Tooltip contentStyle={tooltipStyle} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {growth.length > 0 && (
        <Card title="Chi è cresciuto di più" subtitle="Variazione del punteggio medio dal primo all'ultimo rilevamento" style={{ marginTop: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {growth.slice(0, 6).map(({ name, g }, i) => {
              const up = g > 0, down = g < 0;
              const col = up ? "#0F7A4E" : down ? "#B4232A" : C.muted;
              const bg = up ? "#DDF3E7" : down ? "#FDECEC" : C.surface;
              return (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ ...display, fontWeight: 700, fontSize: 14, width: 22, color: i < 3 ? C.orange : C.muted }}>{i + 1}</div>
                  <span className={onOpenCard ? "a360-clickname" : undefined} onClick={onOpenCard ? () => onOpenCard(name) : undefined}
                    title={onOpenCard ? `Vedi il profilo di ${name}` : undefined}
                    style={{ ...font, fontSize: 14, color: C.ink, flex: 1 }}>{name}</span>
                  <span style={{ ...font, fontSize: 13, fontWeight: 600, color: col, background: bg, borderRadius: 99, padding: "5px 12px" }}>
                    {up ? "▲" : down ? "▼" : "="} {g > 0 ? `+${g}` : g}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {note.length > 0 && (
        <Card title="Note del mister" subtitle="Commenti rilevamento per rilevamento" style={{ marginTop: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {note.slice().reverse().map((e, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ ...display, fontSize: 12, fontWeight: 600, color: C.orange, background: C.orangeSoft, borderRadius: 8, padding: "3px 9px", whiteSpace: "nowrap" }}>{e.periodo}</span>
                <span style={{ ...font, fontSize: 13.5, color: C.ink, lineHeight: 1.55 }}>{e.nota}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
