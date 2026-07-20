/* ============================================================
   FOCUS / COMPETENZE — arrivano da Supabase (tabella skills).
   Questi riferimenti a livello di modulo vengono popolati da
   bindSkills(model) in Dashboard, prima che le viste vengano
   renderizzate. Gli import ESM sono "live binding": le viste
   vedono sempre i valori aggiornati.
   ============================================================ */
export let CORE = [];        // chiavi dei focus attivi (ordinati)
export let SKILLS = [];      // alias di CORE (compatibilità viste)
export let SHORT = {};       // key -> etichetta breve
export let TITLE = {};       // key -> titolo esteso
export let SKILL_META = [];  // [{ key, title, short, description }]

export function bindSkills(model) {
  CORE = model.keys;
  SKILLS = model.keys;
  SHORT = model.SHORT;
  TITLE = model.TITLE;
  SKILL_META = model.skills;
}
