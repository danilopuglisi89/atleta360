import { MessageCircle } from "lucide-react";
import { C, font, display } from "../theme";
import { SKILL_META } from "../skills";
import { useAuth } from "../auth";
import { Card } from "../components/ui";

export default function InfoView() {
  const { profile } = useAuth();
  const firstName = profile?.first_name || "";
  const waText = encodeURIComponent(`Sono l'atleta ${firstName || "___"}, ho un problema con l'app Atleta360.`);
  const guide = [
    ["Accesso", "Registrati con nome, cognome, ruolo, email e password. Attendi l'approvazione dello staff, poi accedi. Se dimentichi la password, usa “Password dimenticata?”."],
    ["Il tuo profilo", "Nella scheda Profilo Atleta vedi il tuo radar a 360°, con i tuoi punti di forza e le aree di crescita."],
    ["Chat", "Scrivi nella bacheca di squadra o avvia messaggi privati con le compagne (anche con foto)."],
    ["Area personale", "Aggiungi la tua foto profilo, il numero di maglia e i contatti quando vuoi."],
    ["Installa sul telefono", "Dal menu del browser scegli “Aggiungi a schermata Home”: si apre come un'app, a schermo intero."],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        <Card title="I focus allenati" subtitle="Le competenze monitorate a ogni rilevamento">
          {SKILL_META.map((s) => (
            <div key={s.key} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: `1px solid ${C.grid}` }}>
              <div style={{ ...display, fontSize: 14, fontWeight: 600, color: C.navy }}>{s.title}</div>
              {s.description && <div style={{ ...font, fontSize: 13, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>{s.description}</div>}
            </div>
          ))}
          {SKILL_META.length === 0 && <div style={{ ...font, fontSize: 13, color: C.muted }}>Nessun focus ancora definito.</div>}
        </Card>

        <Card title="Come si usa l'app" subtitle="Guida rapida">
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {guide.map(([t, d]) => (
              <div key={t} style={{ ...font, fontSize: 13.5, color: C.ink, lineHeight: 1.5 }}>
                <span style={{ ...display, fontWeight: 600, color: C.navy }}>{t}.</span> {d}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Problemi con l'app?" subtitle="Assistenza diretta">
        <div style={{ ...font, fontSize: 13.5, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
          Se qualcosa non funziona o hai bisogno di aiuto, scrivi su WhatsApp: si apre una chat con un messaggio
          già pronto — completa solo il tuo nome e invia.
        </div>
        <a href={`https://wa.me/393770870217?text=${waText}`} target="_blank" rel="noopener noreferrer"
          style={{ ...font, display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 11, textDecoration: "none", background: "#1FA855", color: "#fff", fontSize: 14.5, fontWeight: 600 }}>
          <MessageCircle size={18} /> Scrivi su WhatsApp
        </a>
      </Card>
    </div>
  );
}
