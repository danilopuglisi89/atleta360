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
import VideoClipsCard from "../components/VideoClipsCard";
import DailyMomentCard from "../components/DailyMomentCard";
import DailyPill from "../components/DailyPill";
import TodayStrip from "../components/TodayStrip";
import TeamFeedCard from "../components/TeamFeedCard";
import FigurineAlbumCard from "../components/FigurineAlbumCard";
import SeasonCapsuleCard from "../components/SeasonCapsuleCard";
import WeekSongCard from "../components/WeekSongCard";
import MondayNudge from "../components/MondayNudge";
import MemoryCard from "../components/MemoryCard";
import QuizCard from "../components/QuizCard";
import { ShareButton } from "../components/ShareSheet";
import WeeklyRecapCard from "../components/WeeklyRecapCard";
import { useTodaysBirthdays } from "../birthdays";
import { activeSeason } from "../seasons";
import MatchdayBanner from "../components/MatchdayBanner";
import StreakBuddyCard from "../components/StreakBuddyCard";
import TeamPetCard from "../components/TeamPetCard";
import PostMatchCheckinCard from "../components/PostMatchCheckinCard";
import HomeCustomizer, { saveHomeHidden } from "../components/HomeCustomizer";
import { useWeeklyQuiz } from "../quiz";
import { computeBadges } from "../badges";
import { useState } from "react";

export default function HomeView({ d, auth, onOpenCard, onOpenFullProfile }) {
  const { NOMI, atleti, overall, RANK, TEAM_AVG, lastPeriod, roster } = d;
  const restricted = !!auth?.restricted;
  const myScores = restricted && auth?.athleteId ? atleti[auth.athleteId]?.scores : null;
  const myAthleteId = restricted ? resolveAthleteId(d, auth?.athleteId) : null;
  const birthdays = useTodaysBirthdays();
  const season = activeSeason();
  const { mine: quizMine } = useWeeklyQuiz(auth?.uid);
  const myBadgesCount = restricted && auth?.athleteId && atleti[auth.athleteId] ? computeBadges(d, auth.athleteId).length : 0;
  const [hidden, setHidden] = useState(auth?.homeHidden || []);
  const toggleCard = (id) => {
    const next = hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id];
    setHidden(next);
    saveHomeHidden(next);
  };

  const goCheckin = () => {
    onOpenFullProfile?.();
    setTimeout(() => document.getElementById("a360-checkin")?.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
  };
  const goQuiz = () => document.getElementById("a360-quiz")?.scrollIntoView({ behavior: "smooth", block: "center" });
  const goTeam = () => document.getElementById("a360-classifica")?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div>
      <MatchdayBanner uid={auth?.uid} />

      {restricted && (
        <div className="a360-noprint" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <HomeCustomizer hidden={hidden} onToggle={toggleCard} />
        </div>
      )}

      {season && (
        <div className="a360-reveal a360-noprint" style={{ background: "linear-gradient(120deg, #2A1B4D 0%, #4A2E7A 100%)", borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>{season.emoji}</span>
          <span style={{ ...font, fontSize: 13.5, color: "#fff" }}>{season.banner}</span>
        </div>
      )}

      {birthdays.length > 0 && (
        <div className="a360-reveal a360-noprint" style={{ background: "linear-gradient(120deg, #FFE9D5 0%, #FFF3E6 100%)", border: "1px solid #FFC98A", borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🎂</span>
          <span style={{ ...font, fontSize: 14, color: "#7A3E00" }}>
            Oggi è il compleanno di <b>{birthdays.join(", ")}</b>! Fatele gli auguri 🎉
          </span>
        </div>
      )}

      {restricted && <TodayStrip uid={auth?.uid} athleteId={myAthleteId} onGoCheckin={goCheckin} onGoQuiz={goQuiz} />}
      {restricted && <MondayNudge onGoTeam={goTeam} />}
      {restricted && <PostMatchCheckinCard uid={auth?.uid} athleteId={myAthleteId} />}
      {restricted && <MemoryCard history={d.storico?.[auth?.athleteId]} keys={d.keys} currentOverall={myScores ? overall(auth.athleteId) : null} />}

      <MotivationCard />
      {!hidden.includes("song") && <WeekSongCard />}
      <DailyPill quizDone={restricted ? quizMine : true} onOpenQuiz={goQuiz} />
      {restricted && !hidden.includes("mission") && <MissionCard uid={auth?.uid} athleteId={myAthleteId} />}
      <NextEventCard uid={auth?.uid} />
      {restricted && myScores && !hidden.includes("weeklyChallenge") && <WeeklyChallengeCard scores={myScores} />}
      {restricted && !hidden.includes("weeklyRecap") && <WeeklyRecapCard uid={auth?.uid} athleteId={myAthleteId} name={auth?.athleteId || auth?.firstName}
        avatarUrl={auth?.avatarUrl} bgUrl={auth?.cardBg} bgStyle={auth?.cardBgStyle} badgesCount={myBadgesCount} />}
      {restricted && !hidden.includes("streakBuddy") && <StreakBuddyCard myAthleteId={myAthleteId} roster={roster} />}

      {restricted && !hidden.includes("figurine") && <FigurineAlbumCard uid={auth?.uid} roster={roster} />}
      {restricted && !hidden.includes("season") && <SeasonCapsuleCard uid={auth?.uid} />}

      <TeamPetCard />
      <TeamFeedCard />

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
          {NOMI.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <ShareButton kind="team" label="Condividi la squadra" variant="ghost"
                data={{
                  teamName: "Oasi Volley", keys: CORE, SHORT: d.SHORT, athleteCount: NOMI.length, lastPeriod,
                  avg: Object.fromEntries(CORE.map((k) => [k,
                    Math.round((NOMI.reduce((a, n) => a + (atleti[n].scores[k] ?? 0), 0) / Math.max(NOMI.length, 1)) * 10) / 10])),
                }} />
            </div>
          )}
        </Card>

        <Card id="a360-classifica" title="Classifica generale" subtitle="Tocca un nome per vedere il profilo">
          <Classifica RANK={RANK} overall={overall} onOpen={onOpenCard} />
        </Card>
      </div>

      {restricted && !hidden.includes("dailyMoment") && <DailyMomentCard uid={auth?.uid} />}
      {restricted && !hidden.includes("quiz") && <QuizCard uid={auth?.uid} />}
      <PollsCard uid={auth?.uid} isStaff={auth?.isStaff} />
      <PhotoAlbumCard uid={auth?.uid} isStaff={auth?.isStaff} />
      <VideoClipsCard uid={auth?.uid} isStaff={auth?.isStaff} />
    </div>
  );
}
