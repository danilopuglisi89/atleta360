// Interruttore tema: automatico (segue il telefono) / chiaro / scuro.
// Un click cambia modalità e fa vibrare l'app di un frame per far leggere
// a tutti i componenti i nuovi colori (vedi applyTheme in theme.js).
import { Sun, Moon, MonitorSmartphone } from "lucide-react";
import { C } from "../theme";

const ICONS = { auto: MonitorSmartphone, light: Sun, dark: Moon };
const LABELS = { auto: "Automatico", light: "Chiaro", dark: "Scuro" };

export default function ThemeToggle({ mode, onCycle, onNavy }) {
  const Icon = ICONS[mode] || MonitorSmartphone;
  const style = onNavy
    ? { border: "none", background: "none", color: "#fff" }
    : { border: `1px solid ${C.grid}`, background: C.card, color: C.ink };
  return (
    <button onClick={onCycle} title={`Tema: ${LABELS[mode]} (tocca per cambiare)`} aria-label="Cambia tema"
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 11, cursor: "pointer", ...style }}>
      <Icon size={17} />
    </button>
  );
}
