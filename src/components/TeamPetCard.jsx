// Il tamagotchi di squadra: cresce coi punti di TUTTE le atlete insieme.
// Collettivo apposta, zero classifica — o cresciamo insieme o niente.
import { Sprout } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "./ui";
import { useTeamGrowth } from "../streakBuddy";

const STAGES = [
  { min: 0, label: "Appena piantato", stem: 14, leaves: 0, flower: false },
  { min: 50, label: "Primo germoglio", stem: 30, leaves: 2, flower: false },
  { min: 200, label: "Cresce forte", stem: 50, leaves: 4, flower: false },
  { min: 500, label: "Sta per fiorire", stem: 68, leaves: 6, flower: false },
  { min: 1000, label: "In piena fioritura! 🌸", stem: 80, leaves: 6, flower: true },
];

function stageFor(total) {
  let s = STAGES[0];
  for (const st of STAGES) if (total >= st.min) s = st;
  return s;
}

function PlantSvg({ stage }) {
  const cx = 60, baseY = 130;
  const leaves = [];
  for (let i = 0; i < stage.leaves; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const h = baseY - 12 - (i / 2) * 16;
    leaves.push(
      <ellipse key={i} cx={cx + side * 16} cy={h} rx="14" ry="8"
        fill="#3FA85C" transform={`rotate(${side * 30} ${cx + side * 16} ${h})`} />
    );
  }
  return (
    <svg width="120" height="150" viewBox="0 0 120 150">
      <ellipse cx={cx} cy="138" rx="34" ry="8" fill="#0A165022" />
      <path d={`M${cx - 22} 148 L${cx - 16} 118 L${cx + 16} 118 L${cx + 22} 148 Z`} fill="#B4622A" />
      <path d={`M${cx - 22} 148 L${cx - 16} 118 L${cx + 16} 118 L${cx + 22} 148 Z`} fill="none" stroke="#8A4A1E" strokeWidth="2" />
      <line x1={cx} y1={baseY} x2={cx} y2={baseY - stage.stem} stroke="#2E7D45" strokeWidth="5" strokeLinecap="round" />
      {leaves}
      {stage.flower && (
        <g transform={`translate(${cx} ${baseY - stage.stem - 8})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} rx="10" ry="6" fill="#FF7A18" transform={`rotate(${a}) translate(10 0)`} />
          ))}
          <circle r="7" fill="#FFD34D" />
        </g>
      )}
    </svg>
  );
}

export default function TeamPetCard() {
  const total = useTeamGrowth();
  // A zero punti la pianta è solo un vaso vuoto: al lancio, quando ancora
  // nessuno ha fatto niente, meglio non mostrarla affatto — compare da sola
  // appena la squadra comincia a muoversi.
  if (total === null || total === 0) return null;
  const stage = stageFor(total);
  const next = STAGES.find((s) => s.min > total);

  return (
    <Card title="La pianta della squadra" subtitle="Cresce con i punti di TUTTE, insieme" style={{ marginTop: 16 }} className="a360-noprint">
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <PlantSvg stage={stage} />
        <div>
          <div style={{ ...display, fontSize: 16, fontWeight: 700, color: C.ink }}>{stage.label}</div>
          <div style={{ ...font, fontSize: 12.5, color: C.muted, marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
            <Sprout size={13} /> {total} punti di squadra in totale
          </div>
          {next && (
            <div style={{ ...font, fontSize: 11.5, color: C.muted, marginTop: 6 }}>
              Altri {next.min - total} punti (di tutte insieme) per il prossimo stadio
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
