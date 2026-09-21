// Nomi cliccabili, ovunque. Finora la stessa logica era ripetuta a mano in
// quattro file, e ogni schermata nuova doveva farsi passare `onOpenCard` di
// mano in mano: il motivo per cui in metà app i nomi restavano testo morto.
//
// Qui il collegamento viaggia su un canale condiviso: qualsiasi componente,
// a qualsiasi profondità, può scrivere <PersonName target={...}>Giorgia</PersonName>
// e funziona. Vedi ProfilePage per come `target` viene risolto.
import { createContext, useContext } from "react";

// Il valore è la funzione che apre il profilo. `null` = collegamento spento
// (per esempio in stampa o in una schermata pubblica): i nomi restano testo.
const ProfileLinkCtx = createContext({ open: null, message: null });

export function ProfileLinkProvider({ open, message, children }) {
  // L'oggetto si ricrea a ogni render del Dashboard: è un valore piccolo e
  // i consumatori sono pochi, non vale la pena memorizzarlo.
  return (
    <ProfileLinkCtx.Provider value={{ open: open || null, message: message || null }}>
      {children}
    </ProfileLinkCtx.Provider>
  );
}

export const useOpenProfile = () => useContext(ProfileLinkCtx).open;

// Scrivere un messaggio privato: disponibile solo alle atlete (è l'unica
// categoria che può usare i messaggi privati, vedi App.jsx).
export const useMessagePerson = () => useContext(ProfileLinkCtx).message;

/**
 * Nome di una persona, cliccabile quando sappiamo chi è.
 * `target` può essere l'identificativo dell'atleta o l'uuid del profilo:
 * ProfilePage risolve da solo entrambi.
 */
export default function PersonName({ target, children, style, title }) {
  const open = useOpenProfile();
  const attivo = !!open && !!target;

  if (!attivo) return <span style={style}>{children}</span>;

  return (
    <span
      className="a360-clickname"
      style={style}
      title={title || `Apri il profilo di ${typeof children === "string" ? children : "questa persona"}`}
      onClick={(e) => { e.stopPropagation(); open(target); }}
    >
      {children}
    </span>
  );
}
