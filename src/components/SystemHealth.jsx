// "Stato del sistema": la card che dice se qualcosa è rotto, prima che te ne
// accorga per caso. Solo admin. Vedi src/systemHealth.js per i controlli.
import { useState } from "react";
import { CheckCircle2, AlertTriangle, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "./ui";
import { useSystemHealth } from "../systemHealth";

function Voce({ v }) {
  return (
    <div style={{ padding: "7px 0", borderBottom: `1px solid ${C.grid}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {v.ok
          ? <CheckCircle2 size={15} color="#0F7A4E" style={{ flexShrink: 0 }} />
          : <AlertTriangle size={15} color="#B4232A" style={{ flexShrink: 0 }} />}
        <span style={{ ...font, fontSize: 13.5, color: C.ink, flex: 1 }}>{v.label}</span>
        {v.dettaglio && (
          <span style={{ ...font, fontSize: 12, color: v.ok ? C.muted : "#B4232A", textAlign: "right" }}>{v.dettaglio}</span>
        )}
      </div>
      {!v.ok && v.fix && (
        <div style={{ ...font, fontSize: 12.5, color: "#B4520A", lineHeight: 1.45, marginTop: 4, marginLeft: 23 }}>{v.fix}</div>
      )}
    </div>
  );
}

export default function SystemHealth() {
  const { checks, problemi, loading, ricontrolla } = useSystemHealth();
  const [aperto, setAperto] = useState(false);

  const tutto = loading ? 0 : checks.reduce((n, g) => n + g.voci.length, 0);
  const rotti = problemi.length;

  return (
    <Card title="Stato del sistema"
      subtitle={loading ? "Controllo in corso…" : rotti === 0 ? `Tutto a posto — ${tutto} controlli superati` : `${rotti} ${rotti === 1 ? "cosa da sistemare" : "cose da sistemare"} su ${tutto} controlli`}
      style={{ marginTop: 20 }} className="a360-noprint">

      {loading ? (
        <div style={{ ...font, fontSize: 13.5, color: C.muted }}>Sto verificando database, servizi e dati…</div>
      ) : (
        <>
          {/* I problemi sempre in vista; il resto si apre solo se lo chiedi. */}
          {rotti > 0 && (
            <div style={{ background: "#FDECEC", borderRadius: 12, padding: "4px 14px 10px", marginBottom: 12 }}>
              {problemi.map((v) => <Voce key={v.id} v={v} />)}
            </div>
          )}

          {rotti === 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 9, background: "#DDF3E7", color: "#0F7A4E",
              borderRadius: 12, padding: "12px 14px", ...font, fontSize: 13.5, fontWeight: 600, marginBottom: 12 }}>
              <CheckCircle2 size={17} /> Nessun problema rilevato.
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setAperto((v) => !v)}
              style={{ ...font, display: "inline-flex", alignItems: "center", gap: 6, height: 40, padding: "0 12px", borderRadius: 10,
                border: `1px solid ${C.grid}`, background: C.card, color: C.navy2, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {aperto ? <ChevronDown size={15} /> : <ChevronRight size={15} />} {aperto ? "Nascondi" : "Vedi tutti i controlli"}
            </button>
            <button onClick={ricontrolla}
              style={{ ...font, display: "inline-flex", alignItems: "center", gap: 6, height: 40, padding: "0 12px", borderRadius: 10,
                border: `1px solid ${C.grid}`, background: C.card, color: C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <RefreshCw size={14} /> Ricontrolla
            </button>
          </div>

          {aperto && checks.map((g) => (
            <div key={g.gruppo} style={{ marginTop: 16 }}>
              <div style={{ ...display, fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                {g.gruppo}
              </div>
              {g.voci.map((v) => <Voce key={v.id} v={v} />)}
            </div>
          ))}
        </>
      )}
    </Card>
  );
}
