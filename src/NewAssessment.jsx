import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Save, Pencil, Trash2, X, History, StickyNote, Sparkles, Trash } from "lucide-react";
import { C, font, display } from "./theme";
import { supabase } from "./supabaseClient";
import { useAthleteNotes } from "./athleteNotes";

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

const fmt = (iso) => new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });

export default function NewAssessment({ onSaved }) {
  const [athletes, setAthletes] = useState(null);
  const [skills, setSkills] = useState([]);
  const [athleteId, setAthleteId] = useState("");
  const [scores, setScores] = useState({});
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);
  const [quickNote, setQuickNote] = useState("");
  const [draftBusy, setDraftBusy] = useState(false);
  const athleteNotes = useAthleteNotes(athleteId);
  const athleteName = athletes?.find((a) => a.id === athleteId)?.identifier || "";

  const resetScores = (list, base) => {
    const init = {};
    list.forEach((k) => (init[k.key] = base?.[k.key] ?? 6));
    setScores(init);
  };
  const resetForm = (base) => { setEditingId(null); setNote(""); resetScores(skills, base); };

  const loadHistory = useCallback(async (aid) => {
    if (!aid) { setHistory([]); return []; }
    const { data } = await supabase.from("assessments").select("*").eq("athlete_id", aid).order("created_at", { ascending: false });
    setHistory(data || []);
    return data || [];
  }, []);

  useEffect(() => {
    (async () => {
      const [a, s] = await Promise.all([
        supabase.from("athletes").select("id,identifier").eq("active", true).order("identifier"),
        supabase.from("skills").select("*").eq("active", true).order("sort_order"),
      ]);
      if (a.error || s.error) { setError((a.error || s.error).message); setAthletes([]); return; }
      setAthletes(a.data || []);
      setSkills(s.data || []);
      const init = {}; (s.data || []).forEach((k) => (init[k.key] = 6));
      setScores(init);
      if ((a.data || []).length) setAthleteId(a.data[0].id);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const data = await loadHistory(athleteId);
      resetForm(data?.[0]?.scores);
    })();
    /* eslint-disable-next-line */
  }, [athleteId]);

  const save = async () => {
    if (!athleteId) { setError("Scegli un'atleta."); return; }
    setBusy(true); setError(null);
    const { data: u } = await supabase.auth.getUser();
    const payload = { note: note.trim() || null, scores };
    let res;
    if (editingId) {
      res = await supabase.from("assessments").update(payload).eq("id", editingId);
    } else {
      res = await supabase.from("assessments").insert({ athlete_id: athleteId, created_by: u?.user?.id || null, ...payload });
    }
    setBusy(false);
    if (res.error) { setError(res.error.message); return; }
    setFlash(editingId ? "Rilevamento aggiornato." : "Rilevamento salvato.");
    const data = await loadHistory(athleteId);
    resetForm(data?.[0]?.scores);
    onSaved && onSaved();
    setTimeout(() => setFlash(null), 4000);
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setNote(a.note || "");
    const sc = {};
    skills.forEach((k) => (sc[k.key] = a.scores?.[k.key] ?? 6));
    setScores(sc);
    setFlash(null); setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const del = async (a) => {
    if (!window.confirm(`Eliminare il rilevamento del ${fmt(a.created_at)}?`)) return;
    setError(null);
    const { error } = await supabase.from("assessments").delete().eq("id", a.id);
    if (error) { setError(error.message); return; }
    const data = await loadHistory(athleteId);
    if (editingId === a.id) resetForm(data?.[0]?.scores);
    onSaved && onSaved();
  };

  const activeIndex = editingId ? history.findIndex((h) => h.id === editingId) : -1;
  const previous = editingId ? history[activeIndex + 1] : history[0];

  if (athletes === null) return <Card title="Carico atlete e focus…" />;
  if (athletes.length === 0)
    return <Card title="Nessuna atleta" subtitle="Aggiungi prima le atlete dal pannello admin (Richieste accesso → Atlete)." />;
  if (skills.length === 0)
    return <Card title="Nessun focus" subtitle="Aggiungi prima i focus dal pannello admin (Richieste accesso → Focus)." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card title={editingId ? "Modifica rilevamento" : "Nuovo rilevamento"} subtitle="Assegna un valore da 1 a 10 per ogni focus, poi salva.">
        {flash && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#DDF3E7", color: "#0F7A4E", borderRadius: 10, padding: "10px 12px", ...font, fontSize: 13, marginBottom: 14 }}>
            <CheckCircle2 size={16} /> {flash}
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <label style={{ ...font, fontSize: 12.5, color: C.muted, fontWeight: 500, marginBottom: 6, display: "block" }}>Atleta</label>
          <select value={athleteId} onChange={(e) => setAthleteId(e.target.value)} disabled={!!editingId}
            style={{ ...font, fontSize: 14, color: C.ink, background: "#fff", border: `1px solid ${C.grid}`, borderRadius: 10, padding: "10px 12px", minWidth: 220, cursor: editingId ? "not-allowed" : "pointer", opacity: editingId ? 0.7 : 1 }}>
            {athletes.map((a) => <option key={a.id} value={a.id}>{a.identifier}</option>)}
          </select>
        </div>

        {athleteId && (
          <div style={{ border: `1px dashed ${C.grid}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, ...font, fontSize: 12.5, color: C.muted, fontWeight: 600, marginBottom: 8 }}>
              <StickyNote size={14} /> Appunti rapidi su {athleteName} <span style={{ fontWeight: 400 }}>(presi in palestra, non entrano nel rilevamento finché non li usi)</span>
            </div>
            {athleteNotes.notes.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {athleteNotes.notes.map((n) => (
                  <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, background: C.surface, borderRadius: 9, padding: "7px 10px" }}>
                    <span style={{ ...font, fontSize: 12.5, color: C.ink, flex: 1 }}>{n.note}</span>
                    <button onClick={() => athleteNotes.removeNote(n.id)} title="Elimina appunto"
                      style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 2, flexShrink: 0 }}>
                      <Trash size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <input value={quickNote} onChange={(e) => setQuickNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && quickNote.trim()) { athleteNotes.addNote(quickNote); setQuickNote(""); } }}
                placeholder="Es. oggi ottima in ricezione…"
                style={{ ...font, flex: 1, fontSize: 13, border: `1px solid ${C.grid}`, borderRadius: 9, padding: "8px 11px", outline: "none" }} />
              <button onClick={() => { if (quickNote.trim()) { athleteNotes.addNote(quickNote); setQuickNote(""); } }}
                style={{ ...font, fontSize: 12.5, fontWeight: 600, padding: "8px 13px", borderRadius: 9, border: "none", background: C.navy2, color: "#fff", cursor: "pointer" }}>
                Aggiungi
              </button>
            </div>
          </div>
        )}

        {previous && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.surface, borderRadius: 10, padding: "8px 12px", ...font, fontSize: 12.5, color: C.muted, marginBottom: 14 }}>
            <History size={14} /> Rispetto al rilevamento del {fmt(previous.created_at)} — "prec." sotto ogni focus è il punto di partenza dell'atleta.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {skills.map((k) => (
            <div key={k.key}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ ...font, fontSize: 14, color: C.ink }}>{k.title}</span>
                <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  {previous?.scores?.[k.key] != null && (
                    <span style={{ ...font, fontSize: 12, color: C.muted }}>prec. {previous.scores[k.key]}</span>
                  )}
                  <span style={{ ...display, fontSize: 16, fontWeight: 700, color: C.orange }}>{scores[k.key] ?? 6}</span>
                </span>
              </div>
              <input type="range" min={1} max={10} step={1} value={scores[k.key] ?? 6}
                onChange={(e) => setScores((sc) => ({ ...sc, [k.key]: Number(e.target.value) }))}
                style={{ width: "100%", accentColor: C.orange }} />
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <label style={{ ...font, fontSize: 12.5, color: C.muted, fontWeight: 500 }}>Nota (facoltativa)</label>
            {athleteNotes.notes.length > 0 && (
              <button onClick={async () => {
                setDraftBusy(true);
                try {
                  const res = await fetch("/api/coach", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ messages: [{ role: "user", content: "bozza" }], noteDraft: { athleteName, notes: athleteNotes.notes.map((n) => n.note), scores } }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (res.ok && data.reply) setNote(data.reply);
                } finally { setDraftBusy(false); }
              }} disabled={draftBusy}
                style={{ ...font, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "6px 11px", borderRadius: 8, border: "none", background: C.orangeSoft, color: C.orange, cursor: draftBusy ? "default" : "pointer" }}>
                <Sparkles size={13} /> {draftBusy ? "Scrivo…" : "Genera bozza con IA"}
              </button>
            )}
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Osservazioni del mister…"
            style={{ ...font, fontSize: 14, color: C.ink, background: "#fff", border: `1px solid ${C.grid}`, borderRadius: 10, padding: "10px 12px", width: "100%", boxSizing: "border-box", resize: "vertical", outline: "none" }} />
        </div>

        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#FDECEC", color: "#B4232A", borderRadius: 10, padding: "10px 12px", ...font, fontSize: 13, lineHeight: 1.5, marginTop: 14 }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{error}</span>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
          <button onClick={save} disabled={busy}
            style={{ ...font, display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 11, border: "none", background: C.orange, color: "#fff", fontSize: 15, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
            <Save size={17} /> {busy ? "Salvo…" : editingId ? "Aggiorna rilevamento" : "Salva rilevamento"}
          </button>
          {editingId && (
            <button onClick={resetForm} style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, padding: "12px 16px", borderRadius: 11, border: `1px solid ${C.grid}`, background: "#fff", color: C.muted, fontSize: 14, cursor: "pointer" }}>
              <X size={16} /> Annulla modifica
            </button>
          )}
        </div>
      </Card>

      <Card title="Rilevamenti registrati" subtitle={history.length ? `${history.length} per questa atleta` : "Ancora nessun rilevamento per questa atleta"}>
        {history.length === 0 ? (
          <div style={{ ...font, fontSize: 13.5, color: C.muted }}>Salva il primo rilevamento qui sopra.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {history.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", borderBottom: `1px solid ${C.grid}`, padding: "10px 2px", background: editingId === a.id ? C.surface : "transparent", borderRadius: editingId === a.id ? 8 : 0 }}>
                <span style={{ ...display, fontSize: 12.5, fontWeight: 600, color: C.navy, background: C.surface, borderRadius: 8, padding: "4px 10px", whiteSpace: "nowrap" }}>{fmt(a.created_at)}</span>
                <span style={{ ...font, fontSize: 13, color: C.muted, flex: "1 1 160px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.note || "—"}</span>
                <button onClick={() => startEdit(a)} title="Modifica" style={{ ...font, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, padding: "6px 11px", borderRadius: 9, border: `1px solid ${C.grid}`, background: "#fff", color: C.navy2, cursor: "pointer" }}>
                  <Pencil size={14} /> Modifica
                </button>
                <button onClick={() => del(a)} title="Elimina" style={{ ...font, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 9, border: `1px solid ${C.grid}`, background: "#fff", color: "#B4232A", cursor: "pointer" }}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
