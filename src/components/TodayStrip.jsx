// "Il mio oggi in una riga": streak sempre visibile, prossimo impegno con
// meteo, e cosa manca ancora da fare oggi/questa settimana — tutto quello
// che serve per aprire l'app, capire in 3 secondi, richiudere soddisfatta.
import { useEffect, useMemo, useState } from "react";
import { Flame, CalendarDays, CheckCircle2, HelpCircle } from "lucide-react";
import { C, font, display } from "../theme";
import { useParticipation } from "../participation";
import { useCalendar } from "../calendar";
import { useCheckins } from "../wellbeing";
import { useWeeklyQuiz } from "../quiz";
import { weatherFor } from "../weather";

const KIND_LABEL = { match: "Partita", training: "Allenamento", other: "Impegno" };
const isToday = (iso) => {
  const d = new Date(iso), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};
const fmtTime = (iso) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

export default function TodayStrip({ uid, athleteId, onGoCheckin, onGoQuiz }) {
  const { streak } = useParticipation(athleteId);
  const cal = useCalendar(uid);
  const { today: checkedIn } = useCheckins(athleteId);
  const { mine: quizDone, loading: quizLoading } = useWeeklyQuiz(uid);
  const [weather, setWeather] = useState(null);

  const todaysEvent = useMemo(() => {
    if (!cal.events) return null;
    return cal.events.find((e) => !e.cancelled && isToday(e.starts_at)) || null;
  }, [cal.events]);

  useEffect(() => {
    if (!todaysEvent?.location) { setWeather(null); return; }
    let alive = true;
    weatherFor(todaysEvent.location, todaysEvent.starts_at).then((w) => { if (alive) setWeather(w); });
    return () => { alive = false; };
  }, [todaysEvent?.id]);

  if (!athleteId) return null;

  const todos = [];
  if (!checkedIn) todos.push({ key: "checkin", label: "Check-in di oggi", icon: HelpCircle, onClick: onGoCheckin });
  if (!quizLoading && quizDone === null) todos.push({ key: "quiz", label: "Quiz della settimana", icon: HelpCircle, onClick: onGoQuiz });

  return (
    <div className="a360-reveal a360-noprint" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16, background: C.card, border: `1px solid ${C.grid}`, borderRadius: 14, padding: "12px 16px" }}>
      {streak >= 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, ...display, fontSize: 15, fontWeight: 700, color: "#D2691E" }}>
          <Flame size={17} /> {streak}
        </div>
      )}

      {todaysEvent && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, ...font, fontSize: 13, color: C.ink, fontWeight: 600 }}>
          <CalendarDays size={14} color={C.navy2} />
          {KIND_LABEL[todaysEvent.kind] || "Impegno"} {fmtTime(todaysEvent.starts_at)}
          {weather && <span style={{ color: C.muted, fontWeight: 500 }}>{weather.emoji} {weather.tempMax}°</span>}
        </div>
      )}

      {todos.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>
          {todos.map((t) => (
            <button key={t.key} onClick={t.onClick}
              style={{ ...font, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, padding: "6px 11px", borderRadius: 99, cursor: "pointer",
                border: `1px solid ${C.orange}`, background: C.orangeSoft, color: C.orange }}>
              <t.icon size={12} /> {t.label}
            </button>
          ))}
        </div>
      )}

      {todos.length === 0 && checkedIn && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: "auto", ...font, fontSize: 12, color: "#0F7A4E", fontWeight: 600 }}>
          <CheckCircle2 size={14} /> Tutto fatto per oggi
        </div>
      )}
    </div>
  );
}
