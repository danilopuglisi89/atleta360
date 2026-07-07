# Atleta360 Dashboard — Specifica di build (per Claude Code)

App web che legge le soft skill delle atlete da un **Foglio Google pubblicato come CSV** e le mostra con radar, confronto e andamento nel tempo. Responsive PC + smartphone. Deploy su **Vercel**.

> **Come usarla:** questa specifica sta nella cartella del progetto insieme al file `atleta360-dashboard.jsx` (il prototipo già pronto). Claude Code deve **leggere questa specifica ed eseguirla passo-passo**, partendo dal componente esistente.

---

## 0. Prerequisiti
- **Node.js** installato (versione 18 o superiore). Verifica con `node -v`.
- I due file nella cartella: `atleta360-spec.md` (questo) e `atleta360-dashboard.jsx` (il prototipo).

---

## 1. Stack e principi

**Da usare:**
- **Vite + React**
- **recharts** — grafici (radar, barre, linee)
- **lucide-react** — icone
- **papaparse** — lettura e parsing del CSV

**Da NON toccare (importante):**
- Tutta la **parte visiva**, i **grafici**, la **palette** (navy `#0A1650` + arancione `#FF7A18`) e il **layout responsive** del prototipo sono già a posto: vanno mantenuti identici.
- **Niente Tailwind**: il componente è già auto-stilizzato con stili inline. Non aggiungerlo.
- L'unica cosa che cambia rispetto al prototipo è il **livello dati** (sezione 3).

---

## 2. Scaffolding + inserimento del componente

1. Crea il progetto Vite React nella cartella corrente e installa le dipendenze:
   ```bash
   npm create vite@latest . -- --template react
   npm install
   npm install recharts lucide-react papaparse
   ```
2. Sostituisci il contenuto di `src/App.jsx` con quello di `atleta360-dashboard.jsx` (il prototipo). Rimuovi i file di esempio inutili del template (`src/App.css`, l'`import './App.css'`, l'`import viteLogo`, ecc.). `src/main.jsx` deve importare `App` da `./App.jsx`.
3. (Opzionale, pulizia) Sposta l'`@import` dei font Google dal `<style>` nel componente al `<head>` di `index.html`. Se lo lasci dov'è funziona comunque.

Verifica che parta con `npm run dev` e mostri la dashboard con i dati finti. Da qui in poi sostituiamo i dati finti con quelli reali.

---

## 3. ⭐ Livello dati reale (il cuore del lavoro)

Oggi il prototipo usa una costante `DATA` con dati finti. Va sostituita con la lettura del CSV. Aggiungi in cima a `src/App.jsx` questo blocco di configurazione e le funzioni di parsing:

```jsx
import Papa from "papaparse";

/* ====== CONFIGURAZIONE — Danilo compila qui ====== */
const CONFIG = {
  // URL del CSV: in Google Fogli → File → Condividi → Pubblica sul web → (foglio risposte) → CSV
  csvUrl: "INCOLLA_QUI_URL_CSV_PUBBLICATO",

  // Nomi ESATTI delle colonne del foglio (= titoli delle domande del Modulo).
  // Attenzione: devono combaciare al 100%, accenti e maiuscole compresi.
  colTimestamp: "Informazioni cronologiche", // header di default dei Moduli in italiano
  colAtleta: "Atleta",                        // identificatore: numero di maglia o iniziali

  coreSkills: [
    "Focus", "Gestione Stress", "Resilienza Errore",
    "Comunicazione", "Leadership", "Gestione Tempo",
  ],
  // ⚠️ Rinomina con le 4 add-on effettive
  addonSkills: ["Add-on 1", "Add-on 2", "Add-on 3", "Add-on 4"],
};
/* ================================================== */

// Converte una cella in numero (gestisce virgola decimale e spazi). null se non valido.
function toNum(v) {
  const n = Number(String(v ?? "").replace(",", ".").trim());
  return Number.isNaN(n) ? null : n;
}

// Interpreta il timestamp (formato Moduli IT "gg/mm/aaaa hh.mm.ss" oppure ISO).
function toTs(s) {
  if (!s) return 0;
  const m = String(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})[ ,]+(\d{1,2})[.:](\d{2})(?:[.:](\d{2}))?/);
  if (m) {
    const [, d, mo, y, h, mi, se] = m;
    return new Date(+y, +mo - 1, +d, +h, +mi, +(se || 0)).getTime();
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
}

// Trasforma le righe grezze del CSV in { atleti, storico }.
// - atleti[id]  = { numero: id, scores: {skill: valore} }  (ULTIMO rilevamento)
// - storico[id] = [ { periodo, ...scores } ]               (TUTTI i rilevamenti, ordinati)
function transform(rows) {
  const skills = [...CONFIG.coreSkills, ...CONFIG.addonSkills];
  const byId = {};

  rows.forEach((r) => {
    const id = String(r[CONFIG.colAtleta] ?? "").trim();
    if (!id) return;
    const scores = {};
    let hasAny = false;
    skills.forEach((k) => {
      const v = toNum(r[k]);
      if (v !== null) { scores[k] = v; hasAny = true; }
    });
    if (!hasAny) return;
    (byId[id] ||= []).push({ ts: toTs(r[CONFIG.colTimestamp]), scores });
  });

  const atleti = {}, storico = {};
  Object.entries(byId).forEach(([id, entries]) => {
    entries.sort((a, b) => a.ts - b.ts);
    atleti[id] = { numero: id, scores: entries[entries.length - 1].scores };
    storico[id] = entries.map((e) => ({
      periodo: e.ts ? new Date(e.ts).toLocaleDateString("it-IT", { day: "2-digit", month: "short" }) : "",
      ...e.scores,
    }));
  });
  return { atleti, storico };
}
```

