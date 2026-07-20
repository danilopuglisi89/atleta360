import { useState } from "react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from "recharts";
import { Eye, Save, X, AlertCircle } from "lucide-react";
import { C, font, display } from "../theme";
import { CORE, SHORT, TITLE } from "../skills";
import { Card } from "./ui";
import { supabase } from "../supabaseClient";

// "Come ti vedi tu": l'atleta si autovaluta sugli stessi focus del mister,
// poi vede un piccolo radar di confronto (tabella self_assessments, vedi
// supabase/self-assessments.sql). Lo staff può compilarla per conto
// dell'atleta (es. per test, o se l'atleta non usa l'app) — stesso permesso
// già concesso lato Supabase (RLS: is_staff() oppure l'atleta stessa).
export default function SelfAssessmentCard({ athleteId, athleteName, misterScores, self, editable, personal, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [scores, setScores] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const hasSelf = !!self?.scores && Object.keys(self.scores).length > 0;
  const hasBoth = hasSelf && misterScores && Object.keys(misterScores).length > 0;
  const name = athleteName || "l'atleta";
  const seriesLabel = personal ? "Tu" : name;

  if (!editable && !hasSelf) return null;

  const startEdit = () => {
    const init = {};
    CORE.forEach((k) => (init[k] = self?.scores?.[k] ?? 6));
    setScores(init); setEditing(true); setError(null);
  };

  const save = async () => {
    if (!athleteId) return;
    setBusy(true); setError(null);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("self_assessments").insert({ athlete_id: athleteId, scores, created_by: u?.user?.id || null });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setEditing(false);
    onSaved && onSaved();
  };

  const radar = CORE.map((k) => ({ skill: SHORT[k], tu: self?.scores?.[k] ?? 0, mister: misterScores?.[k] ?? 0 }));
  const gaps = hasBoth
    ? CORE.map((k) => ({ short: SHORT[k], diff: Math.round(((self.scores[k] ?? 0) - (misterScores[k] ?? 0)) * 10) / 10 }))
        .filter((g) => Math.abs(g.diff) >= 1)
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
        .slice(0, 3)
    : [];

  return (
    <Card title={personal ? "Come ti vedi tu" : "Autovalutazione"}
      subtitle={personal ? "La tua autovalutazione a confronto con quella del mister" : `Autovalutazione di ${name} a confronto con la valutazione dello staff`}
      style={{ marginTop: 20 }}>
      {editable && !editing && (
        <button onClick={startEdit}
          style={{ ...font, display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, border: "none",
            background: C.navy2, color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer", marginBottom: hasSelf ? 18 : 0 }}>
          <Eye size={16} />
          {personal
            ? (hasSelf ? "Aggiorna la tua autovalutazione" : "Fai la tua autovalutazione")
            : (hasSelf ? `Modifica l'autovalutazione di ${name}` : `Inserisci l'autovalutazione di ${name}`)}
        </button>
      )}

      {editing && (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {CORE.map((k) => (
              <div key={k}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ ...font, fontSize: 13.5, color: C.ink }}>{TITLE[k]}</span>
                  <span style={{ ...display, fontSize: 15, fontWeight: 700, color: C.navy2 }}>{scores[k] ?? 6}</span>
                </div>
                <input type="range" min={1} max={10} step={1} value={scores[k] ?? 6}
                  onChange={(e) => setScores((sc) => ({ ...sc, [k]: Number(e.target.value) }))}
                  style={{ width: "100%", accentColor: C.navy2 }} />
              </div>
            ))}
          </div>
          {error && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#FDECEC", color: "#B4232A", borderRadius: 10, padding: "10px 12px", ...font, fontSize: 13, lineHeight: 1.5, marginTop: 14 }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{error}</span>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={save} disabled={busy}
              style={{ ...font, display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, border: "none",
                background: C.orange, color: "#fff", fontSize: 14, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
              <Save size={16} /> {busy ? "Salvo…" : "Salva"}
            </button>
            <button onClick={() => setEditing(false)}
              style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.grid}`, background: "#fff", color: C.muted, fontSize: 13.5, cursor: "pointer" }}>
              <X size={15} /> Annulla
            </button>
          </div>
        </div>
      )}

      {!editing && hasSelf && (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radar} outerRadius="72%">
              <PolarGrid stroke={C.grid} />
              <PolarAngleAxis dataKey="skill" tick={{ fill: C.muted, fontSize: 11, ...font }} />
              <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
              <Radar name="Il mister" dataKey="mister" stroke={C.navy2} fill={C.navy2} fillOpacity={0.12} strokeWidth={1.5} strokeDasharray="4 4" />
              <Radar name={seriesLabel} dataKey="tu" stroke={C.orange} fill={C.orange} fillOpacity={0.3} strokeWidth={2} dot={{ r: 2.5, fill: C.orange }} />
              <Legend wrapperStyle={{ ...font, fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
          {gaps.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
              {gaps.map((g) => (
                <div key={g.short} style={{ ...font, fontSize: 12.5, color: C.muted }}>
                  <b style={{ color: C.ink }}>{g.short}:</b>{" "}
                  {personal
                    ? (g.diff > 0
                        ? `ti vedi meglio di come ti vede il mister (+${g.diff})`
                        : `sei più severa con te stessa di quanto ti veda il mister (${g.diff})`)
                    : (g.diff > 0
                        ? `si vede meglio di come la vede il mister (+${g.diff})`
                        : `è più severa con se stessa di quanto la veda il mister (${g.diff})`)}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
