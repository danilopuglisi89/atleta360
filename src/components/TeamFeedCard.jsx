// Feed "Novità" di squadra: tutto quello che è successo, in un unico
// elenco scorribile — più forte del vuoto di aprire l'app e non trovare
// nessuno. Include il banner "bentornata" se sono passati 3+ giorni.
import { Sparkles } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "./ui";
import { useTeamFeed, useWelcomeBack } from "../teamFeed";

const timeLabel = (iso) => {
  const d = new Date(iso), now = new Date();
  const days = Math.floor((now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  if (days <= 0) return "oggi";
  if (days === 1) return "ieri";
  if (days < 7) return `${days} giorni fa`;
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
};

export default function TeamFeedCard() {
  const { items, loading } = useTeamFeed();
  const welcomeBack = useWelcomeBack(items);

  if (loading || items.length === 0) return null;

  return (
    <>
      {welcomeBack && (
        <div className="a360-reveal a360-noprint" style={{ display: "flex", alignItems: "center", gap: 10, background: "linear-gradient(120deg, #FFE9D5 0%, #FFF3E6 100%)", border: "1px solid #FFC98A", borderRadius: 14, padding: "12px 16px", marginBottom: 16 }}>
          <Sparkles size={20} color={C.orange} style={{ flexShrink: 0 }} />
          <div style={{ ...font, fontSize: 13.5, color: "#7A3E00", lineHeight: 1.4 }}>
            <b>Bentornata!</b> Non ti si vedeva da {welcomeBack.days} giorni — ecco cosa ti sei persa: {welcomeBack.missed.length} novità qui sotto. 👇
          </div>
        </div>
      )}
      <Card title="Novità" subtitle="Cosa è successo in squadra" style={{ marginTop: 16 }} className="a360-noprint">
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 360, overflowY: "auto" }}>
          {items.map((it, i) => (
            <div key={`${it.kind}-${it.created_at}-${i}`} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 18, lineHeight: 1.3, flexShrink: 0 }}>{it.icon}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ ...font, fontSize: 13, color: C.ink, lineHeight: 1.4 }}>{it.text}</div>
                <div style={{ ...font, fontSize: 11, color: C.muted, marginTop: 2 }}>{timeLabel(it.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
