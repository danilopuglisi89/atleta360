import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { C, font, display } from "./theme";
import { supabase } from "./supabaseClient";

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

const dt = (iso) => new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function AdminChatLog() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState({});
  const [lightbox, setLightbox] = useState(null);

  const load = () => supabase.from("direct_messages").select("*").order("created_at", { ascending: true }).limit(3000)
    .then(({ data, error }) => { if (error) setError(error.message); else setRows(data || []); });
  useEffect(() => { load(); }, []);

  const del = async (m) => {
    if (!window.confirm("Eliminare questo messaggio dalla conversazione?")) return;
    const { error } = await supabase.from("direct_messages").delete().eq("id", m.id);
    if (error) { setError(error.message); return; }
    load();
  };

  if (error) return <Card title="Errore"><span style={{ ...font, fontSize: 14, color: "#B4232A" }}>{error}</span></Card>;
  if (!rows) return <Card title="Carico le conversazioni…" />;

  const groups = {};
  rows.forEach((m) => {
    const key = [m.sender_id || "?", m.recipient_id || "?"].sort().join("|");
    (groups[key] ||= { key, msgs: [], names: new Set(), last: 0 });
    groups[key].msgs.push(m);
    if (m.sender_name) groups[key].names.add(m.sender_name);
    if (m.recipient_name) groups[key].names.add(m.recipient_name);
    groups[key].last = Math.max(groups[key].last, new Date(m.created_at).getTime());
  });
  const list = Object.values(groups).sort((a, b) => b.last - a.last);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card title="Log chat private" subtitle="Tutte le conversazioni private tra atlete, per la sicurezza delle Under 18. Sola lettura (moderazione).">
        {list.length === 0 ? (
          <div style={{ ...font, fontSize: 13.5, color: C.muted }}>Nessuna conversazione privata registrata.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {list.map((g) => {
              const isOpen = !!open[g.key];
              const names = [...g.names].join(" ↔ ") || "Conversazione";
              return (
                <div key={g.key} style={{ border: `1px solid ${C.grid}`, borderRadius: 12, overflow: "hidden" }}>
                  <button onClick={() => setOpen((o) => ({ ...o, [g.key]: !o[g.key] }))}
                    style={{ ...font, width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", border: "none", background: "#fff", cursor: "pointer", textAlign: "left" }}>
                    {isOpen ? <ChevronDown size={16} color={C.muted} /> : <ChevronRight size={16} color={C.muted} />}
                    <span style={{ ...display, fontSize: 14, fontWeight: 600, color: C.ink, flex: 1 }}>{names}</span>
                    <span style={{ ...font, fontSize: 12, color: C.muted }}>{g.msgs.length} messaggi · {dt(new Date(g.last).toISOString())}</span>
                  </button>
                  {isOpen && (
                    <div style={{ borderTop: `1px solid ${C.grid}`, padding: 14, background: C.surface, display: "flex", flexDirection: "column", gap: 10 }}>
                      {g.msgs.map((m) => (
                        <div key={m.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <span style={{ ...font, fontSize: 11, color: C.muted, whiteSpace: "nowrap", marginTop: 3, minWidth: 90 }}>{dt(m.created_at)}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ ...font, fontSize: 12.5, fontWeight: 600, color: C.navy2 }}>{m.sender_name || "—"}</div>
                            {m.image && <img src={m.image} alt="allegato" onClick={() => setLightbox(m.image)} style={{ display: "block", maxWidth: "min(220px, 55vw)", maxHeight: 220, borderRadius: 10, cursor: "pointer", margin: "4px 0" }} />}
                            {m.body && <div style={{ ...font, fontSize: 13.5, color: C.ink, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.body}</div>}
                          </div>
                          <button onClick={() => del(m)} title="Elimina" style={{ background: "none", border: "none", color: "#B4232A", cursor: "pointer", padding: 0, display: "inline-flex", marginTop: 2 }}><Trash2 size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(10,19,48,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, cursor: "zoom-out" }}>
          <img src={lightbox} alt="immagine" style={{ maxWidth: "94vw", maxHeight: "90vh", borderRadius: 12 }} />
        </div>
      )}
    </div>
  );
}
