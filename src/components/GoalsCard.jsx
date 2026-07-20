import { useState } from "react";
import { Target, Plus, Trash2, CheckCircle2, X, AlertCircle } from "lucide-react";
import { C, font, display } from "../theme";
import { CORE, TITLE } from "../skills";
import { Card } from "./ui";

// Obiettivi personali con barra di progresso (tabella goals, vedi
// supabase/goals.sql). Editabile solo dall'atleta sul proprio profilo;
// lo staff che guarda un profilo li vede in sola lettura.
export default function GoalsCard({ goals, scores, editable, onAdd, onRemove }) {
  const [adding, setAdding] = useState(false);
  const [skillKey, setSkillKey] = useState(CORE[0]);
  const [target, setTarget] = useState(8);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!editable && goals.length === 0) return null;

  const submit = async () => {
    setBusy(true); setError(null);
    const err = await onAdd(skillKey, target);
    setBusy(false);
    if (err) { setError(err.message); return; }
    setAdding(false);
  };

  const inp = { ...font, fontSize: 13.5, color: C.ink, background: "#fff", border: `1px solid ${C.grid}`, borderRadius: 9, padding: "8px 10px", outline: "none" };

  return (
    <Card title={editable ? "I tuoi obiettivi" : "Obiettivi"} subtitle={editable ? "Fissa un traguardo per un focus e segui i progressi" : "Traguardi fissati per questa atleta"} style={{ marginTop: 20 }}>
      {goals.length === 0 && !adding && (
        <div style={{ ...font, fontSize: 13.5, color: C.muted }}>Nessun obiettivo ancora impostato.</div>
      )}

      {goals.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {goals.map((g) => {
            const current = scores?.[g.skill_key] ?? 0;
            const pct = Math.min(100, Math.round((current / g.target) * 100));
            const reached = current >= g.target;
            return (
              <div key={g.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5, gap: 8 }}>
                  <span style={{ ...font, fontSize: 13.5, color: C.ink, display: "flex", alignItems: "center", gap: 6 }}>
                    {TITLE[g.skill_key] || g.skill_key}
                    {reached && <CheckCircle2 size={15} color="#0F7A4E" />}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ ...display, fontSize: 13, fontWeight: 700, color: reached ? "#0F7A4E" : C.navy2 }}>{current}/{g.target}</span>
                    {editable && (
                      <button onClick={() => onRemove(g.id)} title="Elimina obiettivo" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 0, display: "inline-flex" }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </span>
                </div>
                <div style={{ height: 7, background: C.surface, borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: reached ? "#0F7A4E" : C.orange, borderRadius: 99 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editable && (
        adding ? (
          <div style={{ marginTop: 16, background: C.surface, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <select value={skillKey} onChange={(e) => setSkillKey(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
              {CORE.map((k) => <option key={k} value={k}>{TITLE[k]}</option>)}
            </select>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ ...font, fontSize: 12.5, color: C.muted }}>Obiettivo</span>
                <span style={{ ...display, fontSize: 14, fontWeight: 700, color: C.orange }}>{target}/10</span>
              </div>
              <input type="range" min={1} max={10} step={1} value={target} onChange={(e) => setTarget(Number(e.target.value))} style={{ width: "100%", accentColor: C.orange }} />
            </div>
            {error && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#FDECEC", color: "#B4232A", borderRadius: 10, padding: "10px 12px", ...font, fontSize: 12.5, lineHeight: 1.5 }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{error}</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={submit} disabled={busy}
                style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 9, border: "none", background: C.orange, color: "#fff", fontSize: 13, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
                <Target size={14} /> {busy ? "Salvo…" : "Salva obiettivo"}
              </button>
              <button onClick={() => setAdding(false)} style={{ ...font, display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 12px", borderRadius: 9, border: `1px solid ${C.grid}`, background: "#fff", color: C.muted, fontSize: 13, cursor: "pointer" }}>
                <X size={14} /> Annulla
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAdding(true)}
            style={{ ...font, display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, border: `1px solid ${C.grid}`, background: "#fff", color: C.navy2, fontSize: 13.5, fontWeight: 600, cursor: "pointer", marginTop: goals.length ? 16 : 0 }}>
            <Plus size={16} /> Nuovo obiettivo
          </button>
        )
      )}
    </Card>
  );
}
