// "Momento del giorno" stile BeReal: un'emoji + una foto e una nota
// facoltative, visibile a tutta la squadra con reazioni rapide (tabelle
// daily_moments/moment_reactions, Ondata A + WOW-1).
import { useRef, useState } from "react";
import { Sparkles, Camera, X } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "./ui";
import { useDailyMoments } from "../participation";
import { compressImage } from "../photos";

const EMOJI = ["😄", "💪", "😅", "😴", "🔥", "😤", "🥳", "😌"];
const QUICK_REACTIONS = ["❤️", "😂", "🔥", "👏"];

export default function DailyMomentCard({ uid }) {
  const { feed, mine, save, reactions, myReactions, react, unavailable } = useDailyMoments(uid);
  const [picked, setPicked] = useState(null);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState(null);
  const fileRef = useRef(null);

  if (!uid || feed === null || unavailable) return null;

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhoto(await compressImage(file));
  };

  const submit = async (emoji) => {
    setBusy(true);
    await save(emoji, note, photo);
    setBusy(false);
    setPicked(null); setNote(""); setPhoto(null);
  };

  return (
    <Card title="Il momento del giorno" subtitle="Com'è andata oggi? Un'emoji, e una foto se vuoi" style={{ marginTop: 16 }} className="a360-noprint">
      {mine ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {mine.photo && <img src={mine.photo} alt="" onClick={() => setViewer(mine.photo)} style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", cursor: "pointer" }} />}
          <div style={{ ...font, fontSize: 13.5, color: C.ink, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22 }}>{mine.emoji}</span> Registrato per oggi{mine.note ? `: “${mine.note}”` : ""} — puoi cambiarlo quando vuoi.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {EMOJI.map((e) => (
            <button key={e} onClick={() => setPicked(e)} disabled={busy}
              style={{ fontSize: 22, padding: "8px 10px", borderRadius: 10, cursor: "pointer",
                border: `2px solid ${picked === e ? C.orange : C.grid}`, background: picked === e ? C.orangeSoft : C.card }}>
              {e}
            </button>
          ))}
        </div>
      )}

      {picked && !mine && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Una parola su oggi (facoltativo)" maxLength={80}
              style={{ ...font, fontSize: 13, border: `1px solid ${C.grid}`, borderRadius: 9, padding: "8px 11px", flex: "1 1 160px" }} />
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
            <button onClick={() => fileRef.current?.click()} title="Aggiungi una foto"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 9, border: `1px solid ${C.grid}`, background: C.card, color: C.navy2, cursor: "pointer", flexShrink: 0 }}>
              <Camera size={16} />
            </button>
            <button onClick={() => submit(picked)} disabled={busy}
              style={{ ...font, fontSize: 12.5, fontWeight: 600, padding: "8px 14px", borderRadius: 9, border: "none", background: C.orange, color: "#fff", cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
              {busy ? "Pubblico…" : "Pubblica"}
            </button>
          </div>
          {photo && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 10, background: C.surface, borderRadius: 10, padding: 6 }}>
              <img src={photo} alt="anteprima" style={{ height: 60, borderRadius: 7, display: "block" }} />
              <button onClick={() => setPhoto(null)} title="Rimuovi" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}><X size={16} /></button>
            </div>
          )}
        </div>
      )}

      {feed.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16, borderTop: `1px solid ${C.grid}`, paddingTop: 14 }}>
          {feed.map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {m.photo && <img src={m.photo} alt="" onClick={() => setViewer(m.photo)} style={{ width: 34, height: 34, borderRadius: 8, objectFit: "cover", cursor: "pointer", flexShrink: 0 }} />}
              <div title={m.note || ""} style={{ display: "flex", alignItems: "center", gap: 6, background: C.surface, borderRadius: 99, padding: "6px 12px" }}>
                <span style={{ fontSize: 17 }}>{m.emoji}</span>
                <span style={{ ...font, fontSize: 12.5, color: C.ink }}>{m.first_name || "?"}</span>
              </div>
              <div style={{ display: "flex", gap: 3 }}>
                {(reactions[m.id] || []).map((r) => (
                  <button key={r.emoji} onClick={() => react(m.id, r.emoji)}
                    style={{ ...font, fontSize: 11.5, display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 7px", borderRadius: 99, cursor: "pointer",
                      border: `1px solid ${myReactions[m.id] === r.emoji ? C.orange : C.grid}`, background: myReactions[m.id] === r.emoji ? C.orangeSoft : C.card, color: C.ink }}>
                    {r.emoji} {r.count}
                  </button>
                ))}
                {!myReactions[m.id] && m.user_id !== uid && QUICK_REACTIONS.slice(0, 2).map((e) => (
                  <button key={e} onClick={() => react(m.id, e)} title={`Reagisci ${e}`}
                    style={{ fontSize: 13, padding: "3px 6px", borderRadius: 99, border: `1px dashed ${C.grid}`, background: "none", cursor: "pointer", opacity: 0.6 }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {feed.length === 0 && (
        <div style={{ ...font, fontSize: 12.5, color: C.muted, marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={13} /> Ancora nessuno oggi: sii la prima!
        </div>
      )}

      {viewer && (
        <div onClick={() => setViewer(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(6,10,30,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <img src={viewer} alt="" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 12 }} />
        </div>
      )}
    </Card>
  );
}
