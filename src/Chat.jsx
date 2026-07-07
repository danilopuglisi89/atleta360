import { useEffect, useState, useRef, useCallback } from "react";
import { Send, Trash2, MessagesSquare } from "lucide-react";
import { C, font, display } from "./theme";
import { supabase } from "./supabaseClient";
import { useAuth } from "./auth";

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

export default function Chat() {
  const { profile, session } = useAuth();
  const uid = session?.user?.id;
  const authorName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.email;
  const isAdmin = profile?.role === "admin";

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);
  const atBottom = useRef(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("chat_messages").select("*").order("created_at", { ascending: true }).limit(500);
    if (error) { setError(error.message); return; }
    setError(null);
    setMessages(data || []);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);   // aggiornamento periodico
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (atBottom.current) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const onScroll = () => {
    const el = listRef.current; if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  const send = async () => {
    const b = text.trim(); if (!b || busy) return;
    setBusy(true); setError(null);
    const { error } = await supabase.from("chat_messages").insert({ user_id: uid, author: authorName, body: b });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setText("");
    atBottom.current = true;
    await load();
  };

  const del = async (m) => {
    if (!window.confirm("Eliminare questo messaggio?")) return;
    const { error } = await supabase.from("chat_messages").delete().eq("id", m.id);
    if (error) { setError(error.message); return; }
    await load();
  };

  return (
    <Card title="Chat di squadra" subtitle="Bacheca riservata alle atlete e allo staff (admin)">
      <div ref={listRef} onScroll={onScroll} style={{ height: "min(52vh, 460px)", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 4 }}>
        {messages.length === 0 && (
          <div style={{ ...font, fontSize: 13.5, color: C.muted, textAlign: "center", margin: "auto" }}>
            Ancora nessun messaggio. Scrivi il primo qui sotto!
          </div>
        )}
        {messages.map((m) => {
          const mine = m.user_id && m.user_id === uid;
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, maxWidth: "85%", flexDirection: mine ? "row-reverse" : "row" }}>
                {!mine && (
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.navy2, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", ...display, fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                    {initials(m.author)}
                  </div>
                )}
                <div>
                  {!mine && <div style={{ ...font, fontSize: 11.5, color: C.muted, marginBottom: 3, marginLeft: 2 }}>{m.author || "—"}</div>}
                  <div style={{ ...font, fontSize: 13.5, lineHeight: 1.5, padding: "9px 13px", borderRadius: 14, whiteSpace: "pre-wrap", wordBreak: "break-word",
                    background: mine ? C.navy : C.surface, color: mine ? "#fff" : C.ink,
                    borderBottomRightRadius: mine ? 4 : 14, borderBottomLeftRadius: mine ? 14 : 4 }}>
                    {m.body}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: mine ? "flex-end" : "flex-start", marginTop: 3 }}>
                    <span style={{ ...font, fontSize: 10.5, color: C.muted }}>{timeLabel(m.created_at)}</span>
                    {(mine || isAdmin) && (
                      <button onClick={() => del(m)} title="Elimina" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 0, display: "inline-flex" }}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && <div style={{ ...font, fontSize: 12.5, color: "#B4232A", marginTop: 10 }}>{error}</div>}

      <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Scrivi un messaggio…"
          style={{ ...font, flex: 1, fontSize: 14, color: C.ink, background: "#fff", border: `1px solid ${C.grid}`, borderRadius: 10, padding: "11px 13px", outline: "none" }} />
        <button type="submit" disabled={busy || !text.trim()}
          style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, padding: "0 16px", borderRadius: 10, border: "none", background: C.orange, color: "#fff", fontSize: 14, fontWeight: 600, cursor: busy || !text.trim() ? "default" : "pointer", opacity: busy || !text.trim() ? 0.6 : 1 }}>
          <Send size={16} /> Invia
        </button>
      </form>
    </Card>
  );
}
