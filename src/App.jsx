import { useState, useEffect, useMemo } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer,
} from "recharts";
import { Home, User, Users, TrendingUp, Info, Menu, X } from "lucide-react";
import Papa from "papaparse";

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
   ⭐ LIVELLO DATI REALE — legge il CSV pubblicato del Foglio Google.
   Ogni compilazione del modulo del mister = una riga/uno snapshot.

   SKILL_META è la tabella delle competenze. Per ognuna:
   - key   : identificatore interno (chiave dei punteggi + dataKey dei grafici)
   - short : etichetta corta usata sugli assi dei grafici
   - title : titolo esteso mostrato nella legenda
   - desc  : descrizione della competenza
   - col   : nome ESATTO della colonna nel CSV (deve combaciare al 100%;
             gli spazi in coda vengono ripuliti da transformHeader).

   Le competenze non sono ancora definitive: si possono aggiungere o
   rimuovere qui (e la relativa colonna sul Foglio) e la dashboard si
   adatta in automatico.
   ============================================================ */
const CORE_META = [
  {
    key: "Resilienza all'Errore",
    short: "Reset",
    title: "Resilienza all'Errore (Mental Reset)",
    col: "Resilienza all'Errore (Mental Reset): Capacità di resettare la mente dopo un errore punto (es. una battuta sbagliata o una ricezione fallita) senza farsi condizionare nei punti successivi.",
    desc: "Capacità di resettare la mente dopo un errore punto (es. una battuta sbagliata o una ricezione fallita) senza farsi condizionare nei punti successivi.",
  },
  {
    key: "Focus sotto Pressione",
    short: "Focus",
    title: "Focus sotto Pressione (Clutch Performance)",
    col: "Focus sotto Pressione (Clutch Performance): Livello di attenzione e lucidità nei momenti caldi del match (es. i vantaggi o i punti decisivi dal 20 in poi).",
    desc: "Livello di attenzione e lucidità nei momenti caldi del match (es. i vantaggi o i punti decisivi dal 20 in poi).",
  },
  {
    key: "Body Language",
    short: "Body Lang.",
    title: "Body Language e Atteggiamento",
    col: "Body Language e Atteggiamento: La gestione della frustrazione. Presenza visiva in campo, postura positiva ed evitamento di gesti di stizza che scoraggiano la squadra.",
    desc: "La gestione della frustrazione. Presenza visiva in campo, postura positiva ed evitamento di gesti di stizza che scoraggiano la squadra.",
  },
  {
    key: "Comunicazione e Sostegno",
    short: "Comunic.",
    title: "Comunicazione e Sostegno",
    col: "Comunicazione e Sostegno: Capacità di chiamare la palla ad alta voce, dare indicazioni tattiche chiare e sostenere attivamente le compagne nei momenti di difficoltà (spirito di spogliatoio in campo).",
    desc: "Capacità di chiamare la palla ad alta voce, dare indicazioni tattiche chiare e sostenere attivamente le compagne nei momenti di difficoltà (spirito di spogliatoio in campo).",
  },
  {
    key: "Coachability",
    short: "Coachab.",
    title: "Coachability (Ascolto Attivo)",
    col: "Coachability (Ascolto Attivo): Apertura mentale nell'accettare le correzioni tecniche/tattiche del Mister durante i timeout o gli allenamenti, applicandole subito senza protestare.",
    desc: "Apertura mentale nell'accettare le correzioni tecniche/tattiche del Mister durante i timeout o gli allenamenti, applicandole subito senza protestare.",
  },
  {
    key: "Intelligenza Tattica",
    short: "Tattica",
    title: "Intelligenza Tattica (Problem Solving)",
    col: "Intelligenza Tattica (Problem Solving): Capacità di leggere il gioco avversario (es. posizionamento del muro o della difesa) e variare i colpi d'attacco di conseguenza, uscendo dagli schemi fissi.",
    desc: "Capacità di leggere il gioco avversario (es. posizionamento del muro o della difesa) e variare i colpi d'attacco di conseguenza, uscendo dagli schemi fissi.",
  },
];

// Le 4 add-on non sono ancora definite. Aggiungile qui con lo stesso
// formato di CORE_META (e una colonna corrispondente sul Foglio) quando pronte.
const ADDON_META = [];

