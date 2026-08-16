// Bacheca personale — vedi supabase/wall.sql e src/wall.js. Solo il
// proprietario pubblica sulla propria bacheca; le altre reagiscono solo
// con un cuore. Bacheca "istituzionale" (staff): solo testo, niente tag.
import { useEffect, useRef, useState } from "react";
import { Heart, Camera, Smile, Repeat, Trash2, Tag, X, Send } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "./ui";
import { supabase } from "../supabaseClient";
import { useWall } from "../wall";

const MOODS = ["😄", "💪", "😌", "😅", "😞", "🔥"];
const fmtDate = (iso) => new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });

function TagPicker({ picked, onChange, excludeUid }) {
  const [open, setOpen] = useState(false);
  const [roster, setRoster] = useState(null);

  const load = () => {
    if (roster) return;
    supabase.rpc("chat_roster").then(({ data }) => setRoster((data || []).filter((r) => r.id !== excludeUid)));
  };

  const toggle = (r) => {
    const exists = picked.some((p) => p.userId === r.id);
    if (exists) onChange(picked.filter((p) => p.userId !== r.id));
    else if (picked.length < 5) onChange([...picked, { userId: r.id, name: r.name || r.athlete_id || "?" }]);
  };

  return (
    <div>
      <button type="button" onClick={() => { setOpen((v) => !v); load(); }}
        style={{ ...font, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, padding: "6px 11px", borderRadius: 9,
          border: `1px solid ${picked.length ? C.orange : C.grid}`, background: picked.length ? C.orangeSoft : C.card, color: picked.length ? C.orange : C.muted, cursor: "pointer" }}>
        <Tag size={13} /> {picked.length ? `${picked.length} taggate` : "Tagga"}
      </button>
      {open && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {roster === null ? (
            <span style={{ ...font, fontSize: 12, color: C.muted }}>Carico…</span>
          ) : roster.map((r) => {
            const on = picked.some((p) => p.userId === r.id);
            return (
              <button key={r.id} type="button" onClick={() => toggle(r)}
                style={{ ...font, fontSize: 12, padding: "5px 10px", borderRadius: 99, cursor: "pointer",
                  border: `1px solid ${on ? C.navy2 : C.grid}`, background: on ? C.navy2 : C.card, color: on ? "#fff" : C.ink }}>
                {r.name || r.athlete_id}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Composer({ wall, viewerUid, institutional }) {
  const [mode, setMode] = useState(null);   // null | "text" | "photo" | "mood"
  const [body, setBody] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [mood, setMood] = useState(null);
  const [tags, setTags] = useState([]);
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);

  const reset = () => { setMode(null); setBody(""); setPhotoFile(null); setPhotoPreview(null); setMood(null); setTags([]); setErr(null); };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
    setMode("photo");
  };

  const submit = async () => {
    setErr(null);
    let kind = mode || "text";
    if (kind === "mood" && !mood) { setErr("Scegli un'emoji."); return; }
    if (kind === "text" && !body.trim() && !institutional) { setErr("Scrivi qualcosa."); return; }
    if (kind === "text" && !body.trim() && institutional) { setErr("Scrivi qualcosa."); return; }
    const error = await wall.addPost(kind, {
      body, photoFile, moodEmoji: mood, taggedUserIds: institutional ? [] : tags.map((t) => t.userId),
    });
    if (error) { setErr(error); return; }
    reset();
  };

  return (
    <div style={{ background: C.surface, borderRadius: 12, padding: 14, marginBottom: 14 }}>
      <textarea value={body} onChange={(e) => { setBody(e.target.value); if (!mode) setMode("text"); }} rows={2}
        placeholder={institutional ? "Scrivi un annuncio o un pensiero per la squadra…" : "A cosa stai pensando?"}
        style={{ ...font, fontSize: 14, width: "100%", boxSizing: "border-box", border: `1px solid ${C.grid}`, borderRadius: 9, padding: "9px 11px", outline: "none", resize: "vertical", background: C.card }} />

      {photoPreview && (
        <div style={{ position: "relative", marginTop: 8, display: "inline-block" }}>
          <img src={photoPreview} alt="" style={{ maxWidth: 160, maxHeight: 160, borderRadius: 10, display: "block" }} />
          <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (mode === "photo") setMode("text"); }}
            style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 7, border: "none", background: "rgba(10,19,48,0.65)", color: "#fff", cursor: "pointer" }}>
            <X size={12} />
          </button>
        </div>
      )}

      {mode === "mood" && (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {MOODS.map((m) => (
            <button key={m} type="button" onClick={() => setMood(m)}
              style={{ fontSize: 20, padding: "6px 9px", borderRadius: 9, cursor: "pointer", border: `2px solid ${mood === m ? C.orange : "transparent"}`, background: C.card }}>
              {m}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {!institutional && (
          <>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
            <button type="button" onClick={() => fileRef.current?.click()} title="Aggiungi una foto"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 9, border: `1px solid ${C.grid}`, background: C.card, color: C.navy2, cursor: "pointer" }}>
              <Camera size={15} />
            </button>
            <button type="button" onClick={() => setMode("mood")} title="Umore del giorno"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 9, border: `1px solid ${C.grid}`, background: C.card, color: C.navy2, cursor: "pointer" }}>
              <Smile size={15} />
            </button>
            <TagPicker picked={tags} onChange={setTags} excludeUid={viewerUid} />
          </>
        )}
        <button onClick={submit} disabled={wall.busy}
          style={{ ...font, marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, padding: "8px 15px", borderRadius: 9, border: "none", background: C.orange, color: "#fff", cursor: wall.busy ? "default" : "pointer" }}>
          <Send size={14} /> {wall.busy ? "…" : "Pubblica"}
        </button>
      </div>
      {err && <div style={{ ...font, fontSize: 12, color: "#B4232A", marginTop: 6 }}>{err}</div>}
    </div>
  );
}

function PostRow({ post, wall, viewerUid, isStaff }) {
  const canDelete = post.author_id === viewerUid || isStaff;
  const myTag = post.tags.find((t) => t.mine);

  return (
    <div style={{ borderBottom: `1px solid ${C.grid}`, padding: "12px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {post.kind === "mood" && <span style={{ fontSize: 28 }}>{post.mood_emoji}</span>}
          {post.kind === "repost" && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#FFF8E6", border: "1px solid #F5D77A", borderRadius: 10, padding: "8px 12px" }}>
              <Repeat size={14} color="#C9971C" />
              <span style={{ fontSize: 18 }}>{post.repost_emoji}</span>
              <span style={{ ...font, fontSize: 13, fontWeight: 600, color: C.ink }}>{post.repost_label}</span>
            </div>
          )}
          {post.body && <div style={{ ...font, fontSize: 14, color: C.ink, lineHeight: 1.5, marginTop: post.kind === "mood" ? 6 : 0 }}>{post.body}</div>}
          {post.photo_url && <img src={post.photo_url} alt="" style={{ maxWidth: 220, borderRadius: 12, marginTop: 8, display: "block" }} />}
          {post.tags.length > 0 && (
            <div style={{ ...font, fontSize: 12, color: C.muted, marginTop: 6 }}>
              con {post.tags.map((t) => t.name).join(", ")}
              {myTag && <button onClick={() => wall.removeMyTag(post.id)} style={{ ...font, fontSize: 11.5, color: C.navy2, background: "none", border: "none", cursor: "pointer", marginLeft: 6, textDecoration: "underline" }}>togliti il tag</button>}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <button onClick={() => wall.toggleReaction(post.id, post.iReacted)}
              style={{ ...font, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, background: "none", border: "none", cursor: "pointer", color: post.iReacted ? "#E11D74" : C.muted }}>
              <Heart size={14} fill={post.iReacted ? "#E11D74" : "none"} /> {post.reactionCount > 0 ? post.reactionCount : ""}
            </button>
            <span style={{ ...font, fontSize: 11, color: C.muted }}>{fmtDate(post.created_at)}</span>
          </div>
        </div>
        {canDelete && (
          <button onClick={() => wall.removePost(post.id)} title="Elimina" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", flexShrink: 0 }}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function WallCard({ identifier, uid, viewerUid, isStaff, personal, institutional, title, bare, wall: providedWall }) {
  const ownWall = useWall({ identifier: providedWall ? undefined : identifier, uid: providedWall ? undefined : uid, viewerUid });
  const wall = providedWall || ownWall;

  if (wall.posts === null || wall.unavailable) return null;

  const body = (
    <>
      {wall.isOwner && <Composer wall={wall} viewerUid={viewerUid} institutional={institutional} />}
      {wall.posts.length === 0 ? (
        <div style={{ ...font, fontSize: 13.5, color: C.muted }}>
          {wall.isOwner ? "Ancora nessun pensiero: scrivi il primo!" : "Ancora nessun pensiero qui."}
        </div>
      ) : (
        <div>{wall.posts.map((p) => <PostRow key={p.id} post={p} wall={wall} viewerUid={viewerUid} isStaff={isStaff} />)}</div>
      )}
    </>
  );

  if (bare) return <div id="a360-wall" className="a360-noprint">{body}</div>;

  return (
    <Card id="a360-wall" title={title || (personal ? "La tua bacheca" : institutional ? "Bacheca" : "Bacheca")}
      subtitle={institutional ? "Pensieri e annunci per la squadra" : personal ? "Pensieri, foto e momenti — solo tu puoi scriverci" : "Solo lei può scrivere qui, tu puoi solo mettere un cuore"}
      style={{ marginTop: 20 }} className="a360-noprint">
      {body}
    </Card>
  );
}
