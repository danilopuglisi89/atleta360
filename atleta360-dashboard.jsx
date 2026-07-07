import { useState } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer,
} from "recharts";
import { Home, User, Users, TrendingUp, Info, Menu, X } from "lucide-react";

/* ============================================================
   BRAND — sostituisci con gli hex esatti del brand Atleta360
   ============================================================ */
const C = {
  navy: "#0A1650",
  navy2: "#17297A",
  orange: "#FF7A18",
  orangeSoft: "#FFE9D5",
  ink: "#0C1330",
  muted: "#64708F",
  surface: "#F6F7FB",
  card: "#FFFFFF",
  grid: "#E6E9F2",
};
const SERIES = ["#FF7A18", "#17297A", "#16A6A6"];              // confronto atlete
const CORE_COLORS = ["#FF7A18", "#17297A", "#16A6A6", "#8B5CF6", "#E11D74", "#0EA5E9"]; // andamento

/* ============================================================
   MODELLO DATI — rispecchia il CSV pubblicato del Foglio Google.
   Ogni compilazione del modulo del mister = una riga/uno snapshot.
   Le 6 skill core sono quelle definite; le 4 add-on qui sono
   PLACEHOLDER: rinominale con le tue effettive.
   ============================================================ */
const CORE = ["Focus", "Gestione Stress", "Resilienza Errore", "Comunicazione", "Leadership", "Gestione Tempo"];
const ADDON = ["Spirito di Squadra", "Motivazione", "Adattabilità", "Autostima"];
const SKILLS = [...CORE, ...ADDON];

const SHORT = {
  "Focus": "Focus", "Gestione Stress": "Stress", "Resilienza Errore": "Resilienza",
  "Comunicazione": "Comunic.", "Leadership": "Leadership", "Gestione Tempo": "Tempo",
  "Spirito di Squadra": "Squadra", "Motivazione": "Motivaz.", "Adattabilità": "Adattab.", "Autostima": "Autostima",
};

// In produzione: qui useresti il numero di maglia al posto del nome (privacy Under 18).
const DATA = {
  "Giulia": { numero: 5, scores: { "Focus": 8, "Gestione Stress": 7, "Resilienza Errore": 6, "Comunicazione": 9, "Leadership": 8, "Gestione Tempo": 7, "Spirito di Squadra": 9, "Motivazione": 8, "Adattabilità": 7, "Autostima": 7 } },
  "Sara":   { numero: 7, scores: { "Focus": 7, "Gestione Stress": 8, "Resilienza Errore": 8, "Comunicazione": 6, "Leadership": 6, "Gestione Tempo": 8, "Spirito di Squadra": 7, "Motivazione": 9, "Adattabilità": 8, "Autostima": 8 } },
  "Martina":{ numero: 9, scores: { "Focus": 6, "Gestione Stress": 5, "Resilienza Errore": 6, "Comunicazione": 8, "Leadership": 9, "Gestione Tempo": 6, "Spirito di Squadra": 8, "Motivazione": 7, "Adattabilità": 6, "Autostima": 7 } },
  "Chiara": { numero: 11, scores: { "Focus": 9, "Gestione Stress": 8, "Resilienza Errore": 7, "Comunicazione": 7, "Leadership": 7, "Gestione Tempo": 9, "Spirito di Squadra": 7, "Motivazione": 8, "Adattabilità": 9, "Autostima": 8 } },
  "Elena":  { numero: 3, scores: { "Focus": 6, "Gestione Stress": 6, "Resilienza Errore": 5, "Comunicazione": 7, "Leadership": 5, "Gestione Tempo": 6, "Spirito di Squadra": 8, "Motivazione": 6, "Adattabilità": 7, "Autostima": 6 } },
  "Aurora": { numero: 14, scores: { "Focus": 8, "Gestione Stress": 9, "Resilienza Errore": 9, "Comunicazione": 8, "Leadership": 8, "Gestione Tempo": 7, "Spirito di Squadra": 9, "Motivazione": 9, "Adattabilità": 8, "Autostima": 9 } },
};

const NOMI = Object.keys(DATA);
const overall = (n) => Math.round((SKILLS.reduce((a, k) => a + DATA[n].scores[k], 0) / SKILLS.length) * 10) / 10;
const RANK = [...NOMI].sort((a, b) => overall(b) - overall(a));
const TEAM_AVG = SKILLS.map((k) => ({
  skill: SHORT[k], full: 10,
  valore: Math.round((NOMI.reduce((a, n) => a + DATA[n].scores[k], 0) / NOMI.length) * 10) / 10,
}));