**Caricamento nel componente `App`.** Dentro `App`, carica il CSV con `useEffect` e tieni i dati in stato:

```jsx
const [dati, setDati] = useState(null);   // { atleti, storico }
const [errore, setErrore] = useState(null);

useEffect(() => {
  Papa.parse(CONFIG.csvUrl, {
    download: true,
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),     // evita bug da spazi negli header
    complete: (res) => setDati(transform(res.data)),
    error: (e) => setErrore(e.message),
  });
}, []);
```

**Collega i dati alle viste.** Nel prototipo, in cima al file, ci sono costanti calcolate a livello di modulo che dipendono da `DATA`: `NOMI`, `overall`, `RANK`, `TEAM_AVG` e la funzione `trendFor`. Ora che i dati arrivano in modo asincrono, vanno **spostate dentro `App` e ricalcolate dopo il caricamento**. La corrispondenza è 1:1:

- `DATA[nome]`   →  `dati.atleti[nome]`  (stessa forma: `{ numero, scores }`)
- `NOMI`         →  `Object.keys(dati.atleti)`
- `trendFor(n)`  →  `dati.storico[n]`
- `overall`, `RANK`, `TEAM_AVG`  →  stesse identiche formule, calcolate da `dati.atleti` (usa `useMemo`)

Passa questi valori alle viste come **props** (oppure usa un piccolo Context). **Non modificare** la logica dei grafici né gli stili.

**Piccola semplificazione UI.** Nel prototipo il menù a tendina e le etichette mostrano `#numero · nome` perché c'erano entrambi i campi. Con un solo identificatore, mostra semplicemente quello una volta (es. `Maglia 5` oppure `#5`).

> Se invece un domani vuoi tenere *sia* numero sia nome (uso interno, non pubblico), basta aggiungere una colonna `Numero` al foglio e adattare `CONFIG` — ma per l'uso pubblico l'identificatore singolo è la scelta giusta.

---

## 4. Stati di caricamento / errore / vuoto

Prima di renderizzare le viste, gestisci i tre casi con messaggi nella voce dell'interfaccia (niente "spinner e basta"):

- **`errore`** → box con testo tipo *"Non riesco a leggere i dati. Controlla che il Foglio sia pubblicato sul web come CSV e che l'URL in CONFIG sia corretto."*
- **`!dati`** (in caricamento) → messaggio *"Carico i dati della squadra…"*
- **`dati` ma nessun atleta** → stato vuoto *"Nessun rilevamento ancora. Chiedi al mister di compilare il modulo."*

(Facoltativo, utile in debug) Dopo il parsing, logga in console eventuali colonne skill attese ma non trovate negli header, così è facile scoprire un titolo di domanda scritto in modo diverso.

---

## 5. Struttura attesa del Foglio Google

Ogni **domanda del Modulo = una colonna**; ogni **compilazione del mister = una riga** (uno "snapshot" nel tempo → alimenta la sezione Andamento).

| Colonna | Contenuto |
|---|---|
| Informazioni cronologiche | automatica (Moduli) |
| Atleta | numero di maglia o iniziali |
| Focus | 1–10 |
| Gestione Stress | 1–10 |
| Resilienza Errore | 1–10 |
| Comunicazione | 1–10 |
| Leadership | 1–10 |
| Gestione Tempo | 1–10 |
| (4 add-on) | 1–10 ciascuna |
| Note | facoltativo |

**Gotcha da ricordare:**
- I titoli delle domande devono **coincidere esattamente** con i nomi in `CONFIG` (accenti e maiuscole comprese).
- L'header del timestamp in italiano è di solito **"Informazioni cronologiche"** — ma apri una volta il CSV pubblicato e verifica i nomi reali delle colonne, poi allineali in `CONFIG`.
- Pubblica il **foglio delle risposte** (se il documento ha più fogli).

---

## 6. Deploy su Vercel

**Percorso A — GitHub (consigliato, si ri-pubblica da solo a ogni modifica):**
1. Crea un repository vuoto su GitHub.
2. In locale: `git init`, commit di tutto, e push sul repo.
3. Vai su **vercel.com**, accedi con GitHub, *Add New → Project*, seleziona il repo.
4. Vercel rileva **Vite** in automatico → *Deploy*. Ottieni un URL pubblico.
5. Ogni `git push` ripubblica automaticamente.

**Percorso B — Vercel CLI (senza GitHub):**
```bash
npm i -g vercel
vercel          # segui il wizard, la prima volta
vercel --prod   # pubblica in produzione
```

**Dominio personalizzato (opzionale):** dashboard Vercel → progetto → *Settings → Domains* (utile per metterla sotto il brand Atleta360).

Nota: **nessuna variabile d'ambiente o segreto** serve, perché il CSV è pubblico per scelta e il suo URL vive nel codice.

---

## 7. Nota privacy
Le atlete sono Under 18 e il link è accessibile a chiunque lo abbia: usa **numero di maglia o iniziali** nella colonna `Atleta`, mai il nome completo.

---

## 8. Checklist finale
- [ ] `npm run dev` mostra la dashboard con i **dati reali** del Foglio
- [ ] Le 5 sezioni funzionano: Home, Profilo Atleta, Confronto, Andamento, Info & Legenda
- [ ] Più rilevamenti della stessa atleta → l'**ultimo** appare nel profilo, lo **storico** nell'Andamento
- [ ] Responsive OK: sidebar su PC, hamburger su smartphone
- [ ] Nomi delle 4 add-on aggiornati in `CONFIG` e nel Foglio
- [ ] Deploy su Vercel completato, URL pubblico funzionante
