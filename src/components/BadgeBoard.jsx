// Bacheca completa dei traguardi: quelli conquistati a colori, quelli
// ancora bloccati in grigio con il suggerimento per sbloccarli.
import { useState } from "react";
import { ChevronDown, ChevronUp, Lock } from "lucide-react";
import { C, font, display } from "../theme";
import { badgeCatalog } from "../badges";

export default function BadgeBoard({ model, name, earned }) {
  const [open, setOpen] = useState(false);
  const catalog = badgeCatalog(model);
  const earnedIds = new Set(earned.map((b) => b.id));
  const lockedCount = catalog.length - earned.length;

  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={() => setOpen((v) => !v)} className="a360-noprint"
        style={{ ...font, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: C.navy2, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {open ? "Nascondi tutti i traguardi" : `Vedi tutti i traguardi (${earned.length}/${catalog.length}${lockedCount > 0 ? `, ${lockedCount} da sbloccare` : ""})`}
      </button>

      {open && (
        <div className="a360-reveal" style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
          {catalog.map((b) => {
            const got = earnedIds.has(b.id);
            return (
              <div key={b.id} title={got ? "" : `Da sbloccare: ${b.hint}`}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 12, padding: "8px 12px", minWidth: 180,
                  background: got ? C.surface : C.card, border: `1px solid ${got ? `${b.color}33` : C.grid}`,
                  borderLeft: `3px solid ${got ? b.color : C.grid}`, opacity: got ? 1 : 0.55 }}>
                <span style={{ fontSize: 20, lineHeight: 1, filter: got ? "none" : "grayscale(1)" }}>{b.emoji}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...display, fontSize: 13, fontWeight: 700, color: got ? C.ink : C.muted, display: "flex", alignItems: "center", gap: 5 }}>
                    {b.label} {!got && <Lock size={10} />}
                  </div>
                  <div style={{ ...font, fontSize: 11, color: C.muted }}>{got ? "Sbloccato" : b.hint}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
