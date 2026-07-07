import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Save } from "lucide-react";
import { C, font, display } from "./theme";
import { supabase } from "./supabaseClient";

function Card({ title, subtitle, children, style }) {
  return (
    <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.grid}`, boxShadow: "0 1px 2px rgba(12,19,48,0.04)", padding: 20, ...style }}>
      {title && <h3 style={{ ...display, fontSize: 15, fontWeight: 600, color: C.ink, margin: 0 }}>{title}</h3>}
      {subtitle && <p style={{ ...font, fontSize: 13, color: C.muted, margin: "4px 0 0" }}>{subtitle}</p>}
      {(title || subtitle) && <div style={{ height: 16 }} />}
      {children}
    </div>
  );
}

export default function NewAssessment({ onSaved }) {
  const [athletes, setAthletes] = useState(null);
  const [skills, setSkills] = useState([]);
  const [athleteId, setAthleteId] = useState("");
  const [scores, setScores] = useState({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const resetScores = (list) => {
    const init = {};
    list.forEach((k) => (init[k.key] = 6));
    setScores(init);
  };

  useEffect(() => {
    (async () => {
      const [a, s] = await Promise.all([
        supabase.from("athletes").select("id,identifier").eq("active", true).order("identifier"),
        supabase.from("skills").select("*").eq("active", true).order("sort_order"),
      ]);
      if (a.error || s.error) { setError((a.error || s.error).message); setAthletes([]); return; }
      setAthletes(a.data || []);
      setSkills(s.data || []);
      resetScores(s.data || []);
      if ((a.data || []).length) setAthleteId(a.data[0].id);
    })();
  }, []);

  const save = async () => {
    if (!athleteId) { setError("Scegli un'atleta."); return; }
    setBusy(true); setError(null);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("assessments").insert({
      athlete_id: athleteId,
      note: note.trim() || null,
      scores,
      created_by: u?.user?.id || null,
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    onSaved && onSaved();
  };

  const another = () => { setDone(false); setNote(""); resetScores(skills); };

  if (athletes === null) return <Card title="Carico atlete e focus…" />;
  if (athletes.length === 0)
    return <Card title="Nessuna atleta" subtitle="Aggiungi prima le atlete dal pannello admin (Richieste accesso → Atlete)." />;
  if (skills.length === 0)
    return <Card title="Nessun focus" subtitle="Aggiungi prima i focus dal pannello admin (Richieste accesso → Focus)." />;

  if (done) {
    const name = athletes.find((a) => a.id === athleteId)?.identifier || "";
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "16px 4px" }}>
          <CheckCircle2 size={44} color="#0F7A4E" style={{ marginBottom: 12 }} />
          <div style={{ ...display, fontSize: 18, fontWeight: 700, color: C.ink }}>Rilevamento salvato!</div>
          <p style={{ ...font, fontSize: 14, color: C.muted, marginTop: 8 }}>
            Il rilevamento di <b>{name}</b> è stato registrato e la dashboard è aggiornata.
          </p>
          <button onClick={another} style={{ ...font, marginTop: 14, padding: "11px 18px", borderRadius: 11, border: "none", background: C.orange, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Inserisci un altro rilevamento
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Nuovo rilevamento" subtitle="Assegna un valore da 1 a 10 per ogni focus, poi salva.">
      <div style={{ marginBottom: 18 }}>
        <label style={{ ...font, fontSize: 12.5, color: C.muted, fontWeight: 500, marginBottom: 6, display: "block" }}>Atleta</label>
        <select value={athleteId} onChange={(e) => setAthleteId(e.target.value)}
          style={{ ...font, fontSize: 14, color: C.ink, background: "#fff", border: `1px solid ${C.grid}`, borderRadius: 10, padding: "10px 12px", minWidth: 220, cursor: "pointer" }}>
          {athletes.map((a) => <option key={a.id} value={a.id}>{a.identifier}</option>)}
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {skills.map((k) => (
          <div key={k.key}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <span style={{ ...font, fontSize: 14, color: C.ink }}>{k.title}</span>
              <span style={{ ...display, fontSize: 16, fontWeight: 700, color: C.orange }}>{scores[k.key] ?? 6}</span>
            </div>
            <input type="range" min={1} max={10} step={1} value={scores[k.key] ?? 6}
              onChange={(e) => setScores((sc) => ({ ...sc, [k.key]: Number(e.target.value) }))}
              style={{ width: "100%", accentColor: C.orange }} />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <label style={{ ...font, fontSize: 12.5, color: C.muted, fontWeight: 500, marginBottom: 6, display: "block" }}>Nota (facoltativa)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Osservazioni del mister…"
          style={{ ...font, fontSize: 14, color: C.ink, background: "#fff", border: `1px solid ${C.grid}`, borderRadius: 10, padding: "10px 12px", width: "100%", boxSizing: "border-box", resize: "vertical", outline: "none" }} />
      </div>

      {error && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#FDECEC", color: "#B4232A", borderRadius: 10, padding: "10px 12px", ...font, fontSize: 13, lineHeight: 1.5, marginTop: 14 }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{error}</span>
        </div>
      )}

      <button onClick={save} disabled={busy}
        style={{ ...font, display: "inline-flex", alignItems: "center", gap: 8, marginTop: 18, padding: "12px 18px", borderRadius: 11, border: "none", background: C.orange, color: "#fff", fontSize: 15, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
        <Save size={17} /> {busy ? "Salvo…" : "Salva rilevamento"}
      </button>
    </Card>
  );
}
