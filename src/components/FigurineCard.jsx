import { C, font, display } from "../theme";
import { InitialsCircle } from "./ui";

// Una figurina: nome + ruolo + un bordo che "brilla" se ne hai più di una
// copia (il doppione diventa un piccolo vanto, non solo scarto da scambiare).
export default function FigurineCard({ identifier, position, copies = 0, locked, size = "normal" }) {
  const shiny = copies >= 2;
  const small = size === "small";
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      width: small ? 92 : 130, padding: small ? "12px 8px" : "18px 12px", borderRadius: 16,
      background: locked ? C.surface : (shiny ? "linear-gradient(160deg, #FFF6DD 0%, #FFE9AE 100%)" : C.card),
      border: `2px solid ${locked ? C.grid : shiny ? "#E8B923" : C.grid}`,
      boxShadow: shiny ? "0 4px 14px rgba(232,185,35,0.35)" : "0 1px 3px rgba(12,19,48,0.06)",
      position: "relative", opacity: locked ? 0.55 : 1,
    }}>
      {shiny && !locked && (
        <span style={{ position: "absolute", top: 6, right: 6, ...font, fontSize: 10, fontWeight: 700, color: "#7A5A00", background: "#FFE9AE", borderRadius: 99, padding: "2px 6px" }}>
          ×{copies}
        </span>
      )}
      <InitialsCircle name={locked ? "?" : identifier} size={small ? 44 : 58} ring={locked ? C.grid : (shiny ? "#E8B923" : C.orange)} />
      <div style={{ textAlign: "center", minWidth: 0, width: "100%" }}>
        <div style={{ ...display, fontSize: small ? 11.5 : 13, fontWeight: 700, color: locked ? C.muted : C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {locked ? "???" : identifier}
        </div>
        {!locked && position && <div style={{ ...font, fontSize: 10.5, color: C.muted, marginTop: 1 }}>{position}</div>}
      </div>
    </div>
  );
}
