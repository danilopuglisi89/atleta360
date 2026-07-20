import { C, font, display, MEDALS } from "../theme";
import { InitialsCircle } from "./ui";

/* Podio oro/argento/bronzo per le prime 3 della classifica. */
function Podium({ names, overall, onOpen }) {
  const top = names.slice(0, 3);
  if (top.length < 3) return null;
  // Ordine visivo: 2ª (sx), 1ª (centro, più alta), 3ª (dx).
  const layout = [
    { name: top[1], rank: 2, h: 74, av: 46 },
    { name: top[0], rank: 1, h: 104, av: 60 },
    { name: top[2], rank: 3, h: 58, av: 42 },
  ];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 12, marginBottom: 18 }}>
      {layout.map((p, i) => {
        const medal = MEDALS[p.rank - 1];
        return (
          <div key={p.name} className="a360-reveal" onClick={onOpen ? () => onOpen(p.name) : undefined}
            title={onOpen ? `Apri il profilo di ${p.name}` : undefined}
            style={{ flex: "1 1 0", maxWidth: 130, textAlign: "center", animationDelay: `${i * 0.08}s`, cursor: onOpen ? "pointer" : "default" }}>
            <div style={{ position: "relative", display: "inline-block", marginBottom: 8 }}>
              <InitialsCircle name={p.name} size={p.av} ring={medal} />
              {p.rank === 1 && <div style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", fontSize: 20 }}>👑</div>}
            </div>
            <div className={onOpen ? "a360-clickname" : undefined} style={{ ...font, fontSize: 12.5, color: C.ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
            <div style={{ ...display, fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 6 }}>{overall(p.name).toFixed(1)}</div>
            <div style={{ height: p.h, borderRadius: "10px 10px 0 0", background: `linear-gradient(180deg, ${medal} 0%, ${medal}CC 100%)`,
              display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 8, ...display, fontWeight: 700, fontSize: 22, color: "#fff", boxShadow: "inset 0 2px 6px rgba(255,255,255,0.25)" }}>
              {p.rank}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Classifica: podio in alto + barre per le altre atlete. */
export default function Classifica({ RANK, overall, onOpen }) {
  const max = Math.max(...RANK.map(overall), 1);
  const hasPodium = RANK.length >= 3;
  const rest = hasPodium ? RANK.slice(3) : RANK;
  return (
    <div>
      {hasPodium && <Podium names={RANK} overall={overall} onOpen={onOpen} />}
      {rest.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: hasPodium ? `1px solid ${C.grid}` : "none", paddingTop: hasPodium ? 14 : 0 }}>
          {rest.map((n, i) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ ...display, fontWeight: 700, fontSize: 14, width: 22, color: C.muted }}>{hasPodium ? i + 4 : i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span className={onOpen ? "a360-clickname" : undefined} onClick={onOpen ? () => onOpen(n) : undefined}
                    title={onOpen ? `Apri il profilo di ${n}` : undefined}
                    style={{ ...font, fontSize: 13.5, color: C.ink }}>{n}</span>
                  <span style={{ ...display, fontSize: 13.5, fontWeight: 600, color: C.navy }}>{overall(n).toFixed(1)}</span>
                </div>
                <div style={{ height: 7, background: C.surface, borderRadius: 99, overflow: "hidden" }}>
                  <div className="a360-bar-fill" style={{ height: "100%", width: `${(overall(n) / max) * 100}%`, background: C.navy2, borderRadius: 99 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
