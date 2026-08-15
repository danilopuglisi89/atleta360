// Home personalizzabile: ogni atleta sceglie quali card mostrare nella
// propria Home (stile widget) — la Home resta ricca di default, si nasconde
// solo quello che non interessa. Salvato su profiles.home_hidden via RPC
// (set_my_home_hidden, vedi supabase/q1.sql), mai un update diretto.
import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { C, font, display } from "../theme";
import { supabase } from "../supabaseClient";

export const HOME_CARDS = [
  { id: "mission", label: "Missione del giorno" },
  { id: "weeklyChallenge", label: "Sfida della settimana" },
  { id: "weeklyRecap", label: "La tua settimana" },
  { id: "streakBuddy", label: "Streak di coppia" },
  { id: "figurine", label: "Album figurine" },
  { id: "season", label: "Capsula stagione" },
  { id: "song", label: "Canzone della settimana" },
  { id: "quiz", label: "Quiz settimanale" },
  { id: "dailyMoment", label: "Momento del giorno" },
];

export default function HomeCustomizer({ hidden, onToggle }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} title="Personalizza la Home" className="a360-noprint"
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 10,
          border: `1px solid ${C.grid}`, background: C.card, color: C.muted, cursor: "pointer" }}>
        <SlidersHorizontal size={16} />
      </button>

      {open && (
        <div onClick={() => setOpen(false)} className="a360-noprint"
          style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(10,19,48,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, background: C.card, borderRadius: "18px 18px 0 0", padding: "20px 22px calc(24px + env(safe-area-inset-bottom))", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ ...display, fontSize: 16, fontWeight: 700, color: C.ink }}>Personalizza la Home</div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ ...font, fontSize: 12.5, color: C.muted, marginBottom: 14 }}>Scegli quali card vuoi vedere — le altre restano sempre disponibili nelle rispettive sezioni.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {HOME_CARDS.map((c) => {
                const on = !hidden.includes(c.id);
                return (
                  <button key={c.id} onClick={() => onToggle(c.id)}
                    style={{ ...font, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14, color: C.ink,
                      padding: "11px 4px", borderRadius: 10, border: "none", background: "none", cursor: "pointer", textAlign: "left" }}>
                    {c.label}
                    <span style={{ width: 40, height: 22, borderRadius: 99, background: on ? C.orange : C.grid, position: "relative", transition: "background .15s", flexShrink: 0 }}>
                      <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export async function saveHomeHidden(hidden) {
  await supabase.rpc("set_my_home_hidden", { hidden });
}
