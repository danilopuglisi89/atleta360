import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, AlertCircle } from "lucide-react";
import { C, font, display } from "./theme";

/*
 * Chat "Coach IA" riusabile.
 * - title / subtitle: intestazione
 * - suggestions: domande pronte mostrate quando la chat è vuota
 * - payload: oggetto unito al corpo della richiesta a /api/coach
 *   (es. { athlete, skills } per una singola atleta, oppure { team, skills }).
 */
export default function CoachChat({ title = "Coach IA", subtitle, suggestions = [], payload = {} }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    setError(null);
    const next = [...messages, { role: "user", content: q }];
    setMessages(next);
    setBusy(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Il coach non è raggiungibile.");
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(e.message || "Il coach non è raggiungibile in questo momento.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="a360-noprint" style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.grid}`, boxShadow: "0 1px 2px rgba(12,19,48,0.04)", padding: 20, marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: C.orangeSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkles size={17} color={C.orange} />
        </div>
        <div>
          <h3 style={{ ...display, fontSize: 15, fontWeight: 600, color: C.ink, margin: 0 }}>{title}</h3>
          {subtitle && <p style={{ ...font, fontSize: 12.5, color: C.muted, margin: "2px 0 0" }}>{subtitle}</p>}
        </div>
      </div>

      <div ref={listRef} style={{ maxHeight: 320, overflowY: "auto", margin: "16px 0", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4 }}>
        {messages.length === 0 && (
          <div style={{ ...font, fontSize: 13, color: C.muted, lineHeight: 1.6, background: C.surface, borderRadius: 12, padding: 14 }}>
            Fai una domanda per un consiglio pratico. Per esempio:
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} disabled={busy}
                  style={{ ...font, fontSize: 12.5, padding: "7px 12px", borderRadius: 99, cursor: "pointer",
                    border: `1px solid ${C.grid}`, background: "#fff", color: C.navy2, textAlign: "left" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ ...font, fontSize: 13.5, lineHeight: 1.55, maxWidth: "85%", padding: "10px 13px", borderRadius: 13, whiteSpace: "pre-wrap",
              background: m.role === "user" ? C.navy : C.surface,
              color: m.role === "user" ? "#fff" : C.ink,
              borderBottomRightRadius: m.role === "user" ? 4 : 13,
              borderBottomLeftRadius: m.role === "user" ? 13 : 4 }}>
              {m.content}
            </div>
          </div>
        ))}

        {busy && (
          <div style={{ ...font, fontSize: 13, color: C.muted, display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={15} color={C.orange} /> Il coach sta pensando…
          </div>
        )}
      </div>

      {error && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#FDECEC", color: "#B4232A",
          borderRadius: 10, padding: "10px 12px", ...font, fontSize: 12.5, lineHeight: 1.5, marginBottom: 12 }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{error}</span>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Scrivi al coach…"
          style={{ ...font, flex: 1, fontSize: 14, color: C.ink, background: "#fff", border: `1px solid ${C.grid}`, borderRadius: 10, padding: "11px 13px", outline: "none" }} />
        <button type="submit" disabled={busy || !input.trim()}
          style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, padding: "0 16px", borderRadius: 10, border: "none",
            background: C.orange, color: "#fff", fontSize: 14, fontWeight: 600, cursor: busy || !input.trim() ? "default" : "pointer", opacity: busy || !input.trim() ? 0.6 : 1 }}>
          <Send size={16} /> Invia
        </button>
      </form>

      <p style={{ ...font, fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
        Consigli generati dall'IA a scopo di supporto all'allenamento mentale. Non sostituiscono il parere del mister o di un professionista.
      </p>
    </div>
  );
}
