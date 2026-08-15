// Card "Come stai" nel profilo: check-in di oggi, diario privato (solo lei
// e l'admin), e stato di indisponibilità/infortunio. Un solo blocco per non
// disperdere questi strumenti in tre posti diversi.
import { useState } from "react";
import { BookHeart, Zap, ShieldAlert, Trash2 } from "lucide-react";
import { C, font, display } from "../theme";
import { useDiary, useCheckins, useUnavailability } from "../wellbeing";

const MOOD_EMOJI = ["😞", "😕", "😐", "🙂", "😄"];
const fmtDate = (iso) => new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });

export default function WellbeingCard({ athleteId, canSeeAll }) {
  const { entries, addEntry, removeEntry } = useDiary(athleteId);
  const { today, setEnergy } = useCheckins(athleteId);
  const { current, setUnavailable, clear } = useUnavailability(athleteId);

  const [mood, setMood] = useState(3);
  const [energy, setEnergyDraft] = useState(3);
  const [note, setNote] = useState("");
  const [showUnavail, setShowUnavail] = useState(false);
  const [until, setUntil] = useState("");
  const [reason, setReason] = useState("");
  const [checkinError, setCheckinError] = useState(null);

  if (!athleteId) return null;

  const onSetEnergy = async (n) => {
    setCheckinError(null);
    const error = await setEnergy(n);
    if (error) setCheckinError(error);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Check-in di oggi */}
      <div id="a360-checkin" className="a360-reveal a360-noprint" style={{ background: C.card, border: `1px solid ${C.grid}`, borderRadius: 16, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, ...font, fontSize: 12, color: C.orange, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
          <Zap size={14} /> Come stai oggi?
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => onSetEnergy(n)}
              style={{ flex: 1, padding: "10px 0", borderRadius: 10, cursor: "pointer", fontSize: 20,
                border: `2px solid ${today === n ? C.orange : C.grid}`, background: today === n ? C.orangeSoft : C.card }}>
              {["😴", "😕", "😐", "💪", "🔥"][n - 1]}
            </button>
          ))}
        </div>
        {today && <div style={{ ...font, fontSize: 12, color: C.muted, marginTop: 6 }}>Registrato per oggi — puoi cambiarlo quando vuoi.</div>}
        {checkinError && <div style={{ ...font, fontSize: 12, color: "#B4232A", marginTop: 6 }}>Non salvato: {checkinError}</div>}
      </div>

      {/* Diario privato */}
      <div className="a360-reveal a360-noprint" style={{ background: C.card, border: `1px solid ${C.grid}`, borderRadius: 16, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, ...font, fontSize: 12, color: C.navy2, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
          <BookHeart size={14} /> Il tuo diario {canSeeAll ? "" : "(privato)"}
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ ...font, fontSize: 11.5, color: C.muted, marginBottom: 4 }}>Umore</div>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setMood(n)}
                  style={{ fontSize: 18, padding: 4, borderRadius: 8, border: `2px solid ${mood === n ? C.orange : "transparent"}`, background: "none", cursor: "pointer" }}>
                  {MOOD_EMOJI[n - 1]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ ...font, fontSize: 11.5, color: C.muted, marginBottom: 4 }}>Energia</div>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setEnergyDraft(n)}
                  style={{ ...font, fontSize: 12, fontWeight: 700, width: 28, height: 28, borderRadius: 8, border: `2px solid ${energy === n ? C.orange : C.grid}`, background: energy === n ? C.orangeSoft : C.card, color: energy === n ? C.orange : C.muted, cursor: "pointer" }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Come ti senti oggi? (facoltativo)"
          style={{ ...font, fontSize: 13.5, marginTop: 10, width: "100%", boxSizing: "border-box", border: `1px solid ${C.grid}`, borderRadius: 9, padding: "8px 11px", outline: "none", resize: "vertical" }} />
        <button onClick={() => { addEntry({ mood, energy, note }); setNote(""); }}
          style={{ ...font, marginTop: 8, fontSize: 12.5, fontWeight: 600, padding: "8px 14px", borderRadius: 9, border: "none", background: C.navy2, color: "#fff", cursor: "pointer" }}>
          Salva nel diario
        </button>

        {entries.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14, borderTop: `1px solid ${C.grid}`, paddingTop: 12 }}>
            {entries.slice(0, 8).map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5 }}>
                <span style={{ ...font, color: C.muted, whiteSpace: "nowrap" }}>{fmtDate(e.created_at)}</span>
                <span>{MOOD_EMOJI[(e.mood || 3) - 1]}</span>
                <span style={{ ...font, color: C.ink, flex: 1 }}>{e.note || "—"}</span>
                <button onClick={() => removeEntry(e.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 2 }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Indisponibilità */}
      <div className="a360-reveal a360-noprint" style={{ background: current ? "#FDECEC" : C.card, border: `1px solid ${current ? "#F0B4B7" : C.grid}`, borderRadius: 16, padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, ...font, fontSize: 12, color: "#B4232A", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
          <ShieldAlert size={14} /> Indisponibilità / infortunio
        </div>
        {current ? (
          <>
            <div style={{ ...font, fontSize: 13.5, color: C.ink, marginTop: 6 }}>
              Segnata indisponibile fino al <b>{fmtDate(current.until)}</b>{current.reason ? ` — ${current.reason}` : ""}.
              Promemoria e alert sono sospesi per questo periodo.
            </div>
            <button onClick={clear}
              style={{ ...font, marginTop: 8, fontSize: 12.5, fontWeight: 600, padding: "7px 12px", borderRadius: 9, border: "none", background: "#0F7A4E", color: "#fff", cursor: "pointer" }}>
              Sono di nuovo disponibile
            </button>
          </>
        ) : showUnavail ? (
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} style={{ ...font, fontSize: 13, border: `1px solid ${C.grid}`, borderRadius: 9, padding: "7px 10px" }} />
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (facoltativo)" style={{ ...font, fontSize: 13, border: `1px solid ${C.grid}`, borderRadius: 9, padding: "7px 10px", flex: "1 1 140px" }} />
            <button onClick={() => { if (until) { setUnavailable(until, reason); setShowUnavail(false); setUntil(""); setReason(""); } }}
              style={{ ...font, fontSize: 12.5, fontWeight: 600, padding: "7px 12px", borderRadius: 9, border: "none", background: "#B4232A", color: "#fff", cursor: "pointer" }}>
              Conferma
            </button>
          </div>
        ) : (
          <button onClick={() => setShowUnavail(true)}
            style={{ ...font, marginTop: 8, fontSize: 12.5, fontWeight: 600, padding: "7px 12px", borderRadius: 9, border: `1px solid ${C.grid}`, background: C.card, color: C.ink, cursor: "pointer" }}>
            Segnala indisponibilità
          </button>
        )}
      </div>
    </div>
  );
}
