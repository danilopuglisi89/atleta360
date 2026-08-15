// Clip video di partita: link incollato (YouTube/Drive/simili), stesso
// modello dell'album foto — chiunque approvato carica, solo squadra e staff
// vedono. Niente upload di file (vedi supabase/q4.sql per il perché).
import { useState } from "react";
import { Video, Trash2, Plus, PlayCircle } from "lucide-react";
import { C, font } from "../theme";
import { Card } from "./ui";
import { useVideoClips } from "../videoClips";

export default function VideoClipsCard({ uid, isStaff }) {
  const { clips, add, remove } = useVideoClips();
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!uid) return null;

  const submit = async () => {
    if (!url.trim()) return;
    setBusy(true); setErr(null);
    const error = await add(url, caption, uid);
    setBusy(false);
    if (error) { setErr(error); return; }
    setUrl(""); setCaption("");
  };

  return (
    <Card title="Clip di partita" subtitle="Incolla il link a un video (YouTube, Drive…) — niente caricamento diretto" style={{ marginTop: 16 }} className="a360-noprint">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Incolla il link del video…"
          style={{ ...font, flex: "1 1 200px", fontSize: 13.5, border: `1px solid ${C.grid}`, borderRadius: 9, padding: "9px 12px", outline: "none" }} />
        <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Didascalia (facoltativa)"
          style={{ ...font, flex: "1 1 160px", fontSize: 13.5, border: `1px solid ${C.grid}`, borderRadius: 9, padding: "9px 12px", outline: "none" }} />
        <button onClick={submit} disabled={busy || !url.trim()}
          style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, padding: "9px 14px", borderRadius: 9, border: "none", background: C.orange, color: "#fff", cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
          <Plus size={15} /> Aggiungi
        </button>
      </div>
      {err && <div style={{ ...font, fontSize: 12.5, color: "#B4232A", marginBottom: 10 }}>{err}</div>}

      {clips === null ? (
        <div style={{ ...font, fontSize: 13, color: C.muted }}>Carico le clip…</div>
      ) : clips.length === 0 ? (
        <div style={{ ...font, fontSize: 13, color: C.muted }}>Ancora nessuna clip: aggiungine una tu!</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {clips.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${C.grid}`, borderRadius: 10, padding: "9px 12px" }}>
              <PlayCircle size={18} color={C.orange} style={{ flexShrink: 0 }} />
              <a href={c.url} target="_blank" rel="noreferrer" style={{ ...font, fontSize: 13.5, color: C.navy2, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: "none" }}>
                {c.caption || c.url}
              </a>
              {(c.uploaded_by === uid || isStaff) && (
                <button onClick={() => remove(c.id)} title="Elimina" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", flexShrink: 0 }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
