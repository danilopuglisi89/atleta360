import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer } from "recharts";
import { C, font, display } from "../theme";
import { CORE } from "../skills";
import { Card, tooltipStyle } from "../components/ui";
import Classifica from "../components/Classifica";
import { MotivationCard } from "../components/bits";

export default function HomeView({ d, onOpenCard }) {
  const { NOMI, overall, RANK, TEAM_AVG, lastPeriod } = d;
  return (
    <div>
      <MotivationCard />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        {[
          { l: "Atlete monitorate", v: NOMI.length },
          { l: "Focus allenati", v: CORE.length },
          { l: "Media squadra", v: (NOMI.reduce((a, n) => a + overall(n), 0) / Math.max(NOMI.length, 1)).toFixed(1) },
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
    </div>
  );
}
