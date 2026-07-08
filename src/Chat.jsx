import { useEffect, useState, useRef, useCallback } from "react";
import { Send, Trash2, ImagePlus, X, SmilePlus } from "lucide-react";
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

const REACTION_EMOJIS = ["👍", "❤️", "🔥", "😂", "😮", "💪"];

function MiniAvatar({ url, name, size = 30 }) {
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: C.navy2, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", ...display, fontWeight: 700, fontSize: size * 0.4, flexShrink: 0 }}>
      {initials(name)}
    </div>
  );
}

export default function Chat() {
  const { profile, session } = useAuth();
  const uid = session?.user?.id;
  const authorName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.email;
  const isAdmin = profile?.role === "admin";

  const [messages, setMessages] = useState([]);
  const [roster, setRoster] = useState({});
  const [reactions, setReactions] = useState({});   // id -> [{emoji, user_id}]
  const [pickerFor, setPickerFor] = useState(null);
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const listRef = useRef(null);
  const fileRef = useRef(null);
  const atBottom = useRef(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("chat_messages").select("*").order("created_at", { ascending: true }).limit(500);
    if (error) { setError(error.message); return; }
    setError(null);
    setMessages(data || []);
    const ids = (data || []).map((m) => m.id);
    if (ids.length) {
      const { data: rx } = await supabase.from("message_reactions").select("message_id,emoji,user_id").in("message_id", ids);
      const map = {};
      (rx || []).forEach((r) => { (map[r.message_id] ||= []).push(r); });
      setReactions(map);
    } else setReactions({});
  }, []);

  const toggleReaction = async (messageId, emoji) => {
    setPickerFor(null);
    const mine = (reactions[messageId] || []).find((r) => r.emoji === emoji && r.user_id === uid);
    // Aggiornamento ottimista, poi ricarico dal server.
    setReactions((prev) => {
      const list = prev[messageId] || [];
      const next = mine
        ? list.filter((r) => !(r.emoji === emoji && r.user_id === uid))
        : [...list, { emoji, user_id: uid }];
      return { ...prev, [messageId]: next };
    });
    if (mine) {
      await supabase.from("message_reactions").delete().eq("message_id", messageId).eq("user_id", uid).eq("emoji", emoji);
    } else {
      await supabase.from("message_reactions").insert({ message_id: messageId, user_id: uid, emoji });
    }
    await load();
  };

  const summarize = (list = []) => {
    const m = {};
    list.forEach((r) => { (m[r.emoji] ||= { count: 0, mine: false }); m[r.emoji].count++; if (r.user_id === uid) m[r.emoji].mine = true; });
    return Object.entries(m);
  };

  useEffect(() => {
    supabase.rpc("chat_roster").then(({ data }) => {
      setRoster(Object.fromEntries((data || []).map((r) => [r.id, r])));
    });
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (atBottom.current) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const onScroll = () => {
    const el = listRef.current; if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  const pickImage = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setError(null);
    try { setPendingImage(await fileToResizedDataUrl(file)); }
    catch (err) { setError(err.message); }
    e.target.value = "";
  };

  const send = async () => {
    const b = text.trim();
    if ((!b && !pendingImage) || busy) return;
    setBusy(true); setError(null);
    const { error } = await supabase.from("chat_messages").insert({ user_id: uid, author: authorName, body: b || null, image: pendingImage || null });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setText(""); setPendingImage(null); atBottom.current = true;
    await load();
  };

  const del = async (m) => {
    if (!window.confirm("Eliminare questo messaggio?")) return;
    const { error } = await supabase.from("chat_messages").delete().eq("id", m.id);
    if (error) { setError(error.message); return; }
    await load();
  };

  return (
    <Card title="Chat di squadra" subtitle="Chat disponibile e visualizzabile solo dalle atlete.">
      <div ref={listRef} onScroll={onScroll} style={{ height: "min(52vh, 460px)", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 4 }}>
        {messages.length === 0 && (
          <div style={{ ...font, fontSize: 13.5, color: C.muted, textAlign: "center", margin: "auto" }}>Ancora nessun messaggio. Scrivi il primo qui sotto!</div>
        )}
        {messages.map((m) => {
          const mine = m.user_id && m.user_id === uid;
          const av = roster[m.user_id];
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, maxWidth: "85%", flexDirection: mine ? "row-reverse" : "row" }}>
                {!mine && <MiniAvatar url={av?.avatar_url} name={m.author} />}
                <div>
                  {!mine && <div style={{ ...font, fontSize: 11.5, color: C.muted, marginBottom: 3, marginLeft: 2 }}>{m.author || "—"}</div>}
                  <div style={{ ...font, fontSize: 13.5, lineHeight: 1.5, padding: m.image ? 4 : "9px 13px", borderRadius: 14, whiteSpace: "pre-wrap", wordBreak: "break-word",
                    background: mine ? C.navy : C.surface, color: mine ? "#fff" : C.ink,
                    borderBottomRightRadius: mine ? 4 : 14, borderBottomLeftRadius: mine ? 14 : 4 }}>
                    {m.image && (
                      <img src={m.image} alt="allegato" onClick={() => setLightbox(m.image)}
                        style={{ display: "block", maxWidth: "min(260px, 60vw)", maxHeight: 260, borderRadius: 11, cursor: "pointer", marginBottom: m.body ? 6 : 0 }} />
                    )}
                    {m.body && <span style={{ display: "block", padding: m.image ? "2px 8px 6px" : 0 }}>{m.body}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: mine ? "flex-end" : "flex-start", marginTop: 3 }}>
                    <span style={{ ...font, fontSize: 10.5, color: C.muted }}>{timeLabel(m.created_at)}</span>
                    <button onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)} title="Reagisci"
                      style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 0, display: "inline-flex" }}><SmilePlus size={13} /></button>
                    {(mine || isAdmin) && (
                      <button onClick={() => del(m)} title="Elimina" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 0, display: "inline-flex" }}><Trash2 size={12} /></button>
                    )}
                  </div>

                  {pickerFor === m.id && (
                    <div style={{ display: "flex", gap: 2, marginTop: 5, background: "#fff", border: `1px solid ${C.grid}`, borderRadius: 99, padding: "3px 5px", boxShadow: "0 6px 18px rgba(10,22,80,0.12)", width: "fit-content", marginLeft: mine ? "auto" : 0 }}>
                      {REACTION_EMOJIS.map((e) => (
                        <button key={e} onClick={() => toggleReaction(m.id, e)} title={`Reagisci ${e}`}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "3px 5px", borderRadius: 8 }}>{e}</button>
                      ))}
                    </div>
                  )}

                  {summarize(reactions[m.id]).length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 5, justifyContent: mine ? "flex-end" : "flex-start" }}>
                      {summarize(reactions[m.id]).map(([emoji, info]) => (
                        <button key={emoji} onClick={() => toggleReaction(m.id, emoji)}
                          style={{ ...font, display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, cursor: "pointer",
                            background: info.mine ? C.orangeSoft : C.surface, border: `1px solid ${info.mine ? C.orange : C.grid}`,
                            borderRadius: 99, padding: "2px 8px", color: C.ink }}>
                          <span style={{ fontSize: 13 }}>{emoji}</span>
                          <span style={{ fontWeight: 600, color: info.mine ? C.orange : C.muted }}>{info.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
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
          <button onClick={() => setPendingImage(null)} title="Rimuovi" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}><X size={16} /></button>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} style={{ display: "none" }} />
        <button type="button" onClick={() => fileRef.current?.click()} title="Allega immagine"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, borderRadius: 10, border: `1px solid ${C.grid}`, background: "#fff", color: C.navy2, cursor: "pointer", flexShrink: 0 }}>
          <ImagePlus size={18} />
        </button>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Scrivi un messaggio…"
          style={{ ...font, flex: 1, fontSize: 14, color: C.ink, background: "#fff", border: `1px solid ${C.grid}`, borderRadius: 10, padding: "11px 13px", outline: "none" }} />
        <button type="submit" disabled={busy || (!text.trim() && !pendingImage)}
          style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, padding: "0 16px", borderRadius: 10, border: "none", background: C.orange, color: "#fff", fontSize: 14, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy || (!text.trim() && !pendingImage) ? 0.6 : 1 }}>
          <Send size={16} /> Invia
        </button>
      </form>

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(10,19,48,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, cursor: "zoom-out" }}>
          <img src={lightbox} alt="immagine" style={{ maxWidth: "94vw", maxHeight: "90vh", borderRadius: 12 }} />
        </div>
      )}
    </Card>
  );
}