// Andamento nel tempo (derivato dai valori attuali, converge verso l'ultimo rilevamento)
const PERIODI = ["Set", "Ott", "Nov", "Dic"];
const trendFor = (n) => PERIODI.map((p, i) => {
  const row = { periodo: p };
  const delta = PERIODI.length - 1 - i;
  CORE.forEach((k, ki) => {
    const wobble = (ki + i) % 2;
    row[k] = Math.max(1, Math.min(10, DATA[n].scores[k] - delta + (i > 0 ? wobble : 0)));
  });
  return row;
});

/* ============================================================
   PICCOLI COMPONENTI
   ============================================================ */
const font = { fontFamily: "'Inter', system-ui, sans-serif" };
const display = { fontFamily: "'Space Grotesk', system-ui, sans-serif" };

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
      {options.map((o) => <option key={o} value={o}>{DATA[o] ? `#${DATA[o].numero} · ${o}` : o}</option>)}
    </select>
  );
}

const tooltipStyle = { background: C.navy, border: "none", borderRadius: 12, color: "#fff", fontSize: 12, ...font, boxShadow: "0 8px 24px rgba(10,22,80,0.25)" };

/* ============================================================
   VISTE
   ============================================================ */
function HomeView() {
  const max = Math.max(...NOMI.map(overall));
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        {[
          { l: "Atlete monitorate", v: NOMI.length },
          { l: "Skill core", v: 6 },
          { l: "Add-on attive", v: ADDON.length },
          { l: "Ultimo rilevamento", v: "Dic" },
        ].map((s) => (
          <div key={s.l} style={{ flex: "1 1 140px", background: C.card, border: `1px solid ${C.grid}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ ...display, fontSize: 26, fontWeight: 700, color: C.navy }}>{s.v}</div>
            <div style={{ ...font, fontSize: 12.5, color: C.muted, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        <Card title="Profilo medio della squadra" subtitle="Media delle 10 competenze su tutte le atlete">
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
                    <span style={{ ...font, fontSize: 13.5, color: C.ink }}>#{DATA[n].numero} · {n}</span>
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

function ProfiloView() {
  const [n, setN] = useState(NOMI[0]);
  const radar = SKILLS.map((k) => ({ skill: SHORT[k], valore: DATA[n].scores[k], full: 10 }));
  const ranked = SKILLS.map((k) => ({ k, v: DATA[n].scores[k] })).sort((a, b) => b.v - a.v);
  const top = ranked.slice(0, 3), bottom = ranked.slice(-3).reverse();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ ...font, fontSize: 13, color: C.muted }}>Atleta</span>
        <Select value={n} onChange={setN} options={NOMI} />
        <div style={{ marginLeft: "auto", ...display, fontSize: 13, color: C.muted }}>
          Punteggio complessivo <b style={{ color: C.orange, fontSize: 20, marginLeft: 6 }}>{overall(n).toFixed(1)}</b>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        <Card title="Profilo a 360°" subtitle="Le 6 competenze core + le 4 add-on">
          <ResponsiveContainer width="100%" height={330}>
            <RadarChart data={radar} outerRadius="72%">
              <PolarGrid stroke={C.grid} />
              <PolarAngleAxis dataKey="skill" tick={{ fill: C.muted, fontSize: 11, ...font }} />
              <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
              <Radar name={n} dataKey="valore" stroke={C.orange} fill={C.orange} fillOpacity={0.35} strokeWidth={2} dot={{ r: 2.5, fill: C.orange }} />
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

function ConfrontoView() {
  const [sel, setSel] = useState([NOMI[0], NOMI[5]]);
  const toggle = (n) => setSel((s) => s.includes(n) ? s.filter((x) => x !== n) : (s.length < 3 ? [...s, n] : s));

  const radar = CORE.map((k) => {
    const row = { skill: SHORT[k] };
    sel.forEach((n) => (row[n] = DATA[n].scores[k]));
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
                #{DATA[n].numero} · {n}
              </button>
            );
          })}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        <Card title="Confronto profili (core)" subtitle="Le 6 competenze fondamentali a confronto">
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

function AndamentoView() {
  const [n, setN] = useState(NOMI[0]);
  const data = trendFor(n);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ ...font, fontSize: 13, color: C.muted }}>Atleta</span>
        <Select value={n} onChange={setN} options={NOMI} />
      </div>
      <Card title="Evoluzione nel tempo" subtitle="Andamento delle 6 competenze core rilevamento dopo rilevamento">
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
            <XAxis dataKey="periodo" tick={{ fill: C.muted, fontSize: 12, ...font }} />
            <YAxis domain={[0, 10]} tick={{ fill: C.muted, fontSize: 11, ...font }} />
            {CORE.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} name={SHORT[k]} stroke={CORE_COLORS[i]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            ))}
            <Legend wrapperStyle={{ ...font, fontSize: 12 }} />
            <Tooltip contentStyle={tooltipStyle} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function InfoView() {
  const desc = {
    "Focus": "Capacità di mantenere l'attenzione sull'obiettivo durante l'azione di gioco.",
    "Gestione Stress": "Controllo emotivo nei momenti di pressione (punti decisivi, tie-break).",
    "Resilienza Errore": "Reazione e recupero dopo un errore, senza trascinarlo nell'azione successiva.",
    "Comunicazione": "Chiarezza ed efficacia nella comunicazione in campo con le compagne.",
    "Leadership": "Assunzione di responsabilità e capacità di trascinare il gruppo.",
    "Gestione Tempo": "Organizzazione tra allenamenti, scuola e recupero.",
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
      <Card title="Le 6 competenze core" subtitle="Il cuore del profilo, monitorate a ogni rilevamento">
        {CORE.map((k) => (
          <div key={k} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: `1px solid ${C.grid}` }}>
            <div style={{ ...display, fontSize: 14, fontWeight: 600, color: C.navy }}>{k}</div>
            <div style={{ ...font, fontSize: 13, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>{desc[k]}</div>
          </div>
        ))}
      </Card>
      <Card title="Le 4 add-on (opzionali)" subtitle="Competenze aggiuntive personalizzabili per squadra">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {ADDON.map((k) => (
            <span key={k} style={{ ...font, fontSize: 13, padding: "7px 13px", borderRadius: 99, background: C.orangeSoft, color: "#B4520A", fontWeight: 500 }}>{k}</span>
          ))}
        </div>
        <div style={{ ...font, fontSize: 13, color: C.muted, lineHeight: 1.6, background: C.surface, borderRadius: 12, padding: 14 }}>
          Questi nomi sono segnaposto: sostituiscili con le 4 add-on che hai definito. Sul foglio bastano 4 colonne in più con lo stesso formato (valore 1–10) e la dashboard le legge in automatico.
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   APP + LAYOUT RESPONSIVE
   ============================================================ */
const NAV = [
  { id: "home", label: "Home", icon: Home, comp: HomeView },
  { id: "profilo", label: "Profilo Atleta", icon: User, comp: ProfiloView },
  { id: "confronto", label: "Confronto", icon: Users, comp: ConfrontoView },
  { id: "andamento", label: "Andamento", icon: TrendingUp, comp: AndamentoView },
  { id: "info", label: "Info & Legenda", icon: Info, comp: InfoView },
];

export default function App() {
  const [view, setView] = useState("home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const active = NAV.find((x) => x.id === view);
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
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "22px 22px 14px" }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", ...display, fontWeight: 700, color: "#fff", fontSize: 13, letterSpacing: -0.5 }}>360</div>
      <div>
        <div style={{ ...display, color: "#fff", fontWeight: 700, fontSize: 17, letterSpacing: -0.3 }}>Atleta360</div>
        <div style={{ ...font, color: "rgba(255,255,255,0.5)", fontSize: 11 }}>Oasi Volley Viareggio · U18</div>
      </div>
    </div>
  );

  return (
    <div style={{ ...font, display: "flex", minHeight: "100vh", background: C.surface, color: C.ink }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');`}</style>

      {/* Sidebar desktop */}
      <aside style={{ width: 250, background: C.navy, flexShrink: 0, position: "sticky", top: 0, height: "100vh", display: "none", flexDirection: "column" }} className="a360-sidebar">
        <Brand />
        <NavList />
        <div style={{ marginTop: "auto", padding: 18, ...font, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Prototipo · dati dimostrativi</div>
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
          <ViewComp />
        </main>
      </div>
    </div>
  );
}