const CONFIG = {
  // URL del CSV pubblicato del Foglio Google (colonna "Nome dell'atleta" = iniziali, per privacy Under 18).
  // In alternativa, da Google Fogli: File → Condividi → Pubblica sul web → CSV.
  csvUrl:
    "https://docs.google.com/spreadsheets/d/1GY4R6m0TXdo4izgfbhVScQAovWJGLk6p4x_lTRVLJX8/export?format=csv",

  // Header di default dei Moduli in italiano.
  colTimestamp: "Informazioni cronologiche",
  // Identificatore dell'atleta: iniziali o numero di maglia (mai il nome completo).
  colAtleta: "Nome dell'atleta",

  coreSkills: CORE_META,
  addonSkills: ADDON_META,
};
/* ================================================== */

const META = [...CONFIG.coreSkills, ...CONFIG.addonSkills];
const CORE = CONFIG.coreSkills.map((s) => s.key);
const ADDON = CONFIG.addonSkills.map((s) => s.key);
const SKILLS = [...CORE, ...ADDON];
const SHORT = Object.fromEntries(META.map((s) => [s.key, s.short]));

// Converte una cella in numero (gestisce virgola decimale e spazi). null se non valido.
function toNum(v) {
  const n = Number(String(v ?? "").replace(",", ".").trim());
  return Number.isNaN(n) ? null : n;
}

// Interpreta il timestamp (formato Moduli IT "gg/mm/aaaa hh.mm.ss" oppure ISO).
function toTs(s) {
  if (!s) return 0;
  const m = String(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})[ ,]+(\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?/);
  if (m) {
    const [, d, mo, y, h, mi, se] = m;
    return new Date(+y, +mo - 1, +d, +h, +mi, +(se || 0)).getTime();
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
}

// Trasforma le righe grezze del CSV in { atleti, storico, lastPeriod }.
// - atleti[id]  = { id, scores: {skill: valore} }  (ULTIMO rilevamento)
// - storico[id] = [ { periodo, ...scores } ]        (TUTTI i rilevamenti, ordinati)
// Legge ogni colonna tramite meta.col e memorizza il punteggio sotto meta.key.
function transform(rows) {
  const byId = {};
  const allTs = [];

  rows.forEach((r) => {
    const id = String(r[CONFIG.colAtleta] ?? "").trim();
    if (!id) return;
    const scores = {};
    let hasAny = false;
    META.forEach((s) => {
      const v = toNum(r[s.col]);
      if (v !== null) { scores[s.key] = v; hasAny = true; }
    });
    if (!hasAny) return;
    const ts = toTs(r[CONFIG.colTimestamp]);
    allTs.push(ts);
    (byId[id] ||= []).push({ ts, scores });
  });

  const atleti = {}, storico = {};
  Object.entries(byId).forEach(([id, entries]) => {
    entries.sort((a, b) => a.ts - b.ts);
    atleti[id] = { id, scores: entries[entries.length - 1].scores };
    storico[id] = entries.map((e) => ({
      periodo: e.ts ? new Date(e.ts).toLocaleDateString("it-IT", { day: "2-digit", month: "short" }) : "",
      ...e.scores,
    }));
  });

  const maxTs = allTs.length ? Math.max(...allTs) : 0;
  const lastPeriod = maxTs
    ? new Date(maxTs).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })
    : "—";

  return { atleti, storico, lastPeriod };
}

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
          { l: "Skill core", v: CORE.length },
          { l: "Add-on attive", v: ADDON.length },
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

function ProfiloView({ d }) {
  const { NOMI, atleti, overall } = d;
  const [n, setN] = useState(NOMI[0]);
  const sel = atleti[n] ? n : NOMI[0];
  const scores = atleti[sel].scores;
  const radar = SKILLS.map((k) => ({ skill: SHORT[k], valore: scores[k] ?? 0, full: 10 }));
  const ranked = SKILLS.map((k) => ({ k, v: scores[k] ?? 0 })).sort((a, b) => b.v - a.v);
  const top = ranked.slice(0, 3), bottom = ranked.slice(-3).reverse();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ ...font, fontSize: 13, color: C.muted }}>Atleta</span>
        <Select value={sel} onChange={setN} options={NOMI} />
        <div style={{ marginLeft: "auto", ...display, fontSize: 13, color: C.muted }}>
          Punteggio complessivo <b style={{ color: C.orange, fontSize: 20, marginLeft: 6 }}>{overall(sel).toFixed(1)}</b>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        <Card title="Profilo a 360°" subtitle="Tutte le competenze rilevate">
          <ResponsiveContainer width="100%" height={330}>
            <RadarChart data={radar} outerRadius="72%">
              <PolarGrid stroke={C.grid} />
              <PolarAngleAxis dataKey="skill" tick={{ fill: C.muted, fontSize: 11, ...font }} />
              <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
              <Radar name={sel} dataKey="valore" stroke={C.orange} fill={C.orange} fillOpacity={0.35} strokeWidth={2} dot={{ r: 2.5, fill: C.orange }} />
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
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ ...font, fontSize: 13, color: C.muted }}>Atleta</span>
        <Select value={sel} onChange={setN} options={NOMI} />
      </div>
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
    </div>
  );
}

