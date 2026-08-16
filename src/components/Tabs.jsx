// Linguette per Area Staff e Admin: una riga orizzontale che scorre sul
// telefono (come i filtri di Instagram). Il pallino `badge` segnala le cose
// in attesa (es. richieste di accesso da valutare).
import { C, font } from "../theme";

export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="a360-noprint" style={{ display: "flex", gap: 7, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 4, marginBottom: 18 }}>
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button key={t.id} onClick={() => onChange(t.id)}
            style={{ ...font, position: "relative", flexShrink: 0, fontSize: 13.5, fontWeight: on ? 700 : 500, padding: "9px 16px", borderRadius: 99,
              cursor: "pointer", border: `1.5px solid ${on ? C.orange : C.grid}`, background: on ? C.orange : C.card, color: on ? "#fff" : C.ink, transition: "all .15s" }}>
            {t.label}
            {t.badge > 0 && (
              <span style={{ position: "absolute", top: -5, right: -5, minWidth: 17, height: 17, borderRadius: 99, background: "#E11D48", color: "#fff",
                fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: "2px solid #fff" }}>
                {t.badge > 9 ? "9+" : t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
