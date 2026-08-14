// Rete di sicurezza: se una vista va in errore durante il render (bug,
// chunk non caricato dopo un deploy, ecc.) mostra un messaggio con un
// pulsante "Ricarica" invece di lasciare la pagina bianca senza spiegazioni.
import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { C, font, display } from "../theme";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ background: C.card, border: `1px solid ${C.grid}`, borderRadius: 16, padding: 28, textAlign: "center", maxWidth: 440, margin: "40px auto" }}>
        <AlertTriangle size={30} color="#B4232A" style={{ marginBottom: 10 }} />
        <div style={{ ...display, fontSize: 16, fontWeight: 700, color: C.ink }}>Qualcosa non ha funzionato</div>
        <p style={{ ...font, fontSize: 13.5, color: C.muted, lineHeight: 1.55, marginTop: 8 }}>
          Prova a ricaricare la pagina. Se il problema continua, avvisa Danilo.
        </p>
        <button onClick={() => window.location.reload()}
          style={{ ...font, marginTop: 16, display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 11, border: "none", background: C.orange, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          <RefreshCw size={16} /> Ricarica
        </button>
      </div>
    );
  }
}