function InfoView() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
      <Card title="Le competenze core" subtitle="Il cuore del profilo, monitorate a ogni rilevamento">
        {CONFIG.coreSkills.map((s) => (
          <div key={s.key} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: `1px solid ${C.grid}` }}>
            <div style={{ ...display, fontSize: 14, fontWeight: 600, color: C.navy }}>{s.title}</div>
            <div style={{ ...font, fontSize: 13, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>{s.desc}</div>
          </div>
        ))}
      </Card>
      <Card title="Le add-on (opzionali)" subtitle="Competenze aggiuntive personalizzabili per squadra">
        {ADDON.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {CONFIG.addonSkills.map((s) => (
              <span key={s.key} style={{ ...font, fontSize: 13, padding: "7px 13px", borderRadius: 99, background: C.orangeSoft, color: "#B4520A", fontWeight: 500 }}>{s.title}</span>
            ))}
          </div>
        )}
        <div style={{ ...font, fontSize: 13, color: C.muted, lineHeight: 1.6, background: C.surface, borderRadius: 12, padding: 14 }}>
          {ADDON.length > 0
            ? "Queste competenze aggiuntive vengono lette automaticamente dal Foglio."
            : "Nessuna add-on ancora definita. Per aggiungerne, inserisci una nuova voce in ADDON_META (con lo stesso formato delle core) e una colonna corrispondente sul Foglio, con valore 1–10: la dashboard la legge in automatico."}
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

  const [dati, setDati] = useState(null);   // { atleti, storico, lastPeriod }
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    Papa.parse(CONFIG.csvUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),     // evita bug da spazi negli header
      complete: (res) => {
        const headers = res.meta?.fields || [];
        const missing = META.filter((s) => !headers.includes(s.col)).map((s) => s.key);
        if (missing.length) {
          console.warn("[Atleta360] Colonne skill attese ma non trovate nel CSV:", missing);
          console.warn("[Atleta360] Header presenti nel CSV:", headers);
        }
        setDati(transform(res.data));
      },
      error: (e) => setErrore(e.message),
    });
  }, []);

  // Ricalcola i derivati dai dati reali (1:1 con le vecchie costanti del prototipo).
  const model = useMemo(() => {
    if (!dati) return null;
    const { atleti, storico, lastPeriod } = dati;
    const NOMI = Object.keys(atleti);
    const overall = (n) =>
      Math.round((SKILLS.reduce((a, k) => a + (atleti[n].scores[k] ?? 0), 0) / SKILLS.length) * 10) / 10;
    const RANK = [...NOMI].sort((a, b) => overall(b) - overall(a));
    const TEAM_AVG = SKILLS.map((k) => ({
      skill: SHORT[k], full: 10,
      valore: Math.round((NOMI.reduce((a, n) => a + (atleti[n].scores[k] ?? 0), 0) / Math.max(NOMI.length, 1)) * 10) / 10,
    }));
    return { atleti, storico, lastPeriod, NOMI, overall, RANK, TEAM_AVG };
  }, [dati]);

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

  // Contenuto dell'area principale in base allo stato dei dati.
  let content;
  if (errore) {
    content = (
      <StatusBox tone="error" title="Non riesco a leggere i dati"
        message="Controlla che il Foglio Google sia pubblicato sul web come CSV e che l'URL in CONFIG sia corretto. Dettaglio tecnico in console." />
    );
  } else if (!model) {
    content = <StatusBox title="Carico i dati della squadra…" message="Sto leggendo il Foglio Google pubblicato." />;
  } else if (model.NOMI.length === 0) {
    content = <StatusBox title="Nessun rilevamento ancora" message="Chiedi al mister di compilare il modulo: appena arriva il primo rilevamento, la dashboard si popola da sola." />;
  } else {
    content = <ViewComp d={model} />;
  }

  return (
    <div style={{ ...font, display: "flex", minHeight: "100vh", background: C.surface, color: C.ink }}>
      {/* Sidebar desktop */}
      <aside style={{ width: 250, background: C.navy, flexShrink: 0, position: "sticky", top: 0, height: "100vh", display: "none", flexDirection: "column" }} className="a360-sidebar">
        <Brand />
        <NavList />
        <div style={{ marginTop: "auto", padding: 18, ...font, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Dati dal Foglio Google · Atleta360</div>
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
          {content}
        </main>
      </div>
    </div>
  );
}
