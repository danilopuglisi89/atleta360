# Dashboard Atleta360

Dashboard soft skills per società sportive. Uso reale con **Oasi Volley** (non solo demo),
riattivata il 2026-07-20 dopo un periodo di standby — vedi il CLAUDE.md di root per il contesto
dell'ecosistema. `atleta360-site/` (landing pubblica atleta-360.com) è un progetto a parte, non
toccato da questa riattivazione.

## Stack

React 18 + Vite, **Supabase** (auth + dati + storage, Row Level Security), funzioni serverless
Vercel in `api/` (Coach IA su Google Gemini). `coach-server.mjs` è un wrapper Express che espone
`api/coach.js` in locale per lo sviluppo (le funzioni `/api` di Vercel non girano con `npm run dev`).
Recharts per i grafici. PWA installabile (vite-plugin-pwa).

## ⚠️ Deploy — DUE target diversi, non uno solo (scoperto 2026-07-20)

Il [README.md](README.md) descrive solo Vercel, ma **in produzione la dashboard vive in due posti**:

| Dominio | Come si aggiorna | Cosa serve |
|---|---|---|
| `atleta360-jl71.vercel.app` | **Automatico**: ogni `git push` su `main` lo ridistribuisce da solo (Vercel + GitHub collegati). | Niente: basta pushare. |
| **`oasi.danilopuglisi.com`** (quello vero, usato da Oasi Volley) | **Manuale**: gira su **VPS Hetzner** (`167.233.167.24`), nginx serve `/opt/atleta360/dist` da file statici, il Coach IA è un processo **PM2** separato (`atleta360-coach`, porta 4100, usa `coach-server.mjs`). Un `git push` **da solo non aggiorna questo dominio**. | Chiave SSH `~/.ssh/hetzner_caterino`, root sulla VPS. |

