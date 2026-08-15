// Pagellone finale: un commento di chiusura stagione scritto dal mister,
// una riga per atleta (si aggiorna, non si accumula). Solo lo staff scrive,
// l'atleta e lo staff leggono. Vedi supabase/q3.sql (tabella season_reports).
import { useEffect, useState } from "react";
import { GraduationCap, Save } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "./ui";
import { supabase } from "../supabaseClient";

export default function SeasonReportCard({ athleteId, athleteName, isStaff, personal }) {
  const [content, setContent] = useState(null);   // null = caricamento, "" = nessuno ancora
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!athleteId) { setContent(""); return; }
    supabase.from("season_reports").select("content").eq("athlete_id", athleteId).maybeSingle()
      .then(({ data }) => { setContent(data?.content || ""); setDraft(data?.content || ""); });
  }, [athleteId]);

  if (!athleteId || content === null || (!isStaff && !content)) return null;

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("season_reports").upsert(
      { athlete_id: athleteId, content: draft.trim() }, { onConflict: "athlete_id" }
    );
    setBusy(false);
    if (!error) { setContent(draft.trim()); setEditing(false); }
  };

  return (
    <Card title="Pagellone di fine stagione" subtitle={personal ? "Il commento di chiusura del mister" : `Commento di chiusura per ${athleteName}`} style={{ marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, ...font, fontSize: 12, color: C.orange, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
        <GraduationCap size={14} /> Fine stagione
      </div>
      {isStaff && editing ? (
        <>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={5}
            placeholder="Il percorso di questa stagione, i progressi, cosa portare avanti…"
            style={{ ...font, fontSize: 14, color: C.ink, background: C.card, border: `1px solid ${C.grid}`, borderRadius: 10, padding: "10px 12px", width: "100%", boxSizing: "border-box", resize: "vertical", outline: "none" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={save} disabled={busy}
              style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 9, border: "none", background: C.orange, color: "#fff", cursor: busy ? "default" : "pointer" }}>
              <Save size={14} /> {busy ? "Salvo…" : "Salva"}
            </button>
            <button onClick={() => { setDraft(content); setEditing(false); }}
              style={{ ...font, fontSize: 13, padding: "8px 14px", borderRadius: 9, border: `1px solid ${C.grid}`, background: C.card, color: C.muted, cursor: "pointer" }}>
              Annulla
            </button>
          </div>
        </>
      ) : content ? (
        <>
          <div style={{ ...font, fontSize: 14, color: C.ink, lineHeight: 1.6, whiteSpace: "pre-wrap", background: C.surface, borderRadius: 12, padding: "14px 16px", borderLeft: `3px solid ${C.orange}` }}>
            {content}
          </div>
          {isStaff && (
            <button onClick={() => setEditing(true)}
              style={{ ...font, fontSize: 12.5, fontWeight: 600, padding: "7px 12px", borderRadius: 9, border: `1px solid ${C.grid}`, background: C.card, color: C.navy2, cursor: "pointer", marginTop: 10 }}>
              Modifica
            </button>
          )}
        </>
      ) : (
        <button onClick={() => setEditing(true)}
          style={{ ...font, fontSize: 12.5, fontWeight: 600, padding: "8px 14px", borderRadius: 9, border: "none", background: C.navy2, color: "#fff", cursor: "pointer" }}>
          Scrivi il pagellone
        </button>
      )}
    </Card>
  );
}
