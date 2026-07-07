import { useState, useEffect, useMemo } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer,
} from "recharts";
import { Home, User, Users, TrendingUp, Info, Menu, X, MessageCircle, ShieldCheck, LogOut, RefreshCw, Printer, ClipboardList, Sparkles, ClipboardPlus } from "lucide-react";
import { C, font, display } from "./theme";
import { AuthProvider, useAuth } from "./auth";
import { supabaseConfigured } from "./supabaseClient";
import { fetchModel } from "./data";
import AuthScreen, { ResetPasswordScreen } from "./AuthScreen";
import AdminPanel from "./AdminPanel";
import CoachChat from "./CoachChat";
import NewAssessment from "./NewAssessment";

const SERIES = ["#FF7A18", "#17297A", "#16A6A6"];              // confronto atlete
const CORE_COLORS = ["#FF7A18", "#17297A", "#16A6A6", "#8B5CF6", "#E11D74", "#0EA5E9"]; // andamento

/* ============================================================
   FOCUS / COMPETENZE — ora arrivano da Supabase (tabella skills).
   Questi riferimenti a livello di modulo vengono popolati dal modello
   caricato in Dashboard, prima che le viste vengano renderizzate.
   ============================================================ */
let CORE = [];        // chiavi dei focus attivi (ordinati)
let SKILLS = [];      // alias di CORE (compatibilità viste)
let SHORT = {};       // key -> etichetta breve
let TITLE = {};       // key -> titolo esteso
let SKILL_META = [];  // [{ key, title, short, description }]
const ADDON = [];     // non più usato (focus tutti uguali)

function bindSkills(model) {
  CORE = model.keys;
  SKILLS = model.keys;
  SHORT = model.SHORT;
  TITLE = model.TITLE;
  SKILL_META = model.skills;
}

/* ============================================================
   PICCOLI COMPONENTI
   ============================================================ */
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

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ ...font, fontSize: 14, color: C.ink, background: "#fff", border: `1px solid ${C.grid}`, borderRadius: 10, padding: "9px 12px", outline: "none", cursor: "pointer", minWidth: 180 }}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

const tooltipStyle = { background: C.navy, border: "none", borderRadius: 12, color: "#fff", fontSize: 12, ...font, boxShadow: "0 8px 24px rgba(10,22,80,0.25)" };

/* ============================================================
   STATI: caricamento / errore / vuoto
   ============================================================ */
function StatusBox({ title, message, tone = "info" }) {
  const accent = tone === "error" ? "#E11D48" : C.navy2;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.grid}`, borderRadius: 16, borderLeft: `4px solid ${accent}`, padding: "26px 24px", maxWidth: 560 }}>
      <div style={{ ...display, fontSize: 16, fontWeight: 600, color: C.ink }}>{title}</div>
      <div style={{ ...font, fontSize: 14, color: C.muted, marginTop: 8, lineHeight: 1.6 }}>{message}</div>
    </div>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  const sep = <span aria-hidden style={{ color: C.grid }}>·</span>;
  const waText = encodeURIComponent("Ciao Danilo, ti scrivo dalla dashboard Atleta360 di Oasi Volley.");
  return (
    <footer style={{ marginTop: "auto", width: "100%", padding: "0 clamp(18px, 4vw, 34px) clamp(18px, 4vw, 28px)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", borderTop: `1px solid ${C.grid}`, paddingTop: 18 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "6px 14px",
          textAlign: "center", ...font, fontSize: 12.5, color: C.muted }}>
          <span>© {year} <b style={{ color: C.ink, fontWeight: 600 }}>Danilo Puglisi</b> — Consulente e Formatore</span>
          {sep}
          <a href="https://www.danilopuglisi.com" target="_blank" rel="noopener noreferrer"
            style={{ color: C.navy2, textDecoration: "none", fontWeight: 500 }}>www.danilopuglisi.com</a>
          {sep}
          <a href={`https://wa.me/393770870217?text=${waText}`} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#1FA855", textDecoration: "none", fontWeight: 600 }}>
            <MessageCircle size={15} /> WhatsApp
          </a>
        </div>
        <div style={{ textAlign: "center", ...font, fontSize: 11.5, color: C.muted, opacity: 0.75, marginTop: 8 }}>
          Dashboard realizzata per Oasi Volley
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   VISTE
   ============================================================ */
