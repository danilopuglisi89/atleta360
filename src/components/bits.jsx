import { Quote } from "lucide-react";
import { C, font, display } from "../theme";
import { phraseOfTheDay } from "../phrases";

/* Frase motivazionale del giorno. */
export function MotivationCard() {
  const phrase = phraseOfTheDay();
  return (
    <div className="a360-reveal" style={{ background: `linear-gradient(120deg, ${C.navy} 0%, ${C.navy2} 100%)`, borderRadius: 16,
      padding: "20px 22px", marginBottom: 20, position: "relative", overflow: "hidden" }}>
      <Quote size={64} style={{ position: "absolute", right: 12, top: 6, color: "rgba(255,255,255,0.08)" }} />
      <div style={{ ...font, fontSize: 11.5, color: C.orange, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 }}>Frase del giorno</div>
      <div style={{ ...display, fontSize: "clamp(16px, 2.6vw, 20px)", fontWeight: 600, color: "#fff", lineHeight: 1.45, position: "relative", maxWidth: 720 }}>
        {phrase}
      </div>
    </div>
  );
}

/* Striscia dei badge conquistati. */
export function BadgeStrip({ badges }) {
  if (!badges.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {badges.map((b, i) => (
        <div key={b.id} className="a360-reveal" title={b.desc}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.surface, border: `1px solid ${b.color}33`,
            borderLeft: `3px solid ${b.color}`, borderRadius: 12, padding: "8px 12px", animationDelay: `${i * 0.06}s` }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>{b.emoji}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...display, fontSize: 13, fontWeight: 700, color: C.ink }}>{b.label}</div>
            <div style={{ ...font, fontSize: 11.5, color: C.muted }}>{b.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
