// Sfida della settimana: proposta automatica sul focus più debole
// dell'atleta, con la sua descrizione. Nessuna tabella nuova — calcolata
// al volo dai punteggi correnti, cambia da sola man mano che l'atleta cresce.
import { Target } from "lucide-react";
import { C, font, display } from "../theme";
import { CORE, TITLE, SKILL_META } from "../skills";

export default function WeeklyChallengeCard({ scores }) {
  if (!scores || !CORE.length) return null;
  const weakest = [...CORE].sort((a, b) => (scores[a] ?? 10) - (scores[b] ?? 10))[0];
  if (!weakest) return null;
  const meta = SKILL_META.find((s) => s.key === weakest);

  return (
    <div className="a360-reveal a360-noprint" style={{ background: C.orangeSoft, border: `1px solid ${C.orange}55`, borderRadius: 16, padding: "16px 18px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, ...font, fontSize: 11.5, color: C.orange, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" }}>
        <Target size={14} /> Sfida della settimana
      </div>
      <div style={{ ...display, fontSize: 16, fontWeight: 700, color: C.ink, marginTop: 6 }}>{TITLE[weakest] || meta?.title}</div>
      {meta?.description && <p style={{ ...font, fontSize: 13, color: C.ink, opacity: 0.85, marginTop: 4, lineHeight: 1.5 }}>{meta.description}</p>}
    </div>
  );
}
