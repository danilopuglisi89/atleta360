import { useRef, useState } from "react";
import { Camera, Trash2, Upload } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "./ui";
import { usePhotos } from "../photos";

export default function PhotoAlbumCard({ uid, isStaff }) {
  const { photos, upload, remove } = usePhotos(uid);
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  if (!uid) return null;

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true); setErr(null);
    const error = await upload(file);
    setBusy(false);
    if (error) setErr(error);
  };

  return (
    <Card title="Album foto di squadra" subtitle="Partite, eventi, momenti insieme — caricate da voi" style={{ marginTop: 16 }} className="a360-noprint">
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
      <button onClick={() => fileRef.current?.click()} disabled={busy}
        style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 14, padding: "8px 13px", borderRadius: 9, border: "none", background: C.orange, color: "#fff", fontSize: 13, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
        <Camera size={15} /> {busy ? "Carico…" : "Aggiungi foto"}
      </button>
      {err && <div style={{ ...font, fontSize: 12.5, color: "#B4232A", marginBottom: 10 }}>{err}</div>}

      {photos === null ? (
        <div style={{ ...font, fontSize: 13, color: C.muted }}>Carico l'album…</div>
      ) : photos.length === 0 ? (
        <div style={{ ...font, fontSize: 13, color: C.muted }}>Ancora nessuna foto: caricane una tu!</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8 }}>
          {photos.map((p) => (
            <div key={p.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden", border: `1px solid ${C.grid}` }}>
              <img src={p.url} alt="" onClick={() => window.open(p.url, "_blank")}
                style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }} />
              {(p.uploaded_by === uid || isStaff) && (
                <button onClick={() => remove(p.id)} title="Elimina"
                  style={{ position: "absolute", top: 3, right: 3, width: 22, height: 22, borderRadius: 7, border: "none", background: "rgba(10,19,48,0.65)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
