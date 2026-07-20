import { useEffect, useRef, useState } from "react";
import { Bell, MessageCircle, MessagesSquare, ClipboardPlus, CheckCircle2 } from "lucide-react";
import { C, font, display } from "../theme";

const ICON_BY_TYPE = { dm: MessageCircle, team_chat: MessagesSquare, assessment: ClipboardPlus, approval: CheckCircle2 };

const timeLabel = (iso) => {
  const d = new Date(iso), now = new Date();
  const t = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === now.toDateString() ? t : d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
};

// Campanella con pallino rosso + elenco a tendina. Un click su una notifica
// la segna come letta e naviga alla vista collegata (gestito dal chiamante).
export default function NotificationBell({ items, unreadCount, onOpenItem, onMarkAllRead }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((v) => !v)} aria-label="Notifiche"
        style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 38, height: 38, borderRadius: 11, border: `1px solid ${C.grid}`, background: "#fff", color: C.ink, cursor: "pointer" }}>
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, minWidth: 17, height: 17, borderRadius: 99, background: "#E11D48",
            color: "#fff", ...display, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", border: "2px solid #fff" }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="a360-reveal" style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 45, width: 320, maxWidth: "88vw",
          background: C.card, borderRadius: 14, border: `1px solid ${C.grid}`, boxShadow: "0 16px 40px rgba(10,22,80,0.18)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: `1px solid ${C.grid}` }}>
            <span style={{ ...display, fontSize: 14, fontWeight: 700, color: C.ink }}>Notifiche</span>
            {unreadCount > 0 && (
              <button onClick={() => onMarkAllRead()} style={{ ...font, fontSize: 12, color: C.navy2, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                Segna tutte lette
              </button>
            )}
          </div>
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            {items.length === 0 ? (
              <div style={{ ...font, fontSize: 13, color: C.muted, padding: "24px 16px", textAlign: "center" }}>Nessuna notifica per ora.</div>
            ) : items.map((n) => {
              const Icon = ICON_BY_TYPE[n.type] || Bell;
              return (
                <button key={n.id} onClick={() => { setOpen(false); onOpenItem(n); }}
                  style={{ display: "flex", gap: 10, alignItems: "flex-start", width: "100%", textAlign: "left", padding: "11px 14px",
                    border: "none", borderBottom: `1px solid ${C.grid}`, cursor: "pointer", background: n.read ? "#fff" : C.orangeSoft }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: n.read ? C.surface : "#fff", color: C.navy2,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={15} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ ...font, fontSize: 13, color: C.ink, fontWeight: n.read ? 500 : 700, lineHeight: 1.35 }}>{n.title}</div>
                    {n.body && <div style={{ ...font, fontSize: 12, color: C.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.body}</div>}
                    <div style={{ ...font, fontSize: 10.5, color: C.muted, marginTop: 3 }}>{timeLabel(n.created_at)}</div>
                  </div>
                  {!n.read && <span style={{ width: 8, height: 8, borderRadius: 99, background: C.orange, flexShrink: 0, marginTop: 5 }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
