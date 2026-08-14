// Routine mentale pre-partita guidata, 3 passi: respirazione, visualizzazione,
// frase di carica. Nessun dato salvato — solo un momento guidato prima
// di scendere in campo. Aperta da un pulsante (NextEventCard) o dal click
// sulla notifica push "tra poco si gioca".
import { useEffect, useState } from "react";
import { Wind, Eye, Flame, X, ChevronRight } from "lucide-react";
import { C, font, display } from "../theme";

const STEPS = [
  { icon: Wind, title: "Respira", color: "#0EA5E9" },
  { icon: Eye, title: "Visualizza", color: "#8B5CF6" },
  { icon: Flame, title: "Carica", color: "#E11D74" },
];

function BreathingStep() {
  const [phase, setPhase] = useState("in");
  useEffect(() => {
    const cycle = () => setPhase((p) => (p === "in" ? "out" : "in"));
    const id = setInterval(cycle, 4000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: 140, height: 140, borderRadius: "50%", margin: "10px auto 18px",
        background: "radial-gradient(circle, #E0F2FE 0%, #BAE6FD 100%)", border: "3px solid #0EA5E9",
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: phase === "in" ? "scale(1.15)" : "scale(0.85)",
        transition: "transform 4s ease-in-out",
      }}>
        <span style={{ ...display, fontSize: 16, fontWeight: 700, color: "#0369A1" }}>{phase === "in" ? "Inspira" : "Espira"}</span>
      </div>
      <p style={{ ...font, fontSize: 13.5, color: C.muted, lineHeight: 1.6 }}>
        Segui il cerchio: inspira mentre si allarga, espira mentre si stringe. Qualche respiro, senza fretta.
      </p>
    </div>
  );
}

function VisualizeStep() {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>🏐</div>
      <p style={{ ...font, fontSize: 14.5, color: C.ink, lineHeight: 1.7, maxWidth: 320, margin: "0 auto" }}>
        Chiudi gli occhi un attimo. Immaginati in campo: il primo pallone che tocchi va esattamente dove vuoi.
        Vedi il gesto perfetto, senti il controllo. Sei pronta.
      </p>
    </div>
  );
}

function ChargeStep() {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>🔥</div>
      <div style={{ ...display, fontSize: 19, fontWeight: 700, color: C.ink, lineHeight: 1.4 }}>
        "Qui e ora. Punto dopo punto."
      </div>
      <p style={{ ...font, fontSize: 13.5, color: C.muted, marginTop: 10 }}>
        Sei pronta. Vai a giocartela — insieme alla squadra. 💪
      </p>
    </div>
  );
}

export default function PreMatchRoutine({ onClose }) {
  const [step, setStep] = useState(0);
  const Icon = STEPS[step].icon;

  return (
    <div className="a360-noprint" style={{ position: "fixed", inset: 0, zIndex: 96, background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <button onClick={onClose} aria-label="Chiudi" style={{ position: "absolute", top: 18, right: 18, background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", padding: 8 }}>
        <X size={20} />
      </button>

      <div style={{ maxWidth: 380, width: "100%", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 22 }}>
          {STEPS.map((s, i) => (
            <span key={s.title} style={{ width: 8, height: 8, borderRadius: 99, background: i <= step ? s.color : "rgba(255,255,255,0.25)" }} />
          ))}
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.08)", borderRadius: 99, padding: "6px 14px", marginBottom: 20 }}>
          <Icon size={15} color={STEPS[step].color} />
          <span style={{ ...font, fontSize: 12, color: "#fff", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{STEPS[step].title}</span>
        </div>

        <div style={{ background: C.card, borderRadius: 20, padding: "26px 22px" }}>
          {step === 0 && <BreathingStep />}
          {step === 1 && <VisualizeStep />}
          {step === 2 && <ChargeStep />}
        </div>

        <button onClick={() => (step < 2 ? setStep(step + 1) : onClose())}
          style={{ ...font, marginTop: 20, display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 26px", borderRadius: 14, border: "none", background: C.orange, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          {step < 2 ? "Avanti" : "Sono pronta"} <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}
