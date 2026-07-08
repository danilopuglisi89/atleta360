import { X, MessageCircle, ClipboardList, Instagram, Facebook, Shirt } from "lucide-react";
import { C, font, display, ringForScore } from "./theme";
import { Avatar } from "./PersonalArea";

// ============================================================
// Card pubblica dell'atleta (stile social): foto, nome, ruolo e il
// pulsante "Messaggio privato" (chat privata esistente). NON mostra
// punteggi né dati di rendimento: quelli restano nel profilo atleta.
// ============================================================
export default function PublicProfileCard({ identifier, model, entry, viewer, onClose, onMessage, onFullProfile }) {
  const name = entry?.name || identifier;
  const position = model?.atleti?.[identifier]?.position || entry?.ruolo || "Atleta";
  const jersey = entry?.jersey_number;
  const ring = ringForScore(model?.overall ? model.overall(identifier) : 0);
  const recipientId = entry?.id;
  const canMessage = viewer?.isAthlete && recipientId && recipientId !== viewer?.uid;
  const isSelf = recipientId && recipientId === viewer?.uid;

  const social = [];
  if (entry?.instagram) social.push({ icon: Instagram, url: entry.instagram.startsWith("http") ? entry.instagram : `https://instagram.com/${entry.instagram.replace(/^@/, "")}`, label: "Instagram" });
  if (entry?.facebook) social.push({ icon: Facebook, url: entry.facebook.startsWith("http") ? entry.facebook : `https://facebook.com/${entry.facebook}`, label: "Facebook" });

  return (
    <div onClick={onClose} className="a360-noprint"
      style={{ position: "fixed", inset: 0, zIndex: 75, background: "rgba(10,19,48,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} className="a360-reveal"
        style={{ width: "100%", maxWidth: 340, background: C.card, borderRadius: 20, overflow: "hidden", boxShadow: "0 24px 70px rgba(0,0,0,0.35)" }}>
        {/* Banner + chiudi */}
        <div style={{ height: 56, background: `linear-gradient(120deg, ${C.navy} 0%, ${C.navy2} 100%)`, position: "relative" }}>
          <button onClick={onClose} aria-label="Chiudi" style={{ position: "absolute", top: 9, right: 9, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 8, cursor: "pointer", padding: 4, display: "inline-flex" }}><X size={17} /></button>
        </div>

        <div style={{ padding: "0 20px 20px", textAlign: "center", marginTop: -42 }}>
          <div style={{ display: "inline-block", background: C.card, borderRadius: "50%", padding: 4 }}>
            <Avatar url={entry?.avatar_url} name={name} size={80} ring={ring} />
          </div>
          <div style={{ ...display, fontSize: 19, fontWeight: 700, color: C.ink, marginTop: 8 }}>{name}</div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, flexWrap: "wrap", marginTop: 7 }}>
            <span style={{ ...font, fontSize: 12.5, fontWeight: 600, color: C.navy2, background: C.surface, border: `1px solid ${C.grid}`, padding: "5px 12px", borderRadius: 99 }}>{position}</span>
            {jersey && <span style={{ ...font, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600, color: C.orange, background: C.orangeSoft, padding: "5px 12px", borderRadius: 99 }}><Shirt size={13} /> {jersey}</span>}
          </div>

          {social.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 13 }}>
              {social.map((s, i) => {
                const Icon = s.icon;
                return (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" title={s.label}
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.grid}`, background: "#fff", color: C.navy2 }}>
                    <Icon size={17} />
                  </a>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 16 }}>
            {canMessage && (
              <button onClick={() => onMessage(recipientId, name)}
                style={{ ...font, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 16px", borderRadius: 11, border: "none", background: C.orange, color: "#fff", fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}>
                <MessageCircle size={17} /> Messaggio privato
              </button>
            )}
            {onFullProfile && (
              <button onClick={() => onFullProfile(identifier)}
                style={{ ...font, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", borderRadius: 11, border: `1px solid ${C.grid}`, background: "#fff", color: C.navy2, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                <ClipboardList size={16} /> Vedi scheda completa
              </button>
            )}
            {isSelf && !canMessage && !onFullProfile && (
              <div style={{ ...font, fontSize: 12.5, color: C.muted, background: C.surface, borderRadius: 10, padding: "10px 12px" }}>Questo è il tuo profilo pubblico 👋</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
