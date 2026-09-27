// Nessun nome di atleta verso il fornitore dell'IA (decisione di Danilo, 27/09/2026).
//
// Verso l'IA: ogni atleta della squadra diventa un segnaposto [[a1]], [[a2]]…,
// valido solo per la richiesta in corso (l'ordine è quello della classifica
// del momento, non un identificativo stabile). La mappa segnaposto → nome
// resta nel browser.
// Dalla risposta: si rimette il nome. Un segnaposto riconosciuto a metà o
// fuori elenco diventa "un'atleta": mai un nome sbagliato al posto giusto.

export function pseudonimizzaSquadra(team) {
  const nomi = {};
  const roster = (team?.roster || []).map((r, i) => {
    nomi[i + 1] = r.id;
    return { ...r, id: `[[a${i + 1}]]` };
  });
  return { team: team ? { ...team, roster } : team, nomi };
}

// Tollerante su maiuscole e spazi ("[[ A3 ]]"), non su altro.
const SEGNAPOSTO = /\[\[\s*a\s*(\d{1,3})\s*\]\]/gi;

export function ripristinaNomi(testo, nomi) {
  if (!testo) return testo;
  return String(testo).replace(SEGNAPOSTO, (_, n) => nomi?.[Number(n)] || "un'atleta");
}
