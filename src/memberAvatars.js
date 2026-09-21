// Avatar della galleria di chiunque, da qualsiasi schermata.
//
// Le atlete scelgono quasi tutte l'avatar anime (profiles.avatar_config) e non
// una foto (avatar_url), ma le funzioni che alimentano squadra, chat, messaggi
// e profilo restituiscono solo la foto: senza questo modulo si vedevano le
// iniziali ovunque tranne sul proprio profilo.
//
// Una sola chiamata per sessione (supabase/avatars-names.sql), condivisa da
// tutti i componenti. Se la funzione non esiste ancora sul database la mappa
// resta vuota e si vedono le iniziali come prima: nessun errore a schermo.
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { avatarImageUrl } from "./avatar";

let mappa = null;       // uid -> url dell'immagine della galleria
let caricamento = null;
const inAttesa = new Set();

function carica() {
  if (!caricamento) {
    caricamento = supabase.rpc("member_avatars").then(({ data, error }) => {
      mappa = {};
      if (error) console.warn("member_avatars:", error.message);
      else for (const r of data || []) if (r.avatar_config) mappa[r.id] = avatarImageUrl(r.avatar_config);
      inAttesa.forEach((f) => f());
    });
  }
  return caricamento;
}

// Da chiamare quando qualcuno cambia il proprio avatar.
export function refreshMemberAvatars() {
  caricamento = null;
  return carica();
}

/** La foto se c'è, altrimenti l'avatar della galleria, altrimenti null (iniziali). */
export function useAvatarOf(uid, url) {
  const [, aggiorna] = useState(0);
  const serve = !url && !!uid && !mappa;
  useEffect(() => {
    if (!serve) return;
    const f = () => aggiorna((n) => n + 1);
    inAttesa.add(f);
    carica();
    return () => { inAttesa.delete(f); };
  }, [serve]);
  if (url) return url;
  return (uid && mappa?.[uid]) || null;
}
