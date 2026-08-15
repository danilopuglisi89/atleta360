// "Matchday mode": nei giorni di partita l'app si trasforma da sola,
// nessun dato nuovo — solo il calendario già esistente vestito a festa.
// L'effetto wow costa poco: i dati ci sono già tutti.
import { useEffect, useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { C, font, display } from "../theme";
import { useCalendar } from "../calendar";

const isToday = (iso) => {
  const d = new Date(iso), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};
const fmtTime = (iso) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
const mapsUrl = (loc) => `https://maps.google.com/?q=${encodeURIComponent(loc)}`;

function useCountdown(target) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tick = () => {
      const diff = new Date(target) - new Date();
      if (diff <= 0) { setLabel("È ORA! 🏐"); return; }
      const h = Math.floor(diff / 3600e3), m = Math.floor((diff % 3600e3) / 60e3);
      setLabel(h > 0 ? `tra ${h}h ${m}m` : `tra ${m} min`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [target]);
  return label;
}

export default function MatchdayBanner({ uid }) {
  const cal = useCalendar(uid);
  const match = (cal.events || []).find((e) => e.kind === "match" && !e.cancelled && isToday(e.starts_at));
  const countdown = useCountdown(match?.starts_at || Date.now() + 999999999);

  if (!match) return null;

  const rs = cal.rsvps.filter((r) => r.event_id === match.id);
  const myRsvp = rs.find((r) => r.user_id === uid)?.status || null;

  return (
    <div className="a360-reveal a360-noprint" style={{
      background: "linear-gradient(135deg, #7A0C1E 0%, #B4232A 55%, #E8542E 100%)",
      borderRadius: 18, padding: "20px 22px", marginBottom: 16, color: "#fff", position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.12, backgroundImage: "repeating-linear-gradient(45deg, #fff 0 2px, transparent 2px 26px)" }} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, ...font, fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" }}>
          <CalendarDays size={15} /> Matchday
        </div>
        <div style={{ ...display, fontSize: 24, fontWeight: 700, marginTop: 6 }}>
          {match.title || "Partita di oggi"}
        </div>
        <div style={{ ...display, fontSize: 30, fontWeight: 800, marginTop: 6, letterSpacing: -0.5 }}>
          {countdown}
        </div>
        <div style={{ ...font, fontSize: 13, opacity: 0.9, marginTop: 4 }}>ore {fmtTime(match.starts_at)}</div>
        {match.location && (
          <a href={mapsUrl(match.location)} target="_blank" rel="noreferrer"
            style={{ ...font, fontSize: 13, color: "#fff", opacity: 0.9, display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, textDecoration: "none" }}>
            <MapPin size={13} /> {match.location}
          </a>
        )}
        {uid && (
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={() => cal.setRsvp(match.id, "yes")}
              style={{ ...font, fontSize: 12.5, fontWeight: 700, padding: "8px 14px", borderRadius: 9, cursor: "pointer",
                border: "none", background: myRsvp === "yes" ? "#fff" : "rgba(255,255,255,0.18)", color: myRsvp === "yes" ? "#B4232A" : "#fff" }}>
              Ci sarò 🔥
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
