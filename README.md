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

## Accesso con approvazione (Supabase)

La dashboard è protetta da un accesso: le atlete si registrano (nome, cognome, email,
password), tu approvi/rifiuti dal pannello admin, e solo chi è approvato entra.
Il backend è **Supabase** (gratis). Configurazione una tantum:

### 1. Crea il progetto Supabase
1. Vai su [supabase.com](https://supabase.com) → **Start your project** → accedi (anche con GitHub).
2. **New project**: dai un nome (es. `atleta360`), scegli una password per il database
   (salvala) e la region (Europe). Attendi ~2 minuti che il progetto sia pronto.

### 2. Crea le tabelle
1. Nel menu a sinistra: **SQL Editor** → **New query**.
2. Copia **tutto** il contenuto di [`supabase/schema.sql`](supabase/schema.sql), incollalo e premi **Run**.
   Deve dire *Success*.

### 3. Disattiva la conferma email (consigliato)
Così le atlete non devono confermare un'email: tanto sei tu ad approvarle.
- **Authentication → Sign In / Providers → Email** → disattiva **Confirm email** → **Save**.

### 4. Collega l'app a Supabase
1. **Project Settings → API**: copia **Project URL** e la chiave **anon public**.
2. In locale: copia `.env.example` in `.env` e incolla i due valori. Poi `npm run dev`.
3. Su **Vercel**: progetto → **Settings → Environment Variables** → aggiungi
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` con gli stessi valori → **Redeploy**.

> La chiave *anon public* è pensata per stare nel frontend: è sicura da esporre.
> La protezione dei dati è garantita dalle regole (Row Level Security) nello schema.

### 5. Crea il tuo utente admin
1. Apri l'app, vai su **Registrati** e iscriviti con la **tua** email e una password a tua scelta.
2. Torna su Supabase → **SQL Editor** ed esegui (con la tua email):
   ```sql
   update public.profiles set role = 'admin', status = 'approved'
   where email = 'info@danilopuglisi.com';
   ```
3. Ricarica l'app: ora entri e vedi la voce **“Richieste accesso”** per approvare/rifiutare.

> ⚠️ Niente `admin/admin`: il tuo accesso admin usa la tua email e una password vera che
> scegli tu. È l'unico modo per proteggere davvero l'accesso ai dati di atlete minorenni.

## Email di notifica a ogni nuova iscrizione

A ogni nuova richiesta di registrazione parte una email a `info@danilopuglisi.com`.
Meccanismo: **Database Webhook** su `profiles` (INSERT) → **Edge Function**
[`supabase/functions/notify-admin`](supabase/functions/notify-admin/index.ts) → invio via **Resend**.

### 1. Account Resend (mittente email, gratis)
1. Crea un account su [resend.com](https://resend.com) usando **info@danilopuglisi.com**
   (così le email di test arrivano subito nella tua casella, senza verificare un dominio).
2. **API Keys → Create API Key** → copia la chiave (inizia con `re_...`). Tienila da parte.

> Per inviare da un indirizzo del tuo dominio (es. `notifiche@danilopuglisi.com`) o verso
> altri destinatari, in seguito potrai verificare il dominio `danilopuglisi.com` su Resend
> (aggiungendo i record DNS). Per ora il mittente è `onboarding@resend.dev` verso la tua email.

### 2. Crea la Edge Function su Supabase
1. Supabase → **Edge Functions** → **Create a function** → nome esatto **`notify-admin`**.
2. Incolla il contenuto di [`supabase/functions/notify-admin/index.ts`](supabase/functions/notify-admin/index.ts) → **Deploy**.
3. **Edge Functions → Secrets** → aggiungi:
   - `RESEND_API_KEY` = la chiave `re_...` di Resend
   - `WEBHOOK_SECRET` = una parola/stringa a piacere (es. una password lunga) — servirà al passo 3
   - *(opzionali)* `NOTIFY_TO`, `APP_URL`

### 3. Crea il Database Webhook
1. Supabase → **Database → Webhooks** → **Create a new hook**.
2. Nome `on-new-signup`; tabella **`public.profiles`**; evento **Insert**.
3. Tipo: **Supabase Edge Functions** → seleziona **`notify-admin`**.
4. In **HTTP Headers** aggiungi: nome `x-webhook-secret`, valore = lo **stesso** `WEBHOOK_SECRET` del passo 2.
5. Salva.

### 4. Prova
Registra una nuova richiesta dal sito: entro pochi secondi deve arrivarti l'email.
Se non arriva, controlla **Edge Functions → notify-admin → Logs** su Supabase.

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
