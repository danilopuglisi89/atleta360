// Prossimo impegno in evidenza (Home): countdown, luogo, conferma presenza
// al volo. Sparisce da sola se non c'è nulla in programma o se il
// calendario non è ancora attivo (nessun errore mostrato qui: la vista
// Calendario dedicata già spiega come attivarlo).
import { useMemo, useState } from "react";
import { CalendarDays, MapPin, CheckCircle2, XCircle, Wind } from "lucide-react";
import { C, font, display } from "../theme";
import { useCalendar } from "../calendar";
import PreMatchRoutine from "./PreMatchRoutine";
import { usePregameCheers } from "../rituals";

const CHEER_EMOJI = ["🔥", "💪", "🏐", "😤", "🙌", "❤️"];

const KIND_LABEL = { match: "Partita", training: "Allenamento", other: "Evento" };
const fmtTime = (iso) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
const mapsUrl = (loc) => `https://maps.google.com/?q=${encodeURIComponent(loc)}`;

function countdownLabel(iso) {
  const now = new Date(), d = new Date(iso);
  const days = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
  if (days <= 0) return "Oggi";
  if (days === 1) return "Domani";
  return `Tra ${days} giorni`;
}

export default function NextEventCard({ uid, showPrematch = true }) {
  const cal = useCalendar(uid);
  const [routine, setRoutine] = useState(false);
  const next = useMemo(() => {
    if (!cal.events) return null;
    const now = new Date();
    return cal.events.find((e) => !e.cancelled && new Date(e.starts_at) >= now) || null;
  }, [cal.events]);

  // "Il grido pre-partita": spazio comune che si apre nelle 2 ore prima di
  // una partita — hook chiamato sempre (Rules of Hooks), attivo solo quando serve.
  const cheers = usePregameCheers(next?.id, uid);
  const isPregameWindow = showPrematch && next && next.kind === "match" && (new Date(next.starts_at) - new Date()) <= 2 * 3600e3;

  if (cal.error || !next) return null;

  const rs = cal.rsvps.filter((r) => r.event_id === next.id);
  const myRsvp = rs.find((r) => r.user_id === uid)?.status || null;

  return (
    <div id="a360-next-event" className="a360-reveal a360-noprint" style={{ background: `linear-gradient(120deg, ${C.navy2} 0%, ${C.navy} 100%)`, borderRadius: 16, padding: "18px 20px", marginBottom: 16, color: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, ...font, fontSize: 11.5, color: C.orange, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" }}>
        <CalendarDays size={14} /> Prossimo impegno
      </div>
      <div style={{ ...display, fontSize: 19, fontWeight: 700, marginTop: 6 }}>
        {KIND_LABEL[next.kind] || "Evento"}{next.title ? ` · ${next.title}` : ""}
      </div>
      <div style={{ ...font, fontSize: 14, marginTop: 4, opacity: 0.92 }}>
        {countdownLabel(next.starts_at)} alle {fmtTime(next.starts_at)}
      </div>
      {next.location && (
        <a href={mapsUrl(next.location)} target="_blank" rel="noreferrer"
          style={{ ...font, fontSize: 13, color: "#fff", opacity: 0.85, display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, textDecoration: "none" }}>
          <MapPin size={13} /> {next.location}
        </a>
      )}
      {uid && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={() => cal.setRsvp(next.id, "yes")}
            style={{ ...font, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, padding: "7px 12px", borderRadius: 9, cursor: "pointer",
              border: "none", background: myRsvp === "yes" ? "#fff" : "rgba(255,255,255,0.16)", color: myRsvp === "yes" ? C.navy : "#fff" }}>
            <CheckCircle2 size={14} /> Ci sarò
          </button>
          <button onClick={() => cal.setRsvp(next.id, "no")}
            style={{ ...font, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, padding: "7px 12px", borderRadius: 9, cursor: "pointer",
              border: "none", background: myRsvp === "no" ? "#fff" : "rgba(255,255,255,0.16)", color: myRsvp === "no" ? C.navy : "#fff" }}>
            <XCircle size={14} /> Non ci sarò
          </button>
          {next.kind === "match" && showPrematch && (
            <button onClick={() => setRoutine(true)}
              style={{ ...font, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, padding: "7px 12px", borderRadius: 9, cursor: "pointer",
                border: "none", background: C.orange, color: "#fff" }}>
              <Wind size={14} /> Prepara la testa
            </button>
          )}
        </div>
      )}
      {isPregameWindow && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.15)" }}>
          <div style={{ ...font, fontSize: 11.5, color: C.orange, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Il grido pre-partita 🏐</div>
          {cheers.mine ? (
            <div style={{ ...font, fontSize: 13, color: "#fff" }}>Hai caricato la squadra: {cheers.mine.emoji}</div>
          ) : (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CHEER_EMOJI.map((e) => (
                <button key={e} onClick={() => cheers.send(e)}
                  style={{ fontSize: 20, padding: "6px 9px", borderRadius: 9, border: "none", background: "rgba(255,255,255,0.14)", cursor: "pointer" }}>
                  {e}
                </button>
              ))}
            </div>
          )}
          {cheers.rows.length > 0 && (
            <div style={{ ...font, fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 8 }}>
              {cheers.rows.map((r) => r.emoji).join(" ")} · {cheers.rows.length} {cheers.rows.length === 1 ? "carica" : "cariche"}
            </div>
          )}
        </div>
      )}

      {routine && <PreMatchRoutine onClose={() => setRoutine(false)} />}
    </div>
  );
}
