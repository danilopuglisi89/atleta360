import { useEffect, useState, useRef, useCallback } from "react";
import { Send, ImagePlus, X, Trash2, Plus } from "lucide-react";
import { C, font, display } from "./theme";
import { supabase } from "./supabaseClient";
import { useAuth } from "./auth";
import { fileToResizedDataUrl } from "./imageUtils";

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

const initials = (name) => (name || "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
const timeLabel = (iso) => {
  const d = new Date(iso), now = new Date();
  const t = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === now.toDateString() ? t : `${d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" })} ${t}`;
};
function MiniAvatar({ url, name, size = 30 }) {
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return <div style={{ width: size, height: size, borderRadius: "50%", background: C.navy2, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", ...display, fontWeight: 700, fontSize: size * 0.4, flexShrink: 0 }}>{initials(name)}</div>;
}

export default function DirectMessages() {
  const { profile, session } = useAuth();
  const uid = session?.user?.id;
  const myName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.email;

  const [mates, setMates] = useState([]);          // altre atlete
  const [toId, setToId] = useState("");            // destinataria selezionata
  const [pickerOpen, setPickerOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const listRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    supabase.rpc("chat_roster").then(({ data }) => {
      setMates((data || []).filter((r) => r.id && r.id !== uid));
    });
  }, [uid]);

  const to = mates.find((m) => m.id === toId);

  const load = useCallback(async () => {
    if (!toId) { setMessages([]); return; }
    const { data, error } = await supabase.from("direct_messages").select("*")
      .or(`and(sender_id.eq.${uid},recipient_id.eq.${toId}),and(sender_id.eq.${toId},recipient_id.eq.${uid})`)
      .order("created_at", { ascending: true }).limit(500);
    if (error) { setError(error.message); return; }
    setError(null); setMessages(data || []);
  }, [uid, toId]);

  useEffect(() => {
    load();
    if (!toId) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load, toId]);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [messages]);

  const pickImage = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setError(null);
    try { setPendingImage(await fileToResizedDataUrl(file)); } catch (err) { setError(err.message); }
    e.target.value = "";
  };

  const send = async () => {
    const b = text.trim();
    if ((!b && !pendingImage) || busy || !toId) return;
    setBusy(true); setError(null);
    const { error } = await supabase.from("direct_messages").insert({
      sender_id: uid, recipient_id: toId, sender_name: myName, recipient_name: to?.name || "",
      body: b || null, image: pendingImage || null,
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setText(""); setPendingImage(null);
    await load();
  };

  const del = async (m) => {
    if (!window.confirm("Eliminare questo messaggio?")) return;
    const { error } = await supabase.from("direct_messages").delete().eq("id", m.id);
    if (error) { setError(error.message); return; }
    await load();
  };

  return (
    <Card title="Messaggi privati" subtitle="Chat privata 1-a-1 tra atlete. Le conversazioni sono visibili allo staff per la sicurezza delle Under 18.">
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={() => setPickerOpen(true)}
          style={{ ...font, display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 16px", borderRadius: 11, border: "none", background: C.orange, color: "#fff", fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}>
          <Plus size={17} /> Nuovo messaggio privato
        </button>
        {to && <span style={{ ...font, fontSize: 13.5, color: C.muted }}>Conversazione con <b style={{ color: C.ink }}>{to.name}</b></span>}
      </div>

      {!toId ? (
        <div style={{ ...font, fontSize: 13.5, color: C.muted, background: C.surface, borderRadius: 12, padding: 16, textAlign: "center" }}>
          Premi “Nuovo messaggio privato” e scegli un'atleta per iniziare a scrivere.
        </div>
      ) : (
        <>
          <div ref={listRef} style={{ height: "min(46vh, 400px)", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4 }}>
            {messages.length === 0 && <div style={{ ...font, fontSize: 13.5, color: C.muted, textAlign: "center", margin: "auto" }}>Nessun messaggio ancora.</div>}
            {messages.map((m) => {
              const mine = m.sender_id === uid;
              return (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "85%" }}>
                    <div style={{ ...font, fontSize: 13.5, lineHeight: 1.5, padding: m.image ? 4 : "9px 13px", borderRadius: 14, whiteSpace: "pre-wrap", wordBreak: "break-word",
                      background: mine ? C.navy : C.surface, color: mine ? "#fff" : C.ink,
                      borderBottomRightRadius: mine ? 4 : 14, borderBottomLeftRadius: mine ? 14 : 4 }}>
                      {m.image && <img src={m.image} alt="allegato" onClick={() => setLightbox(m.image)} style={{ display: "block", maxWidth: "min(240px, 60vw)", maxHeight: 240, borderRadius: 11, cursor: "pointer", marginBottom: m.body ? 6 : 0 }} />}
                      {m.body && <span style={{ display: "block", padding: m.image ? "2px 8px 6px" : 0 }}>{m.body}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: mine ? "flex-end" : "flex-start", marginTop: 3 }}>
                      <span style={{ ...font, fontSize: 10.5, color: C.muted }}>{timeLabel(m.created_at)}</span>
                      {mine && <button onClick={() => del(m)} title="Elimina" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 0, display: "inline-flex" }}><Trash2 size={12} /></button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {error && <div style={{ ...font, fontSize: 12.5, color: "#B4232A", marginTop: 10 }}>{error}</div>}

          {pendingImage && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 12, background: C.surface, borderRadius: 10, padding: 6 }}>
              <img src={pendingImage} alt="anteprima" style={{ height: 44, borderRadius: 7, display: "block" }} />
              <button onClick={() => setPendingImage(null)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}><X size={16} /></button>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} style={{ display: "none" }} />
            <button type="button" onClick={() => fileRef.current?.click()} title="Allega immagine" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, borderRadius: 10, border: `1px solid ${C.grid}`, background: "#fff", color: C.navy2, cursor: "pointer", flexShrink: 0 }}><ImagePlus size={18} /></button>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Scrivi a ${to?.name || ""}…`} style={{ ...font, flex: 1, fontSize: 14, color: C.ink, background: "#fff", border: `1px solid ${C.grid}`, borderRadius: 10, padding: "11px 13px", outline: "none" }} />
            <button type="submit" disabled={busy || (!text.trim() && !pendingImage)} style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, padding: "0 16px", borderRadius: 10, border: "none", background: C.orange, color: "#fff", fontSize: 14, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy || (!text.trim() && !pendingImage) ? 0.6 : 1 }}><Send size={16} /> Invia</button>
          </form>
        </>
      )}

      {pickerOpen && (
        <div onClick={() => setPickerOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 65, background: "rgba(10,19,48,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "8vh 16px", overflowY: "auto" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, background: C.card, borderRadius: 16, border: `1px solid ${C.grid}`, padding: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ ...display, fontSize: 16, fontWeight: 700, color: C.ink }}>A chi vuoi scrivere?</div>
              <button onClick={() => setPickerOpen(false)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: "60vh", overflowY: "auto" }}>
              {mates.length === 0 && <div style={{ ...font, fontSize: 13, color: C.muted }}>Nessun'altra atleta disponibile.</div>}
              {mates.map((m) => (
                <button key={m.id} onClick={() => { setToId(m.id); setPickerOpen(false); }}
                  style={{ ...font, display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 10, border: "none", background: m.id === toId ? C.surface : "transparent", cursor: "pointer", textAlign: "left" }}>
                  <MiniAvatar url={m.avatar_url} name={m.name} size={32} />
                  <span style={{ ...font, fontSize: 14, color: C.ink }}>{m.name || "—"}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(10,19,48,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, cursor: "zoom-out" }}>
          <img src={lightbox} alt="immagine" style={{ maxWidth: "94vw", maxHeight: "90vh", borderRadius: 12 }} />
        </div>
      )}
    </Card>
  );
}
