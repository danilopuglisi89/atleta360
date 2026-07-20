import { C, font, display } from "../theme";

/* ============================================================
   PRIMITIVE UI condivise dalle viste (card, righe punteggio,
   avatar a iniziali, select, stati, skeleton).
   ============================================================ */

export function Card({ title, subtitle, children, style, className = "" }) {
  return (
    <div className={`a360-reveal ${className}`.trim()} style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.grid}`, boxShadow: "0 1px 2px rgba(12,19,48,0.04)", padding: 20, ...style }}>
      {title && <h3 style={{ ...display, fontSize: 15, fontWeight: 600, color: C.ink, margin: 0 }}>{title}</h3>}
      {subtitle && <p style={{ ...font, fontSize: 13, color: C.muted, margin: "4px 0 0" }}>{subtitle}</p>}
      {(title || subtitle) && <div style={{ height: 16 }} />}
      {children}
    </div>
  );
}

export const initialsOf = (name) => (name || "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

/* Cerchio con iniziali + anello colorato (usato in podio e classifica). */
export function InitialsCircle({ name, size = 44, ring }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: C.navy2, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center", ...display, fontWeight: 700, fontSize: size * 0.36,
      border: ring ? `3px solid ${ring}` : "none", boxShadow: ring ? `0 0 0 3px ${ring}22` : "none", flexShrink: 0 }}>
      {initialsOf(name)}
    </div>
  );
}

/* Riga punteggio con barra (punti di forza / aree di crescita). */
export function Row({ label, value, color }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ ...font, fontSize: 13.5, color: C.ink }}>{label}</span>
        <span style={{ ...display, fontSize: 13.5, fontWeight: 600, color }}>{value}/10</span>
      </div>
      <div style={{ height: 7, background: C.surface, borderRadius: 99, overflow: "hidden" }}>
        <div className="a360-bar-fill" style={{ height: "100%", width: `${value * 10}%`, background: color, borderRadius: 99 }} />
      </div>
    </div>
  );
}

export function Select({ value, onChange, options, className }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className}
      style={{ ...font, fontSize: 14, color: C.ink, background: "#fff", border: `1px solid ${C.grid}`, borderRadius: 10, padding: "9px 12px", outline: "none", cursor: "pointer", minWidth: 180 }}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export const tooltipStyle = { background: C.navy, border: "none", borderRadius: 12, color: "#fff", fontSize: 12, ...font, boxShadow: "0 8px 24px rgba(10,22,80,0.25)" };

// Timbro visibile SOLO in stampa/PDF (.a360-print-only, vedi index.css):
// dà al documento un riferimento chiaro di provenienza e data.
export function PrintStamp({ label }) {
  const today = new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
  return (
    <div className="a360-print-only" style={{ ...font, fontSize: 11, color: C.muted, marginTop: 24, paddingTop: 12, borderTop: `1px solid ${C.grid}` }}>
      Atleta360{label ? ` · ${label}` : ""} · generato il {today}
    </div>
  );
}

/* Stati: caricamento / errore / vuoto. */
export function StatusBox({ title, message, tone = "info" }) {
  const accent = tone === "error" ? "#E11D48" : C.navy2;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.grid}`, borderRadius: 16, borderLeft: `4px solid ${accent}`, padding: "26px 24px", maxWidth: 560 }}>
      <div style={{ ...display, fontSize: 16, fontWeight: 600, color: C.ink }}>{title}</div>
      <div style={{ ...font, fontSize: 14, color: C.muted, marginTop: 8, lineHeight: 1.6 }}>{message}</div>
    </div>
  );
}

/* Skeleton loader stile Instagram. */
export function Skel({ w = "100%", h = 14, r = 8, style }) {
  return <div className="a360-skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

export function DashboardSkeleton() {
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ flex: "1 1 140px", background: C.card, border: `1px solid ${C.grid}`, borderRadius: 14, padding: "16px 18px" }}>
            <Skel w={60} h={26} />
            <div style={{ height: 8 }} />
            <Skel w="80%" h={12} />
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        {[0, 1].map((i) => (
          <div key={i} style={{ background: C.card, border: `1px solid ${C.grid}`, borderRadius: 16, padding: 20 }}>
            <Skel w={180} h={15} />
            <div style={{ height: 8 }} />
            <Skel w={240} h={12} />
            <div style={{ height: 20 }} />
            {i === 0
              ? <div style={{ margin: "0 auto", width: 220, height: 220, borderRadius: "50%" }} className="a360-skel" />
              : <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[0, 1, 2, 3, 4].map((j) => (<div key={j}><Skel w="100%" h={10} /><div style={{ height: 6 }} /><Skel w={`${80 - j * 12}%`} h={7} r={99} /></div>))}
                </div>}
          </div>
        ))}
      </div>
    </div>
  );
}
