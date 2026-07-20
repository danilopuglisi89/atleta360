import { useState } from "react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { C, font, SERIES } from "../theme";
import { CORE, SHORT } from "../skills";
import { Card, tooltipStyle } from "../components/ui";

export default function ConfrontoView({ d }) {
  const { NOMI, atleti } = d;
  const [sel, setSel] = useState(() => [NOMI[0], NOMI[1]].filter(Boolean));
  const toggle = (n) => setSel((s) => s.includes(n) ? s.filter((x) => x !== n) : (s.length < 3 ? [...s, n] : s));

  const radar = CORE.map((k) => {
    const row = { skill: SHORT[k] };
    sel.forEach((n) => (row[n] = atleti[n]?.scores[k] ?? 0));
    return row;
  });

  return (
    <div>
      <Card title="Seleziona le atlete da confrontare" subtitle="Fino a 3 profili in sovrapposizione" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {NOMI.map((n) => {
            const on = sel.includes(n);
            const idx = sel.indexOf(n);
            return (
              <button key={n} onClick={() => toggle(n)}
                style={{ ...font, fontSize: 13, padding: "8px 14px", borderRadius: 99, cursor: "pointer",
                  border: `1.5px solid ${on ? (SERIES[idx] || C.orange) : C.grid}`,
                  background: on ? (SERIES[idx] || C.orange) : "#fff",
                  color: on ? "#fff" : C.ink, fontWeight: on ? 600 : 400, transition: "all .15s" }}>
                {n}
              </button>
            );
          })}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        <Card title="Confronto profili (core)" subtitle="Le competenze fondamentali a confronto">
          <ResponsiveContainer width="100%" height={340}>
            <RadarChart data={radar} outerRadius="72%">
              <PolarGrid stroke={C.grid} />
              <PolarAngleAxis dataKey="skill" tick={{ fill: C.muted, fontSize: 11, ...font }} />
              <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
              {sel.map((n, i) => (
                <Radar key={n} name={n} dataKey={n} stroke={SERIES[i]} fill={SERIES[i]} fillOpacity={0.18} strokeWidth={2} />
              ))}
              <Legend wrapperStyle={{ ...font, fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Confronto per competenza" subtitle="Valori affiancati, competenza per competenza">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={radar} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
              <XAxis dataKey="skill" tick={{ fill: C.muted, fontSize: 10.5, ...font }} interval={0} angle={-18} textAnchor="end" height={54} />
              <YAxis domain={[0, 10]} tick={{ fill: C.muted, fontSize: 11, ...font }} />
              {sel.map((n, i) => (
                <Bar key={n} dataKey={n} name={n} fill={SERIES[i]} radius={[5, 5, 0, 0]} />
              ))}
              <Legend wrapperStyle={{ ...font, fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(10,22,80,0.04)" }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
