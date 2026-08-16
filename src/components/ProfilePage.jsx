// Pagina profilo stile Facebook — sostituisce la vecchia PublicProfileCard
// (popup piccolo): copertina, avatar sovrapposto, tab Post/Informazioni/Foto.
// Un'unica schermata sia per il proprio profilo (con controlli di modifica
// inline) sia per quello di chiunque altro cliccato in giro nell'app.
// Vedi supabase/profile-page.sql (colonna cover_url, set_my_cover,
// chat_roster allargato, team_feed agganciato all'uuid del profilo).
import { useEffect, useRef, useState } from "react";
import { X, Camera, MessageCircle, ClipboardList, Instagram, Facebook, Shirt, Pencil, Save } from "lucide-react";
import { C, font, display, ringForScore, ringForRole } from "../theme";
import { supabase } from "../supabaseClient";
import { compressImage } from "../photos";
import { useWall } from "../wall";
import { Avatar } from "../PersonalArea";
import WallCard from "./WallCard";

const CATEGORY_LABEL = { direzione: "Direzione", staff: "Staff", atleta: "Atleta" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function useIsDesktop() {
  const [desktop, setDesktop] = useState(() => window.matchMedia("(min-width: 860px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 860px)");
    const fn = () => setDesktop(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return desktop;
}

function EditForm({ row, onDone }) {
  const [form, setForm] = useState({
    ruolo: row.ruolo || "", jersey_number: row.jersey_number || "", motto: row.motto || "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fieldStyle = { ...font, fontSize: 13.5, color: C.ink, background: C.card, border: `1px solid ${C.grid}`, borderRadius: 9, padding: "8px 11px", width: "100%", boxSizing: "border-box", outline: "none" };
  const labelStyle = { ...font, fontSize: 11.5, color: C.muted, fontWeight: 600, marginBottom: 4, display: "block" };

  const save = async () => {
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc("update_my_profile", {
      p_phone: row.phone || null, p_facebook: row.facebook || null, p_instagram: row.instagram || null,
      p_jersey_number: form.jersey_number.trim() || null, p_ruolo: form.ruolo.trim() || null, p_avatar_url: row.avatar_url || null,
    });
    if (!error) await supabase.rpc("set_my_motto", { p_motto: form.motto || "" });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onDone({ ...row, ...form });
  };

  return (
    <div style={{ background: C.surface, borderRadius: 12, padding: 14, marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 130px" }}>
          <label style={labelStyle}>Ruolo</label>
          <input style={fieldStyle} value={form.ruolo} onChange={upd("ruolo")} placeholder="es. Palleggiatrice" />
        </div>
        <div style={{ flex: "1 1 90px" }}>
          <label style={labelStyle}>Maglia</label>
          <input style={fieldStyle} value={form.jersey_number} onChange={upd("jersey_number")} placeholder="es. 7" />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Motto</label>
        <input style={fieldStyle} value={form.motto} onChange={upd("motto")} placeholder="es. Punto dopo punto." />
      </div>
      {err && <div style={{ ...font, fontSize: 12, color: "#B4232A" }}>{err}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={save} disabled={busy}
          style={{ ...font, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, padding: "9px 15px", borderRadius: 9, border: "none", background: C.orange, color: "#fff", cursor: busy ? "default" : "pointer" }}>
          <Save size={14} /> {busy ? "Salvo…" : "Salva"}
        </button>
      </div>
    </div>
  );
}

// Link social in cima al profilo, sempre visibili appena si apre la
// scheda (stile TikTok) e modificabili sul posto se è il tuo profilo.
function SocialLinks({ row, isSelf, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [ig, setIg] = useState(row.instagram || "");
  const [fb, setFb] = useState(row.facebook || "");
  const [busy, setBusy] = useState(false);

  const social = [];
  if (row.instagram) social.push({ icon: Instagram, url: row.instagram.startsWith("http") ? row.instagram : `https://instagram.com/${row.instagram.replace(/^@/, "")}`, label: "Instagram" });
  if (row.facebook) social.push({ icon: Facebook, url: row.facebook.startsWith("http") ? row.facebook : `https://facebook.com/${row.facebook}`, label: "Facebook" });

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("update_my_profile", {
      p_phone: row.phone || null, p_facebook: fb.trim() || null, p_instagram: ig.trim() || null,
      p_jersey_number: row.jersey_number || null, p_ruolo: row.ruolo || null, p_avatar_url: row.avatar_url || null,
    });
    setBusy(false);
    if (!error) { onSaved({ ...row, instagram: ig.trim() || null, facebook: fb.trim() || null }); setEditing(false); }
  };

  if (!isSelf && social.length === 0) return null;

  if (editing) {
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
        <input value={ig} onChange={(e) => setIg(e.target.value)} placeholder="@instagram"
          style={{ ...font, fontSize: 12.5, padding: "7px 10px", borderRadius: 8, border: `1px solid ${C.grid}`, width: 140, boxSizing: "border-box" }} />
        <input value={fb} onChange={(e) => setFb(e.target.value)} placeholder="Facebook"
          style={{ ...font, fontSize: 12.5, padding: "7px 10px", borderRadius: 8, border: `1px solid ${C.grid}`, width: 140, boxSizing: "border-box" }} />
        <button onClick={save} disabled={busy}
          style={{ ...font, fontSize: 12.5, fontWeight: 600, padding: "7px 12px", borderRadius: 8, border: "none", background: C.orange, color: "#fff", cursor: busy ? "default" : "pointer" }}>
          {busy ? "…" : "Salva"}
        </button>
        <button onClick={() => setEditing(false)} style={{ ...font, fontSize: 12.5, color: C.muted, background: "none", border: "none", cursor: "pointer" }}>Annulla</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
      {social.map((s, i) => {
        const Icon = s.icon;
        return (
          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" title={s.label}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 9, border: `1px solid ${C.grid}`, background: C.card, color: C.navy2 }}>
            <Icon size={16} />
          </a>
        );
      })}
      {isSelf && (
        <button onClick={() => setEditing(true)}
          style={{ ...font, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "6px 10px", borderRadius: 9, border: `1px dashed ${C.grid}`, background: "none", color: C.muted, cursor: "pointer" }}>
          <Pencil size={11} /> {social.length ? "Modifica link" : "Aggiungi link"}
        </button>
      )}
    </div>
  );
}

function PhotoGrid({ wall, onOpenPhoto }) {
  const photos = (wall.posts || []).filter((p) => p.photo_url);
  if (photos.length === 0) {
    return <div style={{ ...font, fontSize: 13.5, color: C.muted, padding: "20px 0" }}>Ancora nessuna foto.</div>;
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, marginTop: 8 }}>
      {photos.map((p) => (
        <div key={p.id} onClick={() => onOpenPhoto(p.photo_url)}
          style={{ aspectRatio: "1 / 1", borderRadius: 6, overflow: "hidden", cursor: "pointer", background: C.surface }}>
          <img src={p.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Pagina profilo a schermo intero — mobile: pila unica; desktop:
   colonna centrata più larga, copertina/avatar più grandi.
   ============================================================ */
export default function ProfilePage({ target, model, viewer, onClose, onMessage, onFullProfile }) {
  const isDesktop = useIsDesktop();
  const [row, setRow] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState("post");
  const [editing, setEditing] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const coverRef = useRef(null);
  const avatarRef = useRef(null);

  useEffect(() => {
    if (!target) return;
    setRow(null); setNotFound(false); setTab("post"); setEditing(false);
    const isUuid = UUID_RE.test(target);
    const q = isUuid
      ? supabase.from("profiles").select("*").eq("id", target).maybeSingle()
      : supabase.from("profiles").select("*").eq("athlete_id", target).maybeSingle();
    q.then(({ data }) => { if (data) setRow(data); else setNotFound(true); });
  }, [target]);

  const wall = useWall({ uid: row?.id, viewerUid: viewer?.uid });

  const isSelf = !!row && row.id === viewer?.uid;
  const isAthlete = row?.category === "atleta";
  const canMessage = viewer?.isAthlete && row && !isSelf;
  const canOpenScore = viewer?.isStaff && isAthlete;
  const fullName = row ? [row.first_name, row.last_name].filter(Boolean).join(" ") : "";
  const overall = isAthlete && model?.overall ? model.overall(row.athlete_id) : null;
  const ring = overall != null ? ringForScore(overall) : ringForRole(row?.role, row?.category);

  const onCoverFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const dataUrl = await compressImage(file);
    const { error } = await supabase.rpc("set_my_cover", { p_cover: dataUrl });
    if (!error) setRow((r) => ({ ...r, cover_url: dataUrl }));
    e.target.value = "";
  };

  const onAvatarFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const dataUrl = await compressImage(file);
    const { error } = await supabase.rpc("update_my_profile", {
      p_phone: row.phone || null, p_facebook: row.facebook || null, p_instagram: row.instagram || null,
      p_jersey_number: row.jersey_number || null, p_ruolo: row.ruolo || null, p_avatar_url: dataUrl,
    });
    if (!error) setRow((r) => ({ ...r, avatar_url: dataUrl }));
    e.target.value = "";
  };

  const coverH = isDesktop ? 240 : 130;
  const avatarSize = isDesktop ? 136 : 92;
  const maxW = isDesktop ? 780 : "100%";
  const pad = isDesktop ? 28 : 16;

  return (
    <div className="a360-noprint" style={{ position: "fixed", inset: 0, zIndex: 120, background: C.surface, overflowY: "auto" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 2, display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: C.card, borderBottom: `1px solid ${C.grid}` }}>
        <button onClick={onClose} aria-label="Chiudi" style={{ background: "none", border: "none", color: C.ink, cursor: "pointer", display: "inline-flex", padding: 4 }}><X size={20} /></button>
        <div style={{ ...display, fontSize: 15, fontWeight: 700, color: C.ink }}>Profilo</div>
      </div>

      {notFound && (
        <div style={{ ...font, fontSize: 14, color: C.muted, padding: 40, textAlign: "center" }}>Profilo non trovato.</div>
      )}

      {row && (
        <div style={{ maxWidth: maxW, margin: "0 auto" }}>
          {/* Copertina */}
          <div style={{ position: "relative", height: coverH, background: row.cover_url ? `url(${row.cover_url}) center/cover` : `linear-gradient(120deg, ${C.navy} 0%, ${C.navy2} 100%)` }}>
            {isSelf && (
              <>
                <input ref={coverRef} type="file" accept="image/*" onChange={onCoverFile} style={{ display: "none" }} />
                <button onClick={() => coverRef.current?.click()} title="Cambia copertina"
                  style={{ position: "absolute", right: 12, bottom: 12, display: "inline-flex", alignItems: "center", gap: 6, ...font, fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 9, border: "none", background: "rgba(10,19,48,0.55)", color: "#fff", cursor: "pointer" }}>
                  <Camera size={14} /> Copertina
                </button>
              </>
            )}
          </div>

          {/* Avatar + identità */}
          <div style={{ padding: `0 ${pad}px 16px`, marginTop: -(avatarSize / 2) }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ background: C.surface, borderRadius: "50%", padding: 4, display: "inline-block" }}>
                  <Avatar url={row.avatar_url} name={fullName} size={avatarSize} ring={ring} />
                </div>
                {isSelf && !isAthlete && (
                  <>
                    <input ref={avatarRef} type="file" accept="image/*" onChange={onAvatarFile} style={{ display: "none" }} />
                    <button onClick={() => avatarRef.current?.click()} title="Cambia avatar"
                      style={{ position: "absolute", right: 2, bottom: 6, width: 28, height: 28, borderRadius: "50%", border: `2px solid ${C.surface}`, background: C.orange, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Camera size={13} />
                    </button>
                  </>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 160, paddingBottom: 4 }}>
                <div style={{ ...display, fontSize: isDesktop ? 22 : 19, fontWeight: 700, color: C.ink }}>
                  {fullName || "—"} {row.flair && <span>{row.flair}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginTop: 5 }}>
                  <span style={{ ...font, fontSize: 12.5, fontWeight: 600, color: C.navy2, background: C.surface, border: `1px solid ${C.grid}`, padding: "4px 11px", borderRadius: 99 }}>
                    {isAthlete ? (row.ruolo || "Atleta") : (CATEGORY_LABEL[row.category] || (row.role === "admin" ? "Admin" : "Staff"))}
                  </span>
                  {row.jersey_number && (
                    <span style={{ ...font, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: C.orange, background: C.orangeSoft, padding: "4px 11px", borderRadius: 99 }}>
                      <Shirt size={12} /> {row.jersey_number}
                    </span>
                  )}
                </div>
                {row.motto && <div style={{ ...font, fontSize: 13, color: C.muted, fontStyle: "italic", marginTop: 6 }}>"{row.motto}"</div>}
                <SocialLinks row={row} isSelf={isSelf} onSaved={setRow} />
              </div>
            </div>

            {/* Azioni */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              {canMessage && (
                <button onClick={() => onMessage(row.id, fullName)}
                  style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 10, border: "none", background: C.orange, color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
                  <MessageCircle size={15} /> Messaggio privato
                </button>
              )}
              {canOpenScore && onFullProfile && (
                <button onClick={() => onFullProfile(row.athlete_id)}
                  style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 10, border: `1px solid ${C.grid}`, background: C.card, color: C.navy2, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
                  <ClipboardList size={15} /> Scheda completa
                </button>
              )}
              {isSelf && (
                <button onClick={() => setEditing((v) => !v)}
                  style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 10, border: `1px solid ${C.grid}`, background: C.card, color: C.navy2, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
                  <Pencil size={13} /> {editing ? "Annulla" : "Modifica profilo"}
                </button>
              )}
            </div>

            {isSelf && editing && <EditForm row={row} onDone={(r) => { setRow(r); setEditing(false); }} />}

            {/* Tab */}
            <div style={{ display: "flex", gap: 4, marginTop: 20, borderBottom: `1px solid ${C.grid}` }}>
              {[["post", "Post"], ["foto", "Foto"]].map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)}
                  style={{ ...font, fontSize: 13.5, fontWeight: 600, padding: "10px 16px", background: "none", border: "none", cursor: "pointer",
                    color: tab === key ? C.orange : C.muted, borderBottom: tab === key ? `2px solid ${C.orange}` : "2px solid transparent" }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ paddingTop: 6 }}>
              {tab === "post" && (
                <WallCard uid={row.id} viewerUid={viewer?.uid} isStaff={viewer?.isStaff}
                  personal={isSelf && isAthlete} institutional={!isAthlete} bare wall={wall} />
              )}
              {tab === "foto" && <PhotoGrid wall={wall} onOpenPhoto={setLightbox} />}
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, zIndex: 130, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <img src={lightbox} alt="" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}
