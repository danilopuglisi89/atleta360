import { MessageCircle } from "lucide-react";
import { C, font } from "../theme";

export default function Footer() {
  const year = new Date().getFullYear();
  const sep = <span aria-hidden style={{ color: C.grid }}>·</span>;
  const waText = encodeURIComponent("Ciao Danilo, ti scrivo dalla dashboard Atleta360 di Oasi Volley.");
  return (
    <footer style={{ marginTop: "auto", width: "100%", padding: "0 clamp(18px, 4vw, 34px) clamp(18px, 4vw, 28px)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", borderTop: `1px solid ${C.grid}`, paddingTop: 18 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "6px 14px",
          textAlign: "center", ...font, fontSize: 12.5, color: C.muted }}>
          <span>© {year} <b style={{ color: C.ink, fontWeight: 600 }}>Danilo Puglisi</b> — Consulente e Formatore</span>
          {sep}
          <a href="https://www.danilopuglisi.com" target="_blank" rel="noopener noreferrer"
            style={{ color: C.navy2, textDecoration: "none", fontWeight: 500 }}>www.danilopuglisi.com</a>
          {sep}
          <a href={`https://wa.me/393770870217?text=${waText}`} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#1FA855", textDecoration: "none", fontWeight: 600 }}>
            <MessageCircle size={15} /> WhatsApp
          </a>
        </div>
        <div style={{ textAlign: "center", ...font, fontSize: 11.5, color: C.muted, opacity: 0.75, marginTop: 8 }}>
          Dashboard realizzata per Oasi Volley
        </div>
      </div>
    </footer>
  );
}

// Logo Danilo Puglisi fisso in basso a destra, su ogni pagina (desktop + mobile).
// Su mobile la classe a360-sitelogo lo alza sopra la tab bar (vedi index.css).
export function SiteLogo() {
  return (
    <a href="https://www.danilopuglisi.com" target="_blank" rel="noopener noreferrer" className="a360-noprint a360-sitelogo"
      title="Danilo Puglisi — Consulente e Formatore"
      style={{ position: "fixed", right: "clamp(10px, 2vw, 18px)", zIndex: 30,
        background: "#fff", borderRadius: 10, border: `1px solid ${C.grid}`, boxShadow: "0 4px 14px rgba(10,22,80,0.14)",
        padding: "5px 9px", display: "inline-flex", alignItems: "center", lineHeight: 0, textDecoration: "none" }}>
      <img src="/logo-danilo.jpg" alt="Danilo Puglisi — Consulente e Formatore"
        style={{ height: "clamp(20px, 4.5vw, 26px)", width: "auto", display: "block" }} />
    </a>
  );
}
