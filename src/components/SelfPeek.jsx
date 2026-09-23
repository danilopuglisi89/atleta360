// L'autovalutazione di un'atleta, a colpo d'occhio, per il mister: la guarda
// prima di dare la sua, per poterle confrontare. Radar solo con i valori di
// lei (la linea del mister compare solo quando esiste un suo rilevamento),
// i numeri focus per focus, e il pulsante che porta dritto al rilevamento
// con l'atleta già scelta.
//
// Solo per chi può valutare (canAssess): è uno strumento di lavoro, non una
// vetrina. La scheda completa, con la modifica per conto dell'atleta, resta
// SelfAssessmentCard più in basso nel profilo.
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import { ClipboardPlus, Hourglass } from "lucide-react";
import { C, font, display } from "../theme";
import { CORE, SHORT, TITLE } from "../skills";

const fmt = (iso) => new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "long" });

export function AssessButton({ name, onClick, style }) {
  return (
    <button onClick={onClick}
      style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, height: 40, padding: "0 16px", borderRadius: 10,
        border: "none", background: C.orange, color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer", ...style }}>
      <ClipboardPlus size={16} /> Dai valutazione{name ? ` a ${name}` : ""}
    </button>
  );
}

export default function SelfPeek({ self, misterScores, name, onAssess }) {
  const hasSelf = !!self?.scores && Object.keys(self.scores).length > 0;
  const hasMister = !!misterScores && Object.keys(misterScores).length > 0;

  if (!hasSelf) {
    return (
      <div>
        <div style={{ ...font, fontSize: 13.5, color: C.muted, display: "flex", alignItems: "center", gap: 8 }}>
          <Hourglass size={15} /> {name ? `${name} non ha` : "Non ha"} ancora fatto l'autovalutazione.
        </div>
        {onAssess && <AssessButton onClick={onAssess} style={{ marginTop: 12 }} />}
      </div>
    );
  }

  const radar = CORE.map((k) => ({ skill: SHORT[k], lei: self.scores[k] ?? 0, mister: misterScores?.[k] ?? 0 }));

  return (
    <div>
      <div style={{ ...font, fontSize: 12.5, color: C.muted, marginBottom: 4 }}>
        Autovalutazione del {fmt(self.ts)}
        {hasMister && <> · <span style={{ color: C.navy2 }}>tratteggio = il tuo ultimo rilevamento</span></>}
      </div>

      <ResponsiveContainer width="100%" height={230}>
        <RadarChart data={radar} outerRadius="70%">
          <PolarGrid stroke={C.grid} />
          <PolarAngleAxis dataKey="skill" tick={{ fill: C.muted, fontSize: 11, ...font }} />
          <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
          {hasMister && (
            <Radar name="Mister" dataKey="mister" stroke={C.navy2} fill={C.navy2} fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 4" />
          )}
          <Radar name="Lei" dataKey="lei" stroke={C.orange} fill={C.orange} fillOpacity={0.3} strokeWidth={2} dot={{ r: 2.5, fill: C.orange }} />
        </RadarChart>
      </ResponsiveContainer>

      {/* I numeri, perché su un radar un 6 e un 7 si distinguono a fatica. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 6, marginTop: 4 }}>
        {CORE.map((k) => (
          <div key={k} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8,
            background: C.surface, borderRadius: 8, padding: "6px 10px" }}>
            <span style={{ ...font, fontSize: 12.5, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={TITLE[k]}>{TITLE[k]}</span>
            <span style={{ ...display, fontSize: 15, fontWeight: 700, color: C.orange, flexShrink: 0 }}>
              {self.scores[k] ?? "–"}
              {hasMister && misterScores[k] != null && (
                <span style={{ ...font, fontSize: 11, fontWeight: 500, color: C.muted }}> / {misterScores[k]}</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {onAssess && <AssessButton onClick={onAssess} style={{ marginTop: 14 }} />}
    </div>
  );
}
