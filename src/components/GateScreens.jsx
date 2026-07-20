import { RefreshCw, LogOut } from "lucide-react";
import { C, font, display } from "../theme";

// Schermata a tutto schermo per gli stati del cancello (attesa / rifiuto / caricamento).
export function GateScreen({ title, message, onLogout, onRefresh }) {
  return (
    <div style={{ ...font, minHeight: "100vh", background: `linear-gradient(160deg, ${C.navy} 0%, ${C.navy2} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 11, marginBottom: 22 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", ...display, fontWeight: 700, color: "#fff", fontSize: 14, letterSpacing: -0.5 }}>360</div>
          <div style={{ ...display, color: "#fff", fontWeight: 700, fontSize: 22, letterSpacing: -0.3 }}>Atleta360</div>
        </div>
        <div style={{ background: C.card, borderRadius: 18, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.28)" }}>
          <div style={{ ...display, fontSize: 18, fontWeight: 700, color: C.ink }}>{title}</div>
          <p style={{ ...font, fontSize: 14, color: C.muted, lineHeight: 1.6, marginTop: 10 }}>{message}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
            {onRefresh && (
              <button onClick={onRefresh} style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 11, border: "none", background: C.orange, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                <RefreshCw size={16} /> Controlla di nuovo
              </button>
            )}
            {onLogout && (
              <button onClick={onLogout} style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 11, border: `1px solid ${C.grid}`, background: "#fff", color: C.muted, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                <LogOut size={16} /> Esci
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Mostrata se le variabili d'ambiente di Supabase non sono configurate.
export function SetupNotice() {
  return (
    <div style={{ ...font, minHeight: "100vh", background: C.surface, color: C.ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 560, background: C.card, border: `1px solid ${C.grid}`, borderLeft: `4px solid ${C.orange}`, borderRadius: 16, padding: "26px 24px" }}>
        <div style={{ ...display, fontSize: 17, fontWeight: 700, color: C.ink }}>Accesso non ancora configurato</div>
        <p style={{ ...font, fontSize: 14, color: C.muted, lineHeight: 1.6, marginTop: 10 }}>
          Mancano le credenziali di Supabase. Crea un file <code>.env</code> (vedi <code>.env.example</code>)
          con <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>, poi riavvia l'app.
          Le istruzioni complete sono nel <b>README</b>.
        </p>
      </div>
    </div>
  );
}
