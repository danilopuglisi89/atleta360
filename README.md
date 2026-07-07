# Atleta360 — Dashboard Soft Skills

Dashboard web (Vite + React) che legge le soft skill delle atlete da un **Foglio Google
pubblicato come CSV** e le mostra con radar, confronto e andamento nel tempo.
Responsive PC + smartphone.

## Sviluppo in locale

```bash
npm install
npm run dev      # http://localhost:5173
```

Build di produzione:

```bash
npm run build    # genera la cartella dist/
npm run preview  # anteprima della build
```

## Dove si configurano i dati

Tutto il "livello dati" è in cima a [`src/App.jsx`](src/App.jsx):

- **`CONFIG.csvUrl`** — URL del CSV del Foglio Google.
- **`CONFIG.colTimestamp` / `CONFIG.colAtleta`** — nomi delle colonne di sistema.
- **`CORE_META` / `ADDON_META`** — le competenze. Ogni voce ha:
  `key` (id interno), `short` (etichetta sugli assi), `title` (titolo legenda),
  `desc` (descrizione) e `col` (**nome esatto** della colonna nel CSV).

Per **aggiungere/rimuovere una skill**: aggiungi/togli una voce in `CORE_META`
(o `ADDON_META`) e la colonna corrispondente sul Foglio. La dashboard si adatta da sola.

> ⚠️ Il campo `col` deve combaciare **al 100%** con il titolo della domanda del Modulo
> (accenti e maiuscole compresi). Gli spazi in coda vengono ripuliti in automatico.
> Se una colonna non viene trovata, la trovi segnalata nella **console del browser**.

### CSV: URL e pubblicazione

L'app usa l'endpoint `.../export?format=csv`, che funziona se il Foglio è condiviso
come *"chiunque abbia il link può visualizzare"*. Se il browser dovesse bloccare la
richiesta (CORS), usa in alternativa la pubblicazione dedicata:
Google Fogli → **File → Condividi → Pubblica sul web** → foglio delle risposte → **CSV**,
e incolla quell'URL in `CONFIG.csvUrl`.

## Privacy

Le atlete sono Under 18 e il link è pubblico: nella colonna dell'atleta si usano
**iniziali o numero di maglia**, mai il nome completo.

## Deploy su Vercel

**Percorso A — GitHub (consigliato):**

1. Crea un repository vuoto su GitHub.
2. In locale: `git init`, commit di tutto, push sul repo.
3. Su [vercel.com](https://vercel.com): accedi con GitHub → *Add New → Project* → seleziona il repo.
4. Vercel rileva **Vite** in automatico → *Deploy*. Ottieni un URL pubblico.
5. Ogni `git push` ripubblica da solo.

**Percorso B — Vercel CLI (senza GitHub):**

```bash
npm i -g vercel
vercel          # wizard, la prima volta
vercel --prod   # pubblica in produzione
```

Nessuna variabile d'ambiente serve: il CSV è pubblico e il suo URL vive nel codice.
