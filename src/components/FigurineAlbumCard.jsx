// L'album figurine — la killer feature del mondo magico (Ondata 3): ogni
// 20 punti si guadagna un pacchetto da 3 compagne a caso, doppioni
// possibili. Lo scambio dei doppioni resta manuale in chat, per scelta.
import { useState } from "react";
import { Gift, Sparkles, X } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "./ui";
import FigurineCard from "./FigurineCard";
import { useFigurines } from "../figurine";

export default function FigurineAlbumCard({ uid, roster }) {
  const { packs, collection, open, loading } = useFigurines(uid);
  const [opening, setOpening] = useState(false);
  const [revealed, setRevealed] = useState(null);   // array di card appena aperte

  if (!uid || loading) return null;

  const byAthlete = Object.fromEntries((collection || []).map((c) => [c.athlete_id, c.copies]));
  const rosterById = Object.fromEntries((roster || []).map((r) => [r.id, r]));
  const owned = (collection || []).length;
  const total = (roster || []).length;
  const duplicates = (collection || []).filter((c) => c.copies >= 2).length;

  const doOpen = async () => {
    setOpening(true);
    const { cards } = await open();
    setOpening(false);
    if (cards.length) {
      navigator.vibrate?.([15, 30, 15, 30, 40]);
      setRevealed(cards.map((c) => ({ ...c, ...rosterById[c.athlete_id] })));
    }
  };

  return (
    <Card title="Album figurine" subtitle={`${owned}/${total} compagne raccolte${duplicates ? ` · ${duplicates} doppioni da scambiare in chat` : ""}`} style={{ marginTop: 16 }} className="a360-noprint">
      {packs > 0 && (
        <button onClick={doOpen} disabled={opening}
          style={{ ...font, display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "12px 20px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #FFB020, #FF7A18)", color: "#fff", fontSize: 14.5, fontWeight: 700, cursor: opening ? "default" : "pointer",
            boxShadow: "0 6px 18px rgba(255,122,24,0.35)" }}>
          <Gift size={18} /> {opening ? "Apro…" : `Apri pacchetto (${packs})`}
        </button>
      )}
      {packs === 0 && (
        <div style={{ ...font, fontSize: 12.5, color: C.muted, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={13} /> Ogni 20 punti guadagni un pacchetto nuovo.
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-start" }}>
        {(roster || []).map((r) => (
          <FigurineCard key={r.id} identifier={r.identifier} position={r.position} copies={byAthlete[r.id] || 0} locked={!byAthlete[r.id]} size="small" />
        ))}
      </div>

      {revealed && (
        <div className="a360-noprint" onClick={() => setRevealed(null)}
          style={{ position: "fixed", inset: 0, zIndex: 130, background: "rgba(6,10,30,0.9)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <button onClick={() => setRevealed(null)} aria-label="Chiudi"
            style={{ position: "fixed", top: 16, right: 16, width: 40, height: 40, borderRadius: 12, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={20} />
          </button>
          <div style={{ ...display, fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 20 }}>Il tuo pacchetto! 🎉</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }} onClick={(e) => e.stopPropagation()}>
            {revealed.map((c, i) => (
              <div key={c.athlete_id + i} className="a360-pop" style={{ animationDelay: `${i * 220}ms`, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <FigurineCard identifier={c.identifier} position={c.position} copies={byAthlete[c.athlete_id] || 1} />
                <span style={{ ...font, fontSize: 12, fontWeight: 700, color: c.was_new ? "#4FD8EA" : "rgba(255,255,255,0.6)" }}>
                  {c.was_new ? "✨ Nuova!" : "Doppione"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
