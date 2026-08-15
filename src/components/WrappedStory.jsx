// "Il tuo Wrapped": il recap in formato storie, tap dopo tap, come quello
// di Spotify — il momento-evento, non solo una card statica. Riusa dati
// già calcolati altrove (WeeklyRecapCard/useStars/badges), nessuna
// chiamata in più: qui c'è solo la messa in scena.
import { useState } from "react";
import { X, Sparkles, Flame, Star, Trophy, Share2 } from "lucide-react";
import { C, font, display } from "../theme";
import Mascot from "./Mascot";
import { ShareButton } from "./ShareSheet";

const ACTION_LABEL = {
  checkin: "check-in energia", rsvp: "conferme presenza", self_assessment: "autovalutazioni",
  applause_given: "applausi dati", daily_moment: "momenti del giorno", quiz: "risposte al quiz", drop_raro: "drop fortunati",
};

function Slide({ children, bg }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "40px 28px", textAlign: "center", background: bg || "linear-gradient(160deg, #0A1650 0%, #17297A 100%)" }}>
      {children}
    </div>
  );
}

export default function WrappedStory({ name, total, byAction, streak, starsCount, badgesCount, level, onClose, shareData }) {
  const [i, setI] = useState(0);

  const slides = [
    <Slide key="intro">
      <Mascot size={70} style={{ marginBottom: 16 }} />
      <div style={{ ...font, fontSize: 13, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 1 }}>La tua settimana</div>
      <div style={{ ...display, fontSize: 30, fontWeight: 700, color: "#fff", marginTop: 8 }}>{name}</div>
    </Slide>,
    <Slide key="points">
      <Sparkles size={40} color="#FF7A18" style={{ marginBottom: 12 }} />
      <div style={{ ...display, fontSize: 64, fontWeight: 800, color: "#fff" }}>+{total}</div>
      <div style={{ ...font, fontSize: 15, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>punti guadagnati</div>
      {level?.level_label && (
        <div style={{ ...font, fontSize: 13, color: "#FF7A18", fontWeight: 700, marginTop: 14 }}>🏆 Livello {level.level_label}</div>
      )}
    </Slide>,
    ...(Object.keys(byAction || {}).length ? [
      <Slide key="actions">
        <div style={{ ...display, fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 18 }}>Cosa hai fatto</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 260 }}>
          {Object.entries(byAction).map(([a, n]) => (
            <div key={a} style={{ display: "flex", justifyContent: "space-between", background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 16px" }}>
              <span style={{ ...font, fontSize: 13.5, color: "#fff" }}>{ACTION_LABEL[a] || a}</span>
              <span style={{ ...display, fontSize: 14, fontWeight: 700, color: "#FF7A18" }}>{n}×</span>
            </div>
          ))}
        </div>
      </Slide>,
    ] : []),
    ...(streak >= 2 ? [
      <Slide key="streak">
        <Flame size={56} color="#FF7A18" />
        <div style={{ ...display, fontSize: 44, fontWeight: 800, color: "#fff", marginTop: 10 }}>{streak}</div>
        <div style={{ ...font, fontSize: 15, color: "rgba(255,255,255,0.75)" }}>giorni di fila 🔥</div>
      </Slide>,
    ] : []),
    ...(starsCount > 0 ? [
      <Slide key="stars">
        <Star size={48} color="#FFD34D" fill="#FFD34D" />
        <div style={{ ...display, fontSize: 40, fontWeight: 800, color: "#fff", marginTop: 10 }}>{starsCount}</div>
        <div style={{ ...font, fontSize: 15, color: "rgba(255,255,255,0.75)" }}>stelle dal mister</div>
      </Slide>,
    ] : []),
    ...(badgesCount > 0 ? [
      <Slide key="badges">
        <Trophy size={48} color="#FFD34D" />
        <div style={{ ...display, fontSize: 40, fontWeight: 800, color: "#fff", marginTop: 10 }}>{badgesCount}</div>
        <div style={{ ...font, fontSize: 15, color: "rgba(255,255,255,0.75)" }}>traguardi sbloccati finora</div>
      </Slide>,
    ] : []),
    <Slide key="outro" bg="linear-gradient(160deg, #7A0C1E 0%, #E8542E 100%)">
      <Mascot size={64} style={{ marginBottom: 14 }} />
      <div style={{ ...display, fontSize: 24, fontWeight: 700, color: "#fff" }}>Continua così! 💪</div>
      <div style={{ ...font, fontSize: 13.5, color: "rgba(255,255,255,0.85)", marginTop: 8, marginBottom: 20 }}>La prossima settimana si riparte da qui.</div>
      {shareData && (
        <div onClick={(e) => e.stopPropagation()}>
          <ShareButton kind="recap" label="Condividi il tuo Wrapped" icon={Share2} data={shareData} />
        </div>
      )}
    </Slide>,
  ];

  const go = (dir) => setI((v) => Math.max(0, Math.min(slides.length - 1, v + dir)));
  const onTap = (e) => {
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const half = e.currentTarget.getBoundingClientRect().width / 2;
    if (x < half) go(-1); else go(1);
  };

  return (
    <div className="a360-noprint" style={{ position: "fixed", inset: 0, zIndex: 220, background: "#000" }}>
      <div onClick={onTap} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", cursor: "pointer" }}>
        {slides[i]}
      </div>
      <div style={{ position: "fixed", top: "calc(10px + env(safe-area-inset-top))", left: 12, right: 12, display: "flex", gap: 4 }}>
        {slides.map((_, idx) => (
          <div key={idx} style={{ flex: 1, height: 3, borderRadius: 99, background: idx <= i ? "#fff" : "rgba(255,255,255,0.3)" }} />
        ))}
      </div>
      <button onClick={onClose} aria-label="Chiudi"
        style={{ position: "fixed", top: "calc(20px + env(safe-area-inset-top))", right: 14, background: "rgba(0,0,0,0.3)", border: "none", borderRadius: 99, width: 34, height: 34, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <X size={18} />
      </button>
    </div>
  );
}