function HomeView({ d }) {
  const { NOMI, overall, RANK, TEAM_AVG, lastPeriod } = d;
  const max = Math.max(...NOMI.map(overall));
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        {[
          { l: "Atlete monitorate", v: NOMI.length },
          { l: "Focus allenati", v: CORE.length },
          { l: "Media squadra", v: (NOMI.reduce((a, n) => a + overall(n), 0) / Math.max(NOMI.length, 1)).toFixed(1) },
          { l: "Ultimo rilevamento", v: lastPeriod },
        ].map((s) => (
          <div key={s.l} style={{ flex: "1 1 140px", background: C.card, border: `1px solid ${C.grid}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ ...display, fontSize: 26, fontWeight: 700, color: C.navy }}>{s.v}</div>
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

        <Card title="Classifica generale" subtitle="Punteggio medio complessivo per atleta">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {RANK.map((n, i) => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ ...display, fontWeight: 700, fontSize: 14, width: 22, color: i < 3 ? C.orange : C.muted }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ ...font, fontSize: 13.5, color: C.ink }}>{n}</span>
                    <span style={{ ...display, fontSize: 13.5, fontWeight: 600, color: C.navy }}>{overall(n).toFixed(1)}</span>
                  </div>
                  <div style={{ height: 7, background: C.surface, borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(overall(n) / max) * 100}%`, background: i < 3 ? C.orange : C.navy2, borderRadius: 99 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ProfiloView({ d, auth }) {
  const { NOMI, atleti, overall } = d;
  const restricted = !!auth?.restricted;
  const myId = auth?.athleteId;
  const firstName = auth?.firstName || "";
  const [n, setN] = useState(restricted ? myId : NOMI[0]);

  // Atleta "semplice": vede sempre e solo il proprio profilo.
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

  const sel = restricted ? myId : (atleti[n] ? n : NOMI[0]);
  const scores = atleti[sel].scores;
  const nota = atleti[sel].nota;
  const position = atleti[sel].position;
  const teamAvg = (k) => Math.round((NOMI.reduce((a, m) => a + (atleti[m].scores[k] ?? 0), 0) / Math.max(NOMI.length, 1)) * 10) / 10;
  const radar = SKILLS.map((k) => ({ skill: SHORT[k], valore: scores[k] ?? 0, media: teamAvg(k), full: 10 }));
  const ranked = SKILLS.map((k) => ({ k, v: scores[k] ?? 0 })).sort((a, b) => b.v - a.v);
  const top = ranked.slice(0, 3), bottom = ranked.slice(-3).reverse();

  return (
    <div className="a360-print-area">
      {restricted && firstName && (
        <div style={{ ...display, fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 14 }}>
          Ciao {firstName}! 👋 <span style={{ ...font, fontSize: 14, fontWeight: 400, color: C.muted }}>Ecco il tuo profilo.</span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ ...font, fontSize: 13, color: C.muted }}>Atleta</span>
        {restricted
          ? <span style={{ ...display, fontSize: 15, fontWeight: 600, color: C.ink }}>{sel}</span>
          : <Select value={sel} onChange={setN} options={NOMI} />}
        {position && <span style={{ ...font, fontSize: 12, fontWeight: 600, color: C.navy2, background: C.surface, border: `1px solid ${C.grid}`, padding: "5px 11px", borderRadius: 99 }}>{position}</span>}
        <button className="a360-noprint" onClick={() => window.print()}
          style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 500,
            padding: "9px 13px", borderRadius: 10, border: `1px solid ${C.grid}`, background: "#fff", color: C.ink, cursor: "pointer" }}>
          <Printer size={16} /> Stampa / PDF
        </button>
        <div style={{ marginLeft: "auto", ...display, fontSize: 13, color: C.muted }}>
          Punteggio complessivo <b style={{ color: C.orange, fontSize: 20, marginLeft: 6 }}>{overall(sel).toFixed(1)}</b>
        </div>
      </div>

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

      {nota && (
        <Card title="Nota del mister" subtitle={`Ultimo rilevamento`} style={{ marginTop: 20 }}>
          <div style={{ ...font, fontSize: 14, color: C.ink, lineHeight: 1.6, background: C.surface, borderRadius: 12, padding: "14px 16px", borderLeft: `3px solid ${C.orange}` }}>
            {nota}
          </div>
        </Card>
      )}

      <CoachChat
        subtitle={`Consigli sulle competenze allenate di ${sel}`}
        suggestions={[
          "Come posso migliorare il mio punto più debole?",
          "Dammi un esercizio per resettare dopo un errore.",
          "Una routine mentale prima del servizio nei punti caldi?",
        ]}
        payload={{ athlete: { id: sel, scores }, skills: SKILL_META.map((s) => ({ title: s.title, desc: s.description })) }}
      />
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ ...font, fontSize: 13.5, color: C.ink }}>{label}</span>
        <span style={{ ...display, fontSize: 13.5, fontWeight: 600, color }}>{value}/10</span>
      </div>
      <div style={{ height: 7, background: C.surface, borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value * 10}%`, background: color, borderRadius: 99 }} />
      </div>
    </div>
  );
}

function ConfrontoView({ d }) {
  const { NOMI, atleti } = d;
  const [sel, setSel] = useState(() => [NOMI[0], NOMI[1]].filter(Boolean));
  const toggle = (n) => setSel((s) => s.includes(n) ? s.filter((x) => x !== n) : (s.length < 3 ? [...s, n] : s));

  const radar = CORE.map((k) => {
    const row = { skill: SHORT[k] };
    sel.forEach((n) => (row[n] = atleti[n]?.scores[k] ?? 0));
    return row;
  });

  return (
    <div>
      <Card title="Seleziona le atlete da confrontare" subtitle="Fino a 3 profili in sovrapposizione" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {NOMI.map((n) => {
            const on = sel.includes(n);
            const idx = sel.indexOf(n);
            return (
              <button key={n} onClick={() => toggle(n)}
                style={{ ...font, fontSize: 13, padding: "8px 14px", borderRadius: 99, cursor: "pointer",
                  border: `1.5px solid ${on ? (SERIES[idx] || C.orange) : C.grid}`,
                  background: on ? (SERIES[idx] || C.orange) : "#fff",
                  color: on ? "#fff" : C.ink, fontWeight: on ? 600 : 400, transition: "all .15s" }}>
                {n}
              </button>
            );
          })}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        <Card title="Confronto profili (core)" subtitle="Le competenze fondamentali a confronto">
          <ResponsiveContainer width="100%" height={340}>
            <RadarChart data={radar} outerRadius="72%">
              <PolarGrid stroke={C.grid} />
              <PolarAngleAxis dataKey="skill" tick={{ fill: C.muted, fontSize: 11, ...font }} />
              <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
              {sel.map((n, i) => (
                <Radar key={n} name={n} dataKey={n} stroke={SERIES[i]} fill={SERIES[i]} fillOpacity={0.18} strokeWidth={2} />
              ))}
              <Legend wrapperStyle={{ ...font, fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Confronto per competenza" subtitle="Valori affiancati, competenza per competenza">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={radar} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
              <XAxis dataKey="skill" tick={{ fill: C.muted, fontSize: 10.5, ...font }} interval={0} angle={-18} textAnchor="end" height={54} />
              <YAxis domain={[0, 10]} tick={{ fill: C.muted, fontSize: 11, ...font }} />
              {sel.map((n, i) => (
                <Bar key={n} dataKey={n} name={n} fill={SERIES[i]} radius={[5, 5, 0, 0]} />
              ))}
              <Legend wrapperStyle={{ ...font, fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(10,22,80,0.04)" }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function AndamentoView({ d }) {
  const { NOMI, storico } = d;
  const [n, setN] = useState(NOMI[0]);
  const sel = storico[n] ? n : NOMI[0];
  const data = storico[sel];
  const single = data.length < 2;
  const lastI = data.length - 1;

  // Confronto tra due rilevamenti scelti (default: penultimo → ultimo).
  const [fromI, setFromI] = useState(Math.max(0, lastI - 1));
  const [toI, setToI] = useState(lastI);
  const fi = Math.min(fromI, lastI);
  const ti = Math.min(toI, lastI);
  const deltas = single ? [] : CORE.map((k) => ({
    k, short: SHORT[k],
    diff: Math.round(((data[ti][k] ?? 0) - (data[fi][k] ?? 0)) * 10) / 10,
  }));

  const note = data.filter((e) => e.nota).map((e) => ({ periodo: e.periodo, nota: e.nota }));

  // Chi è cresciuto di più: variazione della media dal primo all'ultimo rilevamento.
  const overallOf = (e) => {
    const vals = SKILLS.map((k) => e[k]).filter((v) => typeof v === "number");
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };
  const growth = NOMI.map((name) => {
    const h = storico[name];
    if (!h || h.length < 2) return null;
    return { name, g: Math.round((overallOf(h[h.length - 1]) - overallOf(h[0])) * 10) / 10 };
  }).filter(Boolean).sort((a, b) => b.g - a.g);

  const selStyle = { ...font, fontSize: 13, color: C.ink, background: "#fff", border: `1px solid ${C.grid}`, borderRadius: 9, padding: "7px 10px", cursor: "pointer" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ ...font, fontSize: 13, color: C.muted }}>Atleta</span>
        <Select value={sel} onChange={setN} options={NOMI} />
      </div>

      {!single && (
        <Card title="Confronto tra due rilevamenti" subtitle="Scegli due date e osserva la variazione competenza per competenza" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={{ ...font, fontSize: 13, color: C.muted }}>Dal</span>
            <select value={fi} onChange={(e) => setFromI(+e.target.value)} style={selStyle}>
              {data.map((e, i) => <option key={i} value={i}>{e.periodo || `#${i + 1}`}</option>)}
            </select>
            <span style={{ ...font, fontSize: 13, color: C.muted }}>al</span>
            <select value={ti} onChange={(e) => setToI(+e.target.value)} style={selStyle}>
              {data.map((e, i) => <option key={i} value={i}>{e.periodo || `#${i + 1}`}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {deltas.map(({ k, short, diff }) => {
              const up = diff > 0, down = diff < 0;
              const col = up ? "#0F7A4E" : down ? "#B4232A" : C.muted;
              const bg = up ? "#DDF3E7" : down ? "#FDECEC" : C.surface;
              return (
                <div key={k} style={{ ...font, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6,
                  background: bg, color: col, borderRadius: 99, padding: "6px 12px", fontWeight: 600 }}>
                  <span style={{ color: C.ink, fontWeight: 500 }}>{short}</span>
                  {up ? "▲" : down ? "▼" : "="} {diff > 0 ? `+${diff}` : diff}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card title="Evoluzione nel tempo" subtitle="Andamento delle competenze core rilevamento dopo rilevamento">
        {single && (
          <div style={{ ...font, fontSize: 13, color: C.muted, background: C.surface, borderRadius: 12, padding: 14, marginBottom: 16 }}>
            C'è un solo rilevamento per questa atleta: la curva comparirà appena il mister compilerà di nuovo il modulo.
          </div>
        )}
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
            <XAxis dataKey="periodo" tick={{ fill: C.muted, fontSize: 12, ...font }} />
            <YAxis domain={[0, 10]} tick={{ fill: C.muted, fontSize: 11, ...font }} />
            {CORE.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} name={SHORT[k]} stroke={CORE_COLORS[i % CORE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            ))}
            <Legend wrapperStyle={{ ...font, fontSize: 12 }} />
            <Tooltip contentStyle={tooltipStyle} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {growth.length > 0 && (
        <Card title="Chi è cresciuto di più" subtitle="Variazione del punteggio medio dal primo all'ultimo rilevamento" style={{ marginTop: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {growth.slice(0, 6).map(({ name, g }, i) => {
              const up = g > 0, down = g < 0;
              const col = up ? "#0F7A4E" : down ? "#B4232A" : C.muted;
              const bg = up ? "#DDF3E7" : down ? "#FDECEC" : C.surface;
              return (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ ...display, fontWeight: 700, fontSize: 14, width: 22, color: i < 3 ? C.orange : C.muted }}>{i + 1}</div>
                  <span style={{ ...font, fontSize: 14, color: C.ink, flex: 1 }}>{name}</span>
                  <span style={{ ...font, fontSize: 13, fontWeight: 600, color: col, background: bg, borderRadius: 99, padding: "5px 12px" }}>
                    {up ? "▲" : down ? "▼" : "="} {g > 0 ? `+${g}` : g}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {note.length > 0 && (
        <Card title="Note del mister" subtitle="Commenti rilevamento per rilevamento" style={{ marginTop: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {note.slice().reverse().map((e, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ ...display, fontSize: 12, fontWeight: 600, color: C.orange, background: C.orangeSoft, borderRadius: 8, padding: "3px 9px", whiteSpace: "nowrap" }}>{e.periodo}</span>
                <span style={{ ...font, fontSize: 13.5, color: C.ink, lineHeight: 1.55 }}>{e.nota}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function InfoView() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
      <Card title="I focus allenati" subtitle="Le competenze monitorate a ogni rilevamento">
        {SKILL_META.map((s) => (
          <div key={s.key} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: `1px solid ${C.grid}` }}>
            <div style={{ ...display, fontSize: 14, fontWeight: 600, color: C.navy }}>{s.title}</div>
            {s.description && <div style={{ ...font, fontSize: 13, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>{s.description}</div>}
          </div>
        ))}
      </Card>
      <Card title="Come funziona" subtitle="Gestione dei focus e dei rilevamenti">
        <div style={{ ...font, fontSize: 13.5, color: C.muted, lineHeight: 1.6, background: C.surface, borderRadius: 12, padding: 14 }}>
          I focus sono personalizzabili dallo staff dal pannello di amministrazione (Richieste accesso → Focus):
          si possono aggiungere, rinominare o disattivare. Il mister inserisce i rilevamenti dalla pagina
          “Nuovo rilevamento”, con un valore da 1 a 10 per ogni focus. La dashboard si aggiorna in automatico.
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   AREA STAFF (solo direzione / staff / admin)
   ============================================================ */
function ReportBlock({ label, color, items }) {
  return (
    <div style={{ border: `1px solid ${C.grid}`, borderRadius: 12, padding: 14 }}>
      <div style={{ ...font, fontSize: 12.5, fontWeight: 600, color, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.length ? items.map((t, i) => <span key={i} style={{ ...font, fontSize: 13.5, color: C.ink }}>{t}</span>)
          : <span style={{ ...font, fontSize: 13, color: C.muted }}>—</span>}
      </div>
    </div>
  );
}

function StaffView({ d }) {
  const { NOMI, atleti, overall, RANK, TEAM_AVG, lastPeriod } = d;
  const [report, setReport] = useState(null);
  const [repBusy, setRepBusy] = useState(false);
  const [repErr, setRepErr] = useState(null);

  const teamAvg = (k) => Math.round((NOMI.reduce((a, n) => a + (atleti[n].scores[k] ?? 0), 0) / Math.max(NOMI.length, 1)) * 10) / 10;
  const bySkill = CORE.map((k) => ({ key: k, title: TITLE[k], value: teamAvg(k) })).sort((a, b) => a.value - b.value);
  const weakest = bySkill.slice(0, 3);
  const strongest = [...bySkill].reverse().slice(0, 3);
  const attention = [...NOMI].sort((a, b) => overall(a) - overall(b)).slice(0, 3);
  const max = Math.max(...NOMI.map(overall));
  const teamMean = (NOMI.reduce((a, n) => a + overall(n), 0) / Math.max(NOMI.length, 1)).toFixed(1);

  const team = {
    count: NOMI.length,
    lastPeriod,
    averages: CORE.map((k) => ({ title: TITLE[k], value: teamAvg(k) })),
    roster: RANK.map((n) => ({ id: n, overall: overall(n).toFixed(1) })),
  };
  const skills = SKILL_META.map((s) => ({ title: s.title, desc: s.description }));

  const genReport = async () => {
    setRepBusy(true); setRepErr(null);
    try {
      const res = await fetch("/api/coach", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Genera un breve report di analisi della squadra: 1) punti di forza, 2) le competenze da allenare come priorità, 3) due o tre azioni concrete per il prossimo allenamento. Usa elenchi puntati e resta sintetico." }],
          team, skills,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Report non disponibile.");
      setReport(data.reply);
    } catch (e) { setRepErr(e.message); } finally { setRepBusy(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <div style={{ ...display, fontSize: 16, fontWeight: 700, color: C.ink }}>Report squadra — Oasi Volley U18</div>
          <div style={{ ...font, fontSize: 12.5, color: C.muted }}>Aggiornato al {lastPeriod}</div>
        </div>
        <button className="a360-noprint" onClick={() => window.print()}
          style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 500, padding: "9px 13px", borderRadius: 10, border: `1px solid ${C.grid}`, background: "#fff", color: C.ink, cursor: "pointer" }}>
          <Printer size={16} /> Stampa / PDF
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        {[
          { l: "Atlete monitorate", v: NOMI.length },
          { l: "Competenze core", v: CORE.length },
          { l: "Media squadra", v: teamMean },
          { l: "Ultimo rilevamento", v: lastPeriod },
        ].map((s) => (
          <div key={s.l} style={{ flex: "1 1 140px", background: C.card, border: `1px solid ${C.grid}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ ...display, fontSize: 26, fontWeight: 700, color: C.navy }}>{s.v}</div>
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

        <Card title="Classifica generale" subtitle="Punteggio medio complessivo per atleta">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {RANK.map((n, i) => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ ...display, fontWeight: 700, fontSize: 14, width: 22, color: i < 3 ? C.orange : C.muted }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ ...font, fontSize: 13.5, color: C.ink }}>{n}</span>
                    <span style={{ ...display, fontSize: 13.5, fontWeight: 600, color: C.navy }}>{overall(n).toFixed(1)}</span>
                  </div>
                  <div style={{ height: 7, background: C.surface, borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(overall(n) / max) * 100}%`, background: i < 3 ? C.orange : C.navy2, borderRadius: 99 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Report & analisi" subtitle="Sintesi automatica dai dati della squadra" style={{ marginTop: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <ReportBlock label="Punti di forza (squadra)" color="#0F7A4E" items={strongest.map((s) => `${s.title} · ${s.value}/10`)} />
          <ReportBlock label="Priorità di allenamento" color="#B4232A" items={weakest.map((s) => `${s.title} · ${s.value}/10`)} />
          <ReportBlock label="Atlete da seguire" color={C.navy2} items={attention.map((n) => `${n} · ${overall(n).toFixed(1)}`)} />
        </div>

        <div style={{ marginTop: 16, borderTop: `1px solid ${C.grid}`, paddingTop: 16 }}>
          <button onClick={genReport} disabled={repBusy} className="a360-noprint"
            style={{ ...font, display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 10, border: "none", background: C.orange, color: "#fff", fontSize: 14, fontWeight: 600, cursor: repBusy ? "default" : "pointer", opacity: repBusy ? 0.7 : 1 }}>
            <Sparkles size={16} /> {repBusy ? "Genero l'analisi…" : "Genera analisi con IA"}
          </button>
          {repErr && <div style={{ ...font, fontSize: 13, color: "#B4232A", marginTop: 10 }}>{repErr}</div>}
          {report && (
            <div style={{ ...font, fontSize: 14, color: C.ink, lineHeight: 1.6, whiteSpace: "pre-wrap", background: C.surface, borderRadius: 12, padding: "14px 16px", marginTop: 14, borderLeft: `3px solid ${C.orange}` }}>
              {report}
            </div>
          )}
        </div>
      </Card>

      <CoachChat
        title="Coach IA — Squadra"
        subtitle="Consigli allo staff su come allenare le soft skill del gruppo"
        suggestions={[
          "Su quale competenza dovremmo concentrarci come squadra?",
          "Proponi una seduta di allenamento mentale di gruppo.",
          "Come far crescere le atlete più in difficoltà?",
        ]}
        payload={{ team, skills }}
      />
    </div>
  );
}

/* ============================================================
   APP + LAYOUT RESPONSIVE
   ============================================================ */
const BASE_NAV = [
  { id: "home", label: "Home", icon: Home, comp: HomeView },
  { id: "profilo", label: "Profilo Atleta", icon: User, comp: ProfiloView },
  { id: "confronto", label: "Confronto", icon: Users, comp: ConfrontoView },
  { id: "andamento", label: "Andamento", icon: TrendingUp, comp: AndamentoView },
  { id: "info", label: "Info & Legenda", icon: Info, comp: InfoView },
];

function Dashboard() {
  const { profile, signOut } = useAuth();
  const isAdmin = profile?.role === "admin";
  const isStaff = isAdmin || ["direzione", "staff"].includes(profile?.category);
  const canAssess = isAdmin || !!profile?.can_assess;   // può inserire rilevamenti (mister)
  // Un'atleta "semplice" (non staff/admin) vede solo il proprio profilo.
  const viewCtx = {
    restricted: !isStaff && profile?.category === "atleta",
    athleteId: profile?.athlete_id || null,
    firstName: profile?.first_name || "",
  };
  const NAV = [
    ...BASE_NAV,
    ...(canAssess ? [{ id: "rilevamento", label: "Nuovo rilevamento", icon: ClipboardPlus, comp: NewAssessment }] : []),
    ...(isStaff ? [{ id: "staff", label: "Area Staff", icon: ClipboardList, comp: StaffView }] : []),
    ...(isAdmin ? [{ id: "admin", label: "Richieste accesso", icon: ShieldCheck, comp: AdminPanel }] : []),
  ];

  const [view, setView] = useState("home");
  const [mobileOpen, setMobileOpen] = useState(false);

  const [model, setModel] = useState(null);
  const [errore, setErrore] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let active = true;
    setModel(null); setErrore(null);
    fetchModel()
      .then((m) => { if (active) setModel(m); })
      .catch((e) => { if (active) setErrore(e.message); });
    return () => { active = false; };
  }, [reloadKey]);

  // Rende disponibili i focus (da Supabase) alle viste, prima del render dei figli.
  if (model) bindSkills(model);

  const active = NAV.find((x) => x.id === view) || NAV[0];
  const ViewComp = active.comp;

  const NavList = () => (
    <nav style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 12px" }}>
      {NAV.map((item) => {
        const on = item.id === view;
        const Icon = item.icon;
        return (
          <button key={item.id}
            onClick={() => { setView(item.id); setMobileOpen(false); }}
            style={{ ...font, display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 11,
              border: "none", cursor: "pointer", textAlign: "left", fontSize: 14.5,
              background: on ? "rgba(255,122,24,0.15)" : "transparent",
              color: on ? "#FFB27A" : "rgba(255,255,255,0.72)",
              fontWeight: on ? 600 : 400, borderLeft: on ? `3px solid ${C.orange}` : "3px solid transparent", transition: "all .15s" }}>
            <Icon size={19} /> {item.label}
          </button>
        );
      })}
    </nav>
  );

  const Brand = () => (
    <div style={{ padding: "22px 22px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", ...display, fontWeight: 700, color: "#fff", fontSize: 13, letterSpacing: -0.5 }}>360</div>
        <div style={{ ...display, color: "#fff", fontWeight: 700, fontSize: 17, letterSpacing: -0.3 }}>Atleta360</div>
      </div>
      <div style={{ marginTop: 12, background: "#fff", borderRadius: 10, padding: "7px 11px", display: "inline-flex" }}>
        <img src="/logo-oasivolley.png" alt="Oasi Volley" style={{ height: 26, width: "auto", display: "block" }} />
      </div>
    </div>
  );

  const ellipsis = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
  const UserFooter = () => (
    <div style={{ marginTop: "auto", padding: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ ...display, fontSize: 13, color: "#fff", fontWeight: 600, ...ellipsis }}>
        {[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.email}
      </div>
      <div style={{ ...font, fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 10, ...ellipsis }}>
        {isAdmin ? "Amministratore"
          : profile?.category === "direzione" ? "Direzione"
          : profile?.category === "staff" ? "Staff" : "Atleta"}
      </div>
      <button onClick={signOut} style={{ ...font, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)",
        background: "transparent", color: "rgba(255,255,255,0.85)", cursor: "pointer", fontSize: 13 }}>
        <LogOut size={16} /> Esci
      </button>
    </div>
  );

  // Contenuto dell'area principale in base allo stato dei dati.
  let content;
  if (active.id === "admin") {
    content = <AdminPanel onChange={reload} />;
  } else if (active.id === "rilevamento") {
    content = <NewAssessment onSaved={reload} />;
  } else if (errore) {
    content = (
      <StatusBox tone="error" title="Non riesco a leggere i dati"
        message="C'è stato un problema nel caricare i dati. Riprova tra poco; se persiste, verifica la connessione. Dettaglio tecnico in console." />
    );
  } else if (!model) {
    content = <StatusBox title="Carico i dati della squadra…" message="Un attimo, sto caricando atlete, focus e rilevamenti." />;
  } else if (model.NOMI.length === 0) {
    content = <StatusBox title="Nessun rilevamento ancora" message="Appena il mister inserisce il primo rilevamento dalla pagina “Nuovo rilevamento”, la dashboard si popola da sola." />;
  } else {
    content = <ViewComp d={model} auth={viewCtx} />;
  }

  return (
    <div style={{ ...font, display: "flex", minHeight: "100vh", background: C.surface, color: C.ink }}>
      {/* Sidebar desktop */}
      <aside style={{ width: 250, background: C.navy, flexShrink: 0, position: "sticky", top: 0, height: "100vh", display: "none", flexDirection: "column" }} className="a360-sidebar">
        <Brand />
        <NavList />
        <UserFooter />
      </aside>
      <style>{`@media (min-width: 900px){ .a360-sidebar{ display:flex !important; } .a360-mobilebar{ display:none !important; } }`}</style>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={() => setMobileOpen(false)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(10,19,48,0.5)" }} />
          <aside onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: 0, top: 0, height: "100%", width: 260, background: C.navy, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Brand />
              <button onClick={() => setMobileOpen(false)} aria-label="Chiudi menu" style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 22 }}><X size={22} /></button>
            </div>
            <NavList />
            <UserFooter />
          </aside>
        </div>
      )}

      {/* Colonna principale */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Topbar mobile */}
        <header className="a360-mobilebar" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: C.navy, position: "sticky", top: 0, zIndex: 20 }}>
          <button onClick={() => setMobileOpen(true)} aria-label="Apri menu" style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}><Menu size={24} /></button>
          <div style={{ ...display, color: "#fff", fontWeight: 700, fontSize: 16 }}>Atleta360</div>
        </header>

        <main style={{ padding: "clamp(18px, 4vw, 34px)", maxWidth: 1180, width: "100%", margin: "0 auto" }}>
          <div style={{ marginBottom: 22 }}>
            <div style={{ ...font, fontSize: 12.5, color: C.orange, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" }}>Dashboard soft skills</div>
            <h1 style={{ ...display, fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 700, color: C.ink, margin: "4px 0 0", letterSpacing: -0.5 }}>{active.label}</h1>
          </div>
          {content}
        </main>
        <Footer />
      </div>
    </div>
  );
}

/* ============================================================
   CANCELLO DI ACCESSO — decide cosa mostrare in base all'utente
   ============================================================ */
// Logo Danilo Puglisi fisso in basso a destra, su ogni pagina (desktop + mobile).
function SiteLogo() {
  return (
    <a href="https://www.danilopuglisi.com" target="_blank" rel="noopener noreferrer" className="a360-noprint"
      title="Danilo Puglisi — Consulente e Formatore"
      style={{ position: "fixed", right: "clamp(10px, 2vw, 18px)", bottom: "clamp(10px, 2vw, 18px)", zIndex: 30,
        background: "#fff", borderRadius: 10, border: `1px solid ${C.grid}`, boxShadow: "0 4px 14px rgba(10,22,80,0.14)",
        padding: "5px 9px", display: "inline-flex", alignItems: "center", lineHeight: 0, textDecoration: "none" }}>
      <img src="/logo-danilo.jpg" alt="Danilo Puglisi — Consulente e Formatore"
        style={{ height: "clamp(20px, 4.5vw, 26px)", width: "auto", display: "block" }} />
    </a>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
      <SiteLogo />
    </AuthProvider>
  );
}

function Root() {
  const { loading, session, profile, recovery, signOut, refreshProfile } = useAuth();

  if (!supabaseConfigured) return <SetupNotice />;
  if (recovery) return <ResetPasswordScreen />;
  if (loading) return <GateScreen title="Un attimo…" message="Sto verificando il tuo accesso." />;
  if (!session) return <AuthScreen />;

  const status = profile?.status;
  if (!profile || status === "pending") {
    return (
      <GateScreen
        title="Richiesta in valutazione"
        message="La tua registrazione è in attesa di approvazione da parte dello staff. Appena viene approvata potrai accedere alla dashboard: riprova più tardi."
        onLogout={signOut}
        onRefresh={refreshProfile}
      />
    );
  }
  if (status === "rejected") {
    return (
      <GateScreen
        title="Accesso non approvato"
        message="La tua richiesta di accesso non è stata approvata. Se pensi sia un errore, contatta lo staff."
        onLogout={signOut}
      />
    );
  }
  return <Dashboard />;
}

// Schermata a tutto schermo per gli stati del cancello (attesa / rifiuto / caricamento).
function GateScreen({ title, message, onLogout, onRefresh }) {
  return (
    <div style={{ ...font, minHeight: "100vh", background: `linear-gradient(160deg, ${C.navy} 0%, ${C.navy2} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 11, marginBottom: 22 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", ...display, fontWeight: 700, color: "#fff", fontSize: 14, letterSpacing: -0.5 }}>360</div>
          <div style={{ ...display, color: "#fff", fontWeight: 700, fontSize: 22, letterSpacing: -0.3 }}>Atleta360</div>
        </div>
        <div style={{ background: C.card, borderRadius: 18, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.28)" }}>
          <div style={{ ...display, fontSize: 18, fontWeight: 700, color: C.ink }}>{title}</div>
          <p style={{ ...font, fontSize: 14, color: C.muted, lineHeight: 1.6, marginTop: 10 }}>{message}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
            {onRefresh && (
              <button onClick={onRefresh} style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 11, border: "none", background: C.orange, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                <RefreshCw size={16} /> Controlla di nuovo
              </button>
            )}
            {onLogout && (
              <button onClick={onLogout} style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 11, border: `1px solid ${C.grid}`, background: "#fff", color: C.muted, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                <LogOut size={16} /> Esci
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Mostrata se le variabili d'ambiente di Supabase non sono configurate.
function SetupNotice() {
  return (
    <div style={{ ...font, minHeight: "100vh", background: C.surface, color: C.ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 560, background: C.card, border: `1px solid ${C.grid}`, borderLeft: `4px solid ${C.orange}`, borderRadius: 16, padding: "26px 24px" }}>
        <div style={{ ...display, fontSize: 17, fontWeight: 700, color: C.ink }}>Accesso non ancora configurato</div>
        <p style={{ ...font, fontSize: 14, color: C.muted, lineHeight: 1.6, marginTop: 10 }}>
          Mancano le credenziali di Supabase. Crea un file <code>.env</code> (vedi <code>.env.example</code>)
          con <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>, poi riavvia l'app.
          Le istruzioni complete sono nel <b>README</b>.
        </p>
      </div>
    </div>
  );
}
