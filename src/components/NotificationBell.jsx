import { useEffect, useRef, useState } from "react";
import { Bell, BellRing, MessageCircle, MessagesSquare, ClipboardPlus, CheckCircle2, Target, Smartphone, CalendarDays } from "lucide-react";
import { C, font, display } from "../theme";
import { usePush } from "../push";

const ICON_BY_TYPE = { dm: MessageCircle, team_chat: MessagesSquare, assessment: ClipboardPlus, approval: CheckCircle2, goal: Target, reminder: BellRing, event: CalendarDays };

// Riga in cima al menu della campanella: attiva/disattiva le push sul dispositivo.
function PushRow({ userId }) {
  const { status, busy, enable, disable } = usePush(userId);
  if (status === "loading" || status === "unsupported") return null;

  let label, action = null, hint = null;
  if (status === "ios-install") {
    label = "Notifiche sul telefono";
    hint = "Su iPhone: prima aggiungi l'app alla schermata Home (Condividi → Aggiungi a Home), poi riapri da lì.";
  } else if (status === "denied") {
    label = "Notifiche bloccate dal browser";
    hint = "Riattivale dalle impostazioni del sito nel browser.";
  } else if (status === "on") {
    label = "Notifiche push attive ✓";
    action = { text: busy ? "…" : "Disattiva", fn: disable };
  } else {
    label = "Attiva notifiche sul telefono";
    action = { text: busy ? "…" : "Attiva", fn: enable };
  }

  return (
    <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.grid}`, background: C.surface }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Smartphone size={14} color={C.navy2} style={{ flexShrink: 0 }} />
        <span style={{ ...font, fontSize: 12.5, color: C.ink, fontWeight: 600, flex: 1 }}>{label}</span>
        {action && (
          <button onClick={action.fn} disabled={busy}
            style={{ ...font, fontSize: 12, fontWeight: 700, color: "#fff", background: status === "on" ? C.muted : C.orange,
              border: "none", borderRadius: 8, padding: "5px 10px", cursor: busy ? "default" : "pointer" }}>
            {action.text}
          </button>
        )}
      </div>
      {hint && <div style={{ ...font, fontSize: 11.5, color: C.muted, marginTop: 5, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

const timeLabel = (iso) => {
  const d = new Date(iso), now = new Date();
  const t = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === now.toDateString() ? t : d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
};

// Campanella con pallino rosso + elenco a tendina. Un click su una notifica
// la segna come letta e naviga alla vista collegata (gestito dal chiamante).
export default function NotificationBell({ items, unreadCount, onOpenItem, onMarkAllRead, userId }) {
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
          <PushRow userId={userId} />
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
