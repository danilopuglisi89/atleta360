import { useEffect, useMemo, useRef } from "react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Printer } from "lucide-react";
import { C, font, display, ringForScore } from "../theme";
import { SKILLS, SHORT, SKILL_META } from "../skills";
import { Card, Row, InitialsCircle, StatusBox, Select, tooltipStyle, PrintStamp } from "../components/ui";
import { BadgeStrip } from "../components/bits";
import { computeBadges } from "../badges";
import { levelFor } from "../gamification";
import { useGoals } from "../goals";
import { fireConfetti } from "../effects";
import { Avatar } from "../PersonalArea";
import ShareCard from "../ShareCard";
import CoachChat from "../CoachChat";
import GoalsCard from "../components/GoalsCard";
import SelfAssessmentCard from "../components/SelfAssessmentCard";

export default function ProfiloView({ d, auth, target, onOpenFullProfile, onReload }) {
  const { NOMI, atleti, overall, storico } = d;
  const restricted = !!auth?.restricted;
  const myId = auth?.athleteId;
  const firstName = auth?.firstName || "";
  const avatarUrl = auth?.avatarUrl || "";

  // Le atlete vedono SOLO il proprio profilo. Lo staff sceglie dalla rosa
  // (menu a tendina o "Vedi scheda completa" dalla card di un'atleta).
  const sel = restricted ? myId : (target && atleti[target] ? target : NOMI[0]);
  const hasData = !!atleti[sel];
  const personal = restricted;                    // l'atleta guarda sempre sé stessa
  const { goals, addGoal, removeGoal } = useGoals(atleti[sel]?.athleteId);

  // Rileva un miglioramento tra gli ultimi due rilevamenti (per i coriandoli).
  const improvement = useMemo(() => {
    const hist = storico?.[sel] || [];
    if (hist.length < 2) return null;
    const a = hist[hist.length - 2], b = hist[hist.length - 1];
    const ov = (e) => { const vs = SKILLS.map((k) => e[k]).filter((v) => typeof v === "number"); return vs.length ? vs.reduce((x, y) => x + y, 0) / vs.length : 0; };
    const diff = ov(b) - ov(a);
    if (diff <= 0) return null;
    let best = null, bestD = 0;
    SKILLS.forEach((k) => { const dd = (b[k] ?? 0) - (a[k] ?? 0); if (dd > bestD) { bestD = dd; best = k; } });
    return { diff: Math.round(diff * 10) / 10, skill: best ? SHORT[best] : null };
  }, [sel, storico]);

  // Coriandoli solo quando l'atleta apre il PROPRIO profilo migliorato.
  const firedRef = useRef(null);
  useEffect(() => {
    if (personal && hasData && improvement && firedRef.current !== sel) {
      firedRef.current = sel;
      const t = setTimeout(() => fireConfetti(), 350);
      return () => clearTimeout(t);
    }
  }, [sel, personal, hasData, improvement]);

  // Atleta "semplice" senza profilo collegato / senza rilevamenti.
  if (restricted && (!myId || !atleti[myId])) {
    return (
      <StatusBox
        title={firstName ? `Ciao ${firstName}!` : "Profilo non ancora disponibile"}
        message={myId
          ? "Non risultano ancora rilevamenti per il tuo profilo: chiedi al mister di compilare il modulo."
          : "Il tuo profilo non è ancora stato collegato dallo staff. Riprova più tardi o contatta lo staff."}
      />
    );
  }

  const scores = atleti[sel].scores;
  const nota = atleti[sel].nota;
  const position = atleti[sel].position;
  const scoreRing = ringForScore(overall(sel));
  const badges = computeBadges(d, sel);
  const level = levelFor(overall(sel));
  const teamAvg = (k) => Math.round((NOMI.reduce((a, m) => a + (atleti[m].scores[k] ?? 0), 0) / Math.max(NOMI.length, 1)) * 10) / 10;
  const radar = SKILLS.map((k) => ({ skill: SHORT[k], valore: scores[k] ?? 0, media: teamAvg(k), full: 10 }));
  const ranked = SKILLS.map((k) => ({ k, v: scores[k] ?? 0 })).sort((a, b) => b.v - a.v);
  const top = ranked.slice(0, 3), bottom = ranked.slice(-3).reverse();

  return (
    <div className="a360-print-area">
      <div className="a360-print-only" style={{ ...display, fontSize: 20, fontWeight: 700, color: C.navy, marginBottom: 2 }}>
        Atleta360 — Scheda soft skill
      </div>
      <div className="a360-print-only" style={{ ...font, fontSize: 13.5, color: C.muted, marginBottom: 18 }}>
        {sel}{position ? ` · ${position}` : ""}
      </div>

      {personal && firstName && (
        <div style={{ ...display, fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 14 }}>
          Ciao {firstName}! 👋 <span style={{ ...font, fontSize: 14, fontWeight: 400, color: C.muted }}>Ecco il tuo profilo.</span>
        </div>
      )}

      {personal && improvement && (
        <div className="a360-reveal" style={{ display: "flex", alignItems: "center", gap: 10, background: "linear-gradient(120deg, #DDF3E7 0%, #FFF3E6 100%)",
          border: "1px solid #B7E3C9", borderRadius: 14, padding: "12px 16px", marginBottom: 18 }}>
          <span style={{ fontSize: 24 }}>🎉</span>
          <div style={{ ...font, fontSize: 14, color: "#0F5A38", lineHeight: 1.4 }}>
            <b style={{ ...display, color: "#0F7A4E" }}>Sei cresciuta{improvement.skill ? ` in ${improvement.skill}` : ""}!</b>{" "}
            +{improvement.diff} di media dall'ultimo rilevamento. Continua così! 💪
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {(personal && avatarUrl)
          ? <Avatar url={avatarUrl} name={firstName || sel} size={44} ring={scoreRing} />
          : <InitialsCircle name={sel} size={44} ring={scoreRing} />}
        <span style={{ ...font, fontSize: 13, color: C.muted }}>Atleta</span>
        {restricted
          ? <span style={{ ...display, fontSize: 15, fontWeight: 600, color: C.ink }}>{sel}</span>
          : <Select value={sel} onChange={onOpenFullProfile} options={NOMI} className="a360-noprint" />}
        {position && <span style={{ ...font, fontSize: 12, fontWeight: 600, color: C.navy2, background: C.surface, border: `1px solid ${C.grid}`, padding: "5px 11px", borderRadius: 99 }}>{position}</span>}
        <span title="Livello calcolato dal punteggio complessivo" style={{ ...font, fontSize: 12, fontWeight: 600, color: C.orange, background: C.orangeSoft, padding: "5px 11px", borderRadius: 99, display: "inline-flex", alignItems: "center", gap: 5 }}>
          {level.emoji} {level.label}
        </span>
        <ShareCard name={sel} position={position} scores={scores} keys={SKILLS} SHORT={SHORT} overall={overall(sel)} avatarUrl={personal ? avatarUrl : ""} />
        <button className="a360-noprint" onClick={() => window.print()}
          style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 500,
            padding: "9px 13px", borderRadius: 10, border: `1px solid ${C.grid}`, background: "#fff", color: C.ink, cursor: "pointer" }}>
          <Printer size={16} /> Stampa / PDF
        </button>
        <div style={{ marginLeft: "auto", ...display, fontSize: 13, color: C.muted }}>
          Punteggio complessivo <b style={{ color: C.orange, fontSize: 20, marginLeft: 6 }}>{overall(sel).toFixed(1)}</b>
        </div>
      </div>

      {badges.length > 0 && (
        <Card title={personal ? "I tuoi traguardi" : "Traguardi"} subtitle={personal ? "Riconoscimenti calcolati dai tuoi rilevamenti" : `Riconoscimenti di ${sel}`} style={{ marginBottom: 20 }}>
          <BadgeStrip badges={badges} />
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        <Card title="Profilo a 360°" subtitle="Competenze dell'atleta a confronto con la media squadra">
          <ResponsiveContainer width="100%" height={330}>
            <RadarChart data={radar} outerRadius="72%">
              <PolarGrid stroke={C.grid} />
              <PolarAngleAxis dataKey="skill" tick={{ fill: C.muted, fontSize: 11, ...font }} />
              <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
              <Radar name="Media squadra" dataKey="media" stroke={C.navy2} fill={C.navy2} fillOpacity={0.06} strokeWidth={1.5} strokeDasharray="4 4" />
              <Radar name={sel} dataKey="valore" stroke={C.orange} fill={C.orange} fillOpacity={0.35} strokeWidth={2} dot={{ r: 2.5, fill: C.orange }} />
              <Legend wrapperStyle={{ ...font, fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card title="Punti di forza">
            {top.map((s) => <Row key={s.k} label={s.k} value={s.v} color={C.orange} />)}
          </Card>
          <Card title="Aree di crescita">
            {bottom.map((s) => <Row key={s.k} label={s.k} value={s.v} color={C.navy2} />)}
          </Card>
        </div>
      </div>

      <GoalsCard goals={goals} scores={scores} editable={personal} onAdd={addGoal} onRemove={removeGoal} />

      <SelfAssessmentCard athleteId={atleti[sel]?.athleteId} misterScores={scores} self={atleti[sel]?.self} editable={personal} onSaved={onReload} />

      {nota && (
        <Card title="Nota del mister" subtitle={`Ultimo rilevamento`} style={{ marginTop: 20 }}>
          <div style={{ ...font, fontSize: 14, color: C.ink, lineHeight: 1.6, background: C.surface, borderRadius: 12, padding: "14px 16px", borderLeft: `3px solid ${C.orange}` }}>
            {nota}
          </div>
        </Card>
      )}

      <PrintStamp label={sel} />

      <CoachChat
        subtitle={`Consigli sulle competenze allenate di ${sel}`}
        suggestions={[
          "Come posso migliorare il mio punto più debole?",
          "Dammi un esercizio per resettare dopo un errore.",
          "Una routine mentale prima del servizio nei punti caldi?",
        ]}
        payload={{
          athlete: {
            id: sel, scores,
            goals: goals.map((g) => ({ skill: SHORT[g.skill_key] || g.skill_key, target: g.target, current: scores[g.skill_key] ?? 0 })),
          },
          skills: SKILL_META.map((s) => ({ title: s.title, desc: s.description })),
        }}
      />
    </div>
  );
}
