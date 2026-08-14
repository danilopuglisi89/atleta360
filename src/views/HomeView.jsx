import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer } from "recharts";
import { C, font, display } from "../theme";
import { CORE } from "../skills";
import { resolveAthleteId } from "../data";
import { Card, tooltipStyle } from "../components/ui";
import Classifica from "../components/Classifica";
import { MotivationCard } from "../components/bits";
import NextEventCard from "../components/NextEventCard";
import WeeklyChallengeCard from "../components/WeeklyChallengeCard";
import MissionCard from "../components/MissionCard";
import PollsCard from "../components/PollsCard";
import PhotoAlbumCard from "../components/PhotoAlbumCard";
import DailyMomentCard from "../components/DailyMomentCard";
import TriviaPill from "../components/TriviaPill";
import QuizCard from "../components/QuizCard";
import WeeklyRecapCard from "../components/WeeklyRecapCard";
import { useTodaysBirthdays } from "../birthdays";

export default function HomeView({ d, auth, onOpenCard }) {
  const { NOMI, atleti, overall, RANK, TEAM_AVG, lastPeriod } = d;
  const restricted = !!auth?.restricted;
  const myScores = restricted && auth?.athleteId ? atleti[auth.athleteId]?.scores : null;
  const myAthleteId = restricted ? resolveAthleteId(d, auth?.athleteId) : null;
  const birthdays = useTodaysBirthdays();

  return (
    <div>
      {birthdays.length > 0 && (
        <div className="a360-reveal a360-noprint" style={{ background: "linear-gradient(120deg, #FFE9D5 0%, #FFF3E6 100%)", border: "1px solid #FFC98A", borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🎂</span>
          <span style={{ ...font, fontSize: 14, color: "#7A3E00" }}>
            Oggi è il compleanno di <b>{birthdays.join(", ")}</b>! Fatele gli auguri 🎉
          </span>
        </div>
      )}

      <MotivationCard />
      <TriviaPill />
      {restricted && <MissionCard uid={auth?.uid} athleteId={myAthleteId} />}
      <NextEventCard uid={auth?.uid} />
      {restricted && myScores && <WeeklyChallengeCard scores={myScores} />}
      {restricted && <WeeklyRecapCard uid={auth?.uid} />}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        {[
          { l: "Atlete monitorate", v: NOMI.length },
          { l: "Focus allenati", v: CORE.length },
          { l: "Media squadra", v: (NOMI.reduce((a, n) => a + overall(n), 0) / Math.max(NOMI.length, 1)).toFixed(1) },
          { l: "Ultimo rilevamento", v: lastPeriod },
        ].map((s) => (
          <div key={s.l} style={{ flex: "1 1 140px", background: C.card, border: `1px solid ${C.grid}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ ...display, fontSize: 26, fontWeight: 700, color: C.ink }}>{s.v}</div>
            <div style={{ ...font, fontSize: 12.5, color: C.muted, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        <Card title="Profilo medio della squadra" subtitle="Media delle competenze su tutte le atlete">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={TEAM_AVG} outerRadius="72%">
              <PolarGrid stroke={C.grid} />
              <PolarAngleAxis dataKey="skill" tick={{ fill: C.muted, fontSize: 11, ...font }} />
              <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
              <Radar name="Media" dataKey="valore" stroke={C.navy2} fill={C.navy2} fillOpacity={0.28} strokeWidth={2} />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Classifica generale" subtitle="Tocca un nome per vedere il profilo">
          <Classifica RANK={RANK} overall={overall} onOpen={onOpenCard} />
        </Card>
      </div>

      <DailyMomentCard uid={auth?.uid} />
      <QuizCard uid={auth?.uid} />
      <PollsCard uid={auth?.uid} isStaff={auth?.isStaff} />
      <PhotoAlbumCard uid={auth?.uid} isStaff={auth?.isStaff} />
    </div>
  );
}