**Procedura di deploy sulla VPS** (dopo aver pushato su GitHub):
```bash
ssh -i ~/.ssh/hetzner_caterino root@167.233.167.24
cd /opt/atleta360
git status                 # controlla PRIMA modifiche locali non committate (è successo!)
git stash -u                # se ce ne sono: le mette da parte, non le cancella
git pull origin main
git stash pop                # riapplica; risolvi eventuali conflitti a mano, poi git add
npm install                  # se package.json è cambiato
npm run build                 # rigenera dist/, quello che nginx serve davvero
pm2 restart atleta360-coach   # ricarica api/coach.js nel processo Coach IA (Node lo tiene in cache)
```
Sulla stessa VPS girano anche `caterino-yt-backend/-frontend`, `caterino-ig-backend/-frontend` e
`caterino-casa-backend` (altri progetti dell'ecosistema, vedi CLAUDE.md di root): **mai** `pm2
restart all` o toccare processi diversi da `atleta360-coach`. `ecosystem.prod.config.cjs` (config
PM2, path `/opt/atleta360/coach-server.mjs`) vive solo sul server, non è tracciato da git.
Attenzione (scoperto 2026-08-14): era `.js` ma **non poteva funzionare** (CommonJS in un package
`"type":"module"`) — rinominato in `.cjs`. L'opzione `env_file` lì dentro è **ignorata da PM2**:
le env si caricano esportandole nella shell prima di `pm2 start`
(`set -a && . ./.env.coach && set +a && pm2 start ecosystem.prod.config.cjs && pm2 save`);
un semplice `pm2 restart --update-env` NON basta per env nuove.

Il 2026-07-20 il checkout sulla VPS era fermo al commit *prima* del refactoring (mai più aggiornato
dopo una patch manuale a `api/coach.js` per il CORS di Aurora, mai committata lì) — da qui la
procedura `stash`/`pull`/`pop` sopra, pensata apposta per quel caso: modifiche locali sul server che
vanno preservate, non sovrascritte alla cieca. Verificare sempre con `md5sum` prima di assumere che
due versioni divergenti siano "la stessa cosa".

## Struttura del codice (dopo il refactoring 2026-07-20)

- **`src/App.jsx`** — solo layout/routing: sidebar desktop, tab bar mobile, drawer, gate di
  accesso (`Root`), niente più logica di vista.
- **`src/views/`** — una vista per file: `HomeView`, `ProfiloView`, `ConfrontoView`,
  `AndamentoView`, `StaffView`, `InfoView`. Caricate con `React.lazy` (code splitting: recharts
  non pesa sul primo avvio).
- **`src/components/`** — primitive condivise (`ui.jsx`: Card/Row/Select/StatusBox/Skeleton,
  `Classifica.jsx`, `bits.jsx`: frase del giorno + badge, `Footer.jsx`, `GateScreens.jsx`).
- **`src/skills.js`** — stato modulo dei focus/competenze (`CORE`, `SHORT`, `TITLE`,
  `SKILL_META`), popolato da `bindSkills(model)` in `Dashboard` prima del render delle viste.
  È un pattern preesistente (via live-binding ESM) più che una scelta ideale: se in futuro serve
  più pulizia, valutare di passarlo come prop/context invece che come stato di modulo.
- **`src/theme.js`** — palette (`C`), font, `SERIES`/`CORE_COLORS` per i grafici.
- Il resto (`auth.jsx`, `data.js`, `badges.js`, `Chat.jsx`, `DirectMessages.jsx`, `AdminPanel.jsx`,
  `NewAssessment.jsx`, `PersonalArea.jsx`, `ShareCard.jsx`, `CoachChat.jsx`, `PublicProfileCard.jsx`)
  è rimasto dov'era, non toccato dal refactoring.

## Tab bar mobile

Sotto i 900px la navigazione principale è una tab bar fissa in basso (Home, Profilo, Chat,
Andamento + "Altro" che apre il drawer con il resto). Regole CSS in `src/index.css`
(`.a360-tabbar`, `.a360-main`, `.a360-sitelogo`) tengono conto di `env(safe-area-inset-bottom)`
per i telefoni con notch/home indicator. Il footer normale (copyright/WhatsApp) è nascosto su
mobile per non duplicare la navigazione: le informazioni di contatto restano in "Info & Legenda".

## Notifiche in-app (2026-07-21)

Una sola tabella `public.notifications` (vedi `supabase/notifications.sql`) alimentata da 4
trigger: messaggio in bacheca (`chat_messages`), messaggio privato (`direct_messages`), nuovo
rilevamento (`assessments`), approvazione account (`profiles.status`). Niente polling: la
campanella si aggiorna via Supabase Realtime (`useNotifications` in `src/notifications.js`),
serve `alter publication supabase_realtime add table public.notifications` — lo script lo fa da
solo, in modo idempotente.

- **`src/notifications.js`** — hook `useNotifications(userId)`: elenco, non lette, sottoinsieme
  chat (`dm`+`team_chat`) per il badge, `markRead`/`markAllRead`/`markTypeRead`/`markFromRead`.
- **`src/components/NotificationBell.jsx`** — campanella con pallino rosso, montata una sola volta
  nell'header dentro `<main>` in App.jsx (stessa posizione su desktop e mobile).
- Badge non letti sulla voce **Chat** (sidebar + tab bar mobile) = notifiche `dm`+`team_chat` non
  lette. Le notifiche di bacheca si segnano lette aprendo la vista Chat (sempre visibile in
  ChatPage); quelle private conversazione per conversazione (`onConversationOpen` in
  `DirectMessages.jsx`, che marca lette solo le DM di quel mittente). Puntino rosso anche sulle
  singole compagne nel selettore "A chi vuoi scrivere?".
- ~~Push PWA rimandata~~ → **fatta il 2026-08-14**, vedi sezione "Notifiche push" sotto.

**Importante**: `supabase/notifications.sql` va incollato ed eseguito da Danilo nel SQL Editor di
Supabase (stesso flusso manuale degli altri script in `supabase/`) — non è stato eseguito da
Claude Code, che non ha credenziali del database di produzione.

## Esperienza atlete (2026-07-21)

- **Autovalutazione** (`supabase/self-assessments.sql`, tabella `self_assessments`): l'atleta si
  valuta sugli stessi focus del mister; nel proprio profilo vede un piccolo radar "come ti vedi
  tu" vs "come ti vede il mister" (`src/components/SelfAssessmentCard.jsx`). **Editabile anche
  dallo staff** per conto dell'atleta (test, o atlete che non usano l'app) — RLS lato Supabase lo
  permette già (`is_staff()` oppure l'atleta stessa), il testo del pulsante/titolo cambia in base
  a chi scrive (prop `personal` = l'atleta sul proprio profilo, vs `athleteName` per lo staff:
  "Inserisci l'autovalutazione di X"). In Area Staff (`StaffView.jsx`) un pannello mostra le
  atlete con lo scostamento medio più grande tra le due valutazioni.
- **Obiettivi personali** (`supabase/goals.sql`, tabella `goals`): target 1-10 su un focus, con
  data facoltativa. Barra di progresso nel profilo (`src/components/GoalsCard.jsx`), stessa
  logica: editabile da atleta o staff, testo adattato via `personal`/`athleteName`. Il trigger
  `notify_goal_reached` in `goals.sql` manda una notifica "Obiettivo raggiunto! 🎯" **solo al
  momento del sorpasso** (confronta col rilevamento precedente, non ripete ad ogni rilevamento
  successivo) — allarga il check `type` di `notifications` con un 5° valore `'goal'`.
  Gli obiettivi entrano anche nel payload del Coach IA (vedi `api/coach.js`), che ne tiene conto
  nei consigli.
- **Gamification** (`src/gamification.js`, nessuna tabella nuova): `levelFor(overall)` — chip di
  livello (🌱 Esordiente → 🏆 Top Player) accanto al punteggio in ProfiloView; `growthStreak(hist,
  keys)` — serie di rilevamenti consecutivi in crescita, usata sia per due nuovi badge in
  `badges.js` (🔥 "In fiamme" da 3, 🔥🔥 "Serie leggendaria" da 5) sia riusabile altrove.
- `src/data.js`: `fetchModel()`/`buildModel()` caricano anche `self_assessments` e aggiungono
  `atleti[identifier].self = { ts, scores }` (l'ultima autovalutazione). **Tabella opzionale**:
  se `self-assessments.sql` non è ancora stato eseguito, l'errore di quella query non blocca il
  resto della dashboard (stesso principio "degrada senza rompere" del root CLAUDE.md).
- `src/goals.js`: hook `useGoals(athleteId)` (CRUD), usato da `ProfiloView` e passato sia a
  `GoalsCard` sia al payload del Coach IA.

**Importante**: `supabase/self-assessments.sql` e `supabase/goals.sql` vanno eseguiti da Danilo
nel SQL Editor di Supabase (`goals.sql` richiede che `notifications.sql` sia già stato eseguito,
per via del trigger su obiettivo raggiunto) — non eseguiti da Claude Code.

## Strumenti staff (2026-07-21)

- **Report IA salvati** (`supabase/reports.sql`, tabella `reports`, solo staff in lettura/scrittura):
  ogni "Genera analisi con IA" in `StaffView.jsx` ora resta anche nello storico (prima si perdeva
  al refresh) — hook `src/reports.js` (`useReports`), lista collassabile con eliminazione.
- **Registro presenze** (`supabase/attendance.sql`, tabella `attendance`, vincolo unique su
  `(athlete_id, session_date)` così ri-salvare lo stesso allenamento aggiorna invece di duplicare):
  check-in rapido per data (`src/components/AttendanceCard.jsx`, tutte presenti di default, il
  mister toglie le assenti) + percentuale di presenza per atleta su tutte le sessioni registrate,
  ordinata dalla più bassa. Hook `src/attendance.js` (`useAttendance`, upsert via
  `onConflict: "athlete_id,session_date"`).
- **Stampa/PDF rifinita**: `.a360-print-area` in `ProfiloView.jsx` era già presente ma senza alcuna
  regola CSS collegata (nessun effetto reale). Ora: l'header condiviso dell'app (eyebrow/h1/
  campanella, classe `.a360-page-header`) si nasconde in stampa su ogni vista; `PrintStamp`
  (`src/components/ui.jsx`) aggiunge un timbro "Atleta360 · generato il [data]" visibile SOLO in
  stampa (`.a360-print-only`, vedi `index.css`) in fondo al profilo atleta e al report squadra; il
  profilo stampato ha un'intestazione dedicata con nome+ruolo; il selettore atleta per lo staff si
  nasconde in stampa. Registro presenze e storico report sono `a360-noprint` (strumenti di lavoro,
  non contenuto da consegnare).

**Importante**: `supabase/reports.sql` e `supabase/attendance.sql` vanno eseguiti da Danilo nel
SQL Editor di Supabase — non eseguiti da Claude Code.

## Notifiche push (2026-08-14)

Web Push vere (arrivano a app chiusa), costruite sopra il sistema notifiche esistente:
**ogni INSERT in `public.notifications` fa partire una push** al destinatario, quindi
rilevamenti, bacheca, DM, obiettivi, approvazioni e il nuovo tipo `reminder` sono coperti
da un solo meccanismo.

- **`supabase/push.sql`** — tabella `push_subscriptions` (RLS: ognuno le proprie), allarga il
  check `type` con `'reminder'`, RPC `send_reminder(message)` (solo staff, una notifica a ogni
  profilo approvato), e trigger `dispatch_push` su `notifications`: via **pg_net** POSTa a
  `https://oasi.danilopuglisi.com/api/push/dispatch` titolo/corpo/vista + le subscription del
  destinatario (così l'endpoint non ha bisogno di credenziali Supabase). Il segreto nel trigger
  deve combaciare con `PUSH_SECRET` in `.env.coach` sul VPS (valore a bassa criticità: protegge
  solo il relay).
- **`api/push.js`** — endpoint stile Vercel montato in `coach-server.mjs` su
  `/api/push/dispatch` (quindi gira nel processo PM2 `atleta360-coach` già esistente, dietro
  nginx `/api/`). Usa il pacchetto **`web-push`** (VAPID). Env: `VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY`, `PUSH_SECRET` in `.env.coach`. `/api/health` ora riporta anche
  `push: true/false`.
- **Service worker custom**: `vite.config.js` è passato da `generateSW` a **`injectManifest`**
  con `src/sw.js` (precache Workbox come prima + listener `push` e `notificationclick`; il
  click apre l'app su `/?view=...`, che App.jsx legge all'avvio per la vista iniziale).
- **`src/push.js`** — `usePush(userId)`: stati `unsupported / ios-install / denied / on / off`,
  `enable()` (permesso + subscribe + upsert su Supabase), `disable()`. Su iOS le push PWA
  esistono solo da 16.4 **e solo se l'app è installata sulla Home** — lo stato `ios-install`
  mostra l'istruzione. La chiave pubblica VAPID sta nel sorgente (è pubblica per definizione).
- **UI**: riga "Attiva notifiche sul telefono" in cima al menu della campanella
  (`NotificationBell.jsx`, prop nuova `userId`); pannello staff "Invia promemoria" in
  `StaffView.jsx` (`ReminderCard`, chiama l'RPC).
- Le chiavi VAPID sono state generate una volta con `npx web-push generate-vapid-keys` e vivono
  in `.env.coach` sul VPS (mai committate; la privata esiste solo lì).

**Importante**: `supabase/push.sql` va eseguito da Danilo nel SQL Editor (richiede
`notifications.sql`). Su Vercel l'endpoint esiste ma non è configurato (env mancanti): la
consegna push passa SOLO dal VPS, che è il dominio vero.

## Valutazione precedente a colpo d'occhio (2026-07-30)

Su richiesta di Danilo: quando il mister apre **Nuovo rilevamento** (`src/NewAssessment.jsx`),
ora vede subito il punto di partenza invece di uno slider neutro fisso a 6:
- ogni slider parte già dal valore dell'**ultimo rilevamento salvato per quell'atleta**, non da 6;
- accanto al valore corrente (in arancio) compare una piccola etichetta grigia `prec. X` con
  il punteggio precedente per quel focus, sempre visibile mentre si sposta lo slider;
- una riga sotto il titolo della card ricorda la data del rilevamento di riferimento
  ("Rispetto al rilevamento del…").

In modifica di un rilevamento esistente (`startEdit`), il confronto è con il rilevamento
**immediatamente precedente a quello in modifica** (non con l'ultimo in assoluto), calcolato
cercando la posizione di `editingId` dentro `history` (già ordinata per data decrescente) e
prendendo l'elemento successivo. `history` per atleta si ricarica ad ogni cambio di atleta/salvataggio/
eliminazione tramite `loadHistory(athleteId)`, che ora **ritorna** i dati appena caricati così
che `resetForm` possa usarli subito per il prefill, senza aspettare un altro giro di render.

Stessa modifica portata identica su **Aurora Atleta360** e **Chiara Atleta360** (`src/Assessment.jsx`
in entrambe) — vedi nota sotto.

## Dashboard gemelle: Aurora e Chiara (2026-07-30)

**`Aurora Atleta360/`** e **`Chiara Atleta360/`** (cartelle sorelle, fuori da questo repo) sono
versioni mono-atleta di questa dashboard, previste da due diversi contratti di sponsorizzazione
tecnica. Condividono il progetto Supabase di questa app (tabelle `aurora_*`/`chiara_*`) e il
Coach IA (`atleta360-coach` su PM2) — vedi CLAUDE.md di root per i dettagli. Non hanno repository
git: si modificano i sorgenti in locale e si sincronizzano sul VPS via `scp` (`/opt/aurora`,
`/opt/chiara`), poi `npm run build` lì. Chiara non aveva **nessuna cartella locale** prima del
2026-07-30 (esisteva solo sul VPS, mai documentata) — è stata scaricata in `Chiara Atleta360/`
apposta per portarci questa modifica; se in futuro manca di nuovo, richiederla via `scp` da
`/opt/chiara` sul VPS (`167.233.167.24`).

Le tre dashboard soft-skill (Oasi/Aurora/Chiara) condividono lo stesso `Assessment`/`NewAssessment`
concettuale (form 1–10 per focus + storico): una feature aggiunta a una delle tre va di norma
replicata identica sulle altre due, salvo differenze strutturali note (Oasi ha selettore atleta,
Aurora/Chiara no; Chiara ha in più il campo "nota di Chiara" per i messaggi WhatsApp dell'atleta).

## Brand

Palette propria Atleta360 (navy `#0A1650`/`#17297A` + arancio `#FF7A18`), **non** segue la
direzione iOS delle altre app Caterino (vedi CLAUDE.md di root). Migrazione da valutare più avanti.

## Modalità demo

`?demo=atleta` / `?demo=societa` in URL fanno un login automatico (per atleta-360.com); le
credenziali demo esistono solo nel progetto Supabase demo, quindi su questo dominio/progetto
falliscono silenziosamente e mostrano la normale schermata di accesso (comportamento atteso,
vedi `src/demoMode.js`).

## Roadmap pianificata (2026-07-20)

Piano a 4 ondate concordato con Danilo:
1. **Fondamenta e UX mobile** ✅ 2026-07-20 — refactoring App.jsx, code splitting, tab bar mobile.
2. **Notifiche** ✅ 2026-07-21 — badge non letti su chat/DM, campanella in-app. Push PWA rimandata
   (vedi sopra).
3. **Esperienza atlete** ✅ 2026-07-21 — autovalutazione (atleta vs mister), obiettivi personali,
   gamification (livelli + streak).
4. **Strumenti staff** ✅ 2026-07-21 — report IA salvati nello storico, registro presenze,
   stampa/PDF rifinita.

Le 4 ondate pianificate sono complete. Ogni ondata che ha toccato il database ha portato il suo
script SQL in `supabase/`: `notifications.sql`, `self-assessments.sql`, `goals.sql`, `reports.sql`,
`attendance.sql` — tutti eseguiti da Danilo nel SQL Editor di Supabase.
