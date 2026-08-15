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
  check `type` con `'reminder'`, RPC `send_reminder(message, recipients uuid[] default null)`
  (solo staff; `recipients` null = tutta la squadra, altrimenti solo gli id profilo scelti — il
  pannello in StaffView ha i due modi), e trigger `dispatch_push` su `notifications`: via
  **pg_net** POSTa a
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

**Push + campanella anche su Aurora** (stesso giorno, poi estesa): `Aurora Atleta360/supabase/push.sql`
(versione completa, sostituisce la prima "solo push") — tabelle `aurora_push_subscriptions` e
`aurora_notifications` (campanella con Realtime, come Oasi), trigger valutazione→notifica e
notifica→push, RPC `aurora_send_reminder(message, recipients text[] = email)`. Client: `src/
notifications.js` + `src/NotificationBell.jsx` (prop `dark` per l'header navy mobile), campanella
montata su header mobile e in alto a destra su desktop. Toggle push anche in Area personale
(`NotificheCard`) e pannello promemoria in fondo alla vista Valutazione. Stesso endpoint e chiavi
VAPID di Oasi. Chiara per ora esclusa per scelta di Danilo.

**Onboarding mobile (2026-08-14)**: `src/components/InstallPrompt.jsx` (Oasi) e `src/
InstallPrompt.jsx` (Aurora, gemello) — al primo accesso da iPhone/Android non installato, banner
guidato "Installa l'app" (prompt nativo `beforeinstallprompt` su Android, passaggi Condividi→
Aggiungi a Home su iOS; "Non mostrare più" in localStorage). Ad app installata con push spente,
popup guidato "Attiva le notifiche" ("Più tardi" = sessionStorage, riproposto alla prossima
apertura). Viewport bloccato (`maximum-scale=1, user-scalable=no` in index.html di entrambe) per
il problema di zoom segnalato da Danilo sull'app installata.

**Coach IA — limiti d'uso (2026-08-14)**: in `api/coach.js`, in memoria nel processo:
15 richieste/ora per IP + tetto globale 300/giorno, con messaggi amichevoli (429) invece di
errori tecnici; il 429 di Gemini (crediti finiti) ha un suo messaggio dedicato. Niente risposte
"finte" quando la generazione fallisce: solo errori onesti. La chiave Gemini è stata sostituita
il 2026-08-14 (la vecchia aveva esaurito i crediti prepagati).

## Le 5 ondate delle "24 domande" (2026-08-14)

Danilo ha chiesto un'intervista stile "se fossi un'atleta/un allenatore" per novità/grafica/
utilità, poi di implementare **tutte** le risposte in sequenza, con deploy dopo ogni ondata
(non tutto insieme a rischio zero — vedi CLAUDE.md di root sul metodo "a ondate").

- **Ondata 1 — Home rinnovata**: `NextEventCard` (countdown prossimo impegno + RSVP + bottone
  "Prepara la testa" se è una partita), `WeeklyChallengeCard` (focus più debole, calcolato al
  volo, nessuna tabella), `CelebrationOverlay` (festa a tutto schermo sui badge mai visti prima,
  localStorage `a360-badges-seen-<atleta>`, propone "Vedi la tua card" → scrolla alla ShareCard).
  **Bug reale scoperto e corretto in Ondata 4**: gli hook della celebrazione erano finiti dopo
  un `return` condizionale in ProfiloView (violazione delle Rules of Hooks) — crash per atlete
  senza dati collegati. Ora tutti gli hook stanno prima di ogni return.
- **Ondata 2 — Strumenti del mister**: piano seduta (colonne `objective`/`exercises` su
  `events`), appunti rapidi per atleta (`athlete_notes`, solo Oasi — non ha senso su Aurora) con
  bottone "Genera bozza con IA" in `NewAssessment.jsx` (nuova modalità `noteDraft` in
  `api/coach.js`, bypassa il system prompt normale), pannello "Da tenere d'occhio" in StaffView
  (presenze in calo, punteggi in discesa da 2+ rilevamenti, autovalutazione mancante — calcolato
  client-side) + promemoria push settimanale (pg_cron, lunedì 8:00).
- **Ondata 3 — Mente e benessere**: diario privato (`athlete_diary`/`aurora_diary`, **solo
  l'atleta e l'admin — mai il mister**, RLS con `is_admin()`), check-in energia pre-allenamento
  (`checkins`, push pomeridiana ≥15:00 sugli allenamenti di oggi), routine pre-partita guidata
  3 passi (`PreMatchRoutine.jsx`, respirazione animata CSS/visualizzazione/carica, push "tra poco
  si gioca" 75 min prima), indisponibilità/infortuni (`unavailability`, sospende promemoria
  evento/check-in per chi la imposta).
- **Ondata 4 — Vita di squadra** (solo Oasi, tranne compleanni: con 3 persone in tutto su Aurora
  le dinamiche di gruppo hanno poco senso): applausi sul profilo (`profile_reactions`, toggle
  tipo "like", push a chi li riceve), compleanni (`athletes.birth_date`, promemoria automatico +
  banner in Home, editabile da StaffView), sondaggi rapidi (`polls`/`poll_votes`, li crea
  chiunque sia approvato — anche le atlete), album foto (`photos`, upload compresso lato client
  canvas→dataURL come l'avatar, **nessun bucket Storage** da configurare).
- **Ondata 5 — Utilità e stile**: dark mode (`theme.js` — `C` resta lo stesso oggetto condiviso,
  `applyTheme()` ne muta le proprietà "sul posto" e un `bump` di stato forza il re-render:
  **non serve toccare i colori inline sparsi in ogni file**, verificato che funziona davvero via
  browser, non solo che compila), motto personale (RPC dedicata `set_my_motto`/
  `aurora_set_motto` — mai un update diretto su `profiles`, per non rischiare `status`/`role`),
  export evento in `.ics` (`src/ics.js`, client-only), scadenze certificati (`certificates`,
  solo date + promemoria 30/7 giorni, **nessun documento caricato**, solo Oasi), cache offline di
  base nel service worker (`workbox-routing`+`workbox-strategies`, `NetworkFirst` **solo sulle
  GET** verso `/rest/v1/` di Supabase — le scritture non passano mai da lì).

**Scope volutamente tagliato** (onestà prima di tutto): copertina profilo e colore preferito
personalizzabile **non fatti** (avrebbero richiesto Storage + propagazione in ShareCard/
PublicProfileCard, rischio/tempo non giustificati in questa ondata); il motto oggi è visibile
**solo alla persona stessa** (la RLS di `profiles` permette la lettura solo di sé stessi o
all'admin — mostrarlo alle compagne richiederebbe allargare quella policy, decisione da prendere
a parte, non presa qui).

**Da eseguire nel SQL Editor** (Oasi): `wave2.sql`, `wave3.sql`, `wave4.sql`, `wave5.sql`
(richiedono `calendar.sql`/`push.sql` già eseguiti). Stesso nome file per Aurora, versioni ridotte.

## Calendario (2026-08-14)

Vista **Calendario** su Oasi (`src/views/CalendarioView.jsx` + hook `src/calendar.js`) e Aurora
(`src/Calendario.jsx` + `src/calendar.js`), scelte concordate via intervista: promemoria push la
sera prima (~20:00), gestione staff (Aurora: admin+mister), allenamenti come **ricorrenza
settimanale** + eventi singoli, conferme presenza, luogo→link Google Maps, risultati partite.

- **`supabase/calendar.sql`** (e gemello in Aurora, tabelle `aurora_*`): `events` (kind
  match/training/other, `reminder_sent`, `cancelled`, `result`, `recurrence_id`),
  `event_recurrences` (weekday 0=domenica, orari, active), `event_rsvps` (unique event+user).
  `generate_recurring_events()` materializza gli eventi delle prossime 5 settimane (unique
  parziale su recurrence_id+starts_at → ri-eseguibile); `send_event_reminders()` gira via
  **pg_cron ogni ora**: quando in Italia sono ≥ le 20 notifica gli eventi di domani (una volta
  sola, flag `reminder_sent`) inserendo in `notifications` tipo **'event'** → push automatica dal
  trigger esistente. Orari costruiti con `at time zone 'Europe/Rome'` (DST-proof).
- Client: RSVP upsert `onConflict event_id,user_id`; spegnere/eliminare una routine cancella i
  suoi eventi futuri; nomi delle conferme visibili solo allo staff. Nav: voce "Calendario" nel
  drawer/sidebar (non nella tab bar mobile), notifica 'event' → icona CalendarDays, aprendo la
  vista si marcano lette (`markTypeRead(["event"])`).
- **Import da file**: Danilo può passare un CSV/Excel (data, ora, tipo, avversario, luogo, note)
  in chat → Claude genera le INSERT da incollare nel SQL Editor. Nessun uploader nell'app.

**Importante**: `supabase/calendar.sql` (Oasi) e `Aurora Atleta360/supabase/calendar.sql` vanno
eseguiti da Danilo nel SQL Editor — richiedono i rispettivi push.sql già eseguiti (pg_cron viene
attivato dallo script).

## Autovalutazione guidata di benvenuto (2026-08-14)

`src/components/SelfAssessmentWizard.jsx`, montato in App.jsx accanto a InstallPrompt.
Richiesta di Danilo: prima l'autovalutazione era irraggiungibile finché il mister non faceva
il primo rilevamento (il profilo atleta nasce dai rilevamenti) — ora alla prima apertura
l'atleta trova un popup guidato ("conosciamoci"): un passo per ogni focus con spiegazione
(dalla tabella `skills`) + voto 1-10, riepilogo, salvataggio diretto in `self_assessments`
(athlete uuid risolto da `athletes.identifier`, senza passare dal modello). Proposto a ogni
apertura finché non completato ("Più tardi" = sessionStorage); una volta salvato, mai più
(il controllo è sull'esistenza di una riga in `self_assessments`). Staff/admin lo vedono in
modalità "anteprima di prova" (nessun salvataggio, flag localStorage per non riproporlo).

Icone (stesso giorno): favicon + set PWA di Oasi E Aurora sostituiti con l'icona ufficiale
Atleta360 (esagono arancio, fonte `atleta360-site/public/logo-icona.png`, come Caterino IG);
`favicon.svg` eliminata, `favicon.png` + `apple-touch-icon.png` nuovi, maskable con margine.
Safe area iOS (stesso giorno): header mobile e drawer con `env(safe-area-inset-top)` — da
app installata la barra finiva sotto l'orologio di sistema e il menu non era cliccabile.

## Gamification — 4 ondate su engagement/ingaggio atlete (2026-08-14)

Dopo un'intervista dedicata ("se fossi una ragazzina che gioca a pallavolo, cosa ti terrebbe
con il focus sull'app?", 16 domande in 4 blocchi), Danilo ha chiesto di implementare **tutte**
le risposte, ondata per ondata con deploy dopo ognuna (stesso metodo delle "24 domande").
Tutto costruito sopra i dati/tabelle già esistenti dove possibile, per limitare il nuovo SQL.

- **Ondata A — il motore** (`supabase/gamify-a.sql`, Oasi + `Aurora Atleta360/supabase/gamify-a.sql`
  ridotto): tabella `participation_points` (mai scritta dal client: solo trigger `AFTER INSERT`
  su `checkins`/`event_rsvps`/`self_assessments`/`profile_reactions` — stesso principio del
  sistema badge, "punti di partecipazione" separati dal punteggio soft-skill), RPC
  `my_participation_level()` (6 livelli: Nuova→Leggenda). `src/participation.js`
  (`useParticipation`, streak check-in calcolata in JS con lo stesso trucco "data meno
  posizione" già usato lato SQL). **Momento del giorno** stile BeReal (`daily_moments`,
  RPC `todays_daily_moments()`, solo Oasi — su Aurora è ridondante col diario/check-in già
  esistenti). **Missione del giorno** (`MissionCard.jsx`, nessuna tabella: appare solo nei
  giorni con un allenamento/partita in calendario e se il check-in di oggi manca ancora,
  con bottone che scrolla all'anchor `#a360-checkin` in `WellbeingCard`).
- **Ondata B** (`supabase/gamify-b.sql`, solo Oasi per la classifica — Aurora non ha il quiz,
  una classifica non ha senso mono-atleta): **quiz settimanale** (`src/quiz.js`, 4 set di 5
  domande sulle regole della pallavolo che ruotano ogni settimana come `phraseOfTheDay()`,
  tabella `quiz_scores` un tentativo/settimana, +2 punti per risposta esatta, RPC
  `weekly_quiz_leaderboard()` per non allargare la RLS di `profiles`). **Bacheca badge
  completa** (`badgeCatalog()` in `badges.js`, `BadgeBoard.jsx`/gemello inline in Aurora
  `App.jsx`: mostra anche i badge NON ancora sbloccati, in grigio con l'indizio per
  sbloccarli). **Curiosità del giorno** (`trivia.js`, stesso trucco di `phrases.js`).
  **Carta collezionabile che evolve**: `ShareCard.jsx` (entrambe le app) ora prende un prop
  `level` e cambia cornice/anello avatar/glow di sfondo in un colore diverso per livello
  (grigio→bronzo→argento→oro→ciano→magenta), badge "🏆 {livello}" in alto — il punteggio
  soft-skill (radar arancio) resta un concetto separato, qui si premia la costanza nell'uso
  dell'app, non la bravura in campo.
- **Ondata C** (`supabase/gamify-c.sql`, solo Oasi — feature sociali, non ha senso su Aurora
  senza compagne): **reazioni sulle foto album** (`photo_reactions`, cuoricino con contatore
  in `PhotoAlbumCard.jsx`, hook esteso in `photos.js`). **Personalizzazione sbloccabile**:
  un'emoji "flair" accanto al nome, scelta da una lista che si allarga salendo di punti,
  salvata con RPC dedicata `set_my_flair` (mai un update diretto su `profiles`, stesso
  principio di `set_my_motto`) — picker in `PersonalArea.jsx`, mostrata in `ProfiloView.jsx`.
  Le reazioni rapide in chat squadra (`message_reactions`) esistevano già, non ricostruite.
  **Scartato di proposito**: MVP della settimana votato dalle compagne — Danilo ha detto
  esplicitamente no in intervista.
- **Ondata D** (`supabase/gamify-d.sql` Oasi + `Aurora Atleta360/supabase/gamify-d.sql`):
  **la stella del mister** (tabella `stars`/`aurora_stars`, insert **solo staff**, mai
  automatica — `AwardStarCard.jsx` in Area Staff, `StarsCard.jsx` nel profilo con lo storico,
  trigger che manda una notifica tipo `'star'` → push automatica dal meccanismo esistente).
  **Recap settimanale "La tua settimana"** (`WeeklyRecapCard.jsx`, nessuna tabella nuova:
  aggrega `participation_points`/`aurora_participation_points` degli ultimi 7 giorni).

**Degrado senza rompere**: ogni nuovo hook (`participation.js`, `quiz.js`) traccia se la
query/RPC è fallita (`unavailable`) e il componente si nasconde finché lo script SQL
corrispondente non è stato eseguito, invece di mostrare un form che poi fallisce silenziosamente
al salvataggio — lezione imparata dal bug reale della stessa giornata (autovalutazione di
Aurora che falliva con "tabella non trovata" perché la migrazione non era mai stata eseguita).

**Da eseguire nel SQL Editor**: `gamify-a.sql` → `gamify-b.sql` → `gamify-c.sql` → `gamify-d.sql`
su Oasi (ognuno idempotente); `gamify-a.sql` → `gamify-d.sql` su Aurora, più
`calendar-athlete-insert.sql` (permette ad Aurora di aggiungere lei stessa eventi al
calendario — richiesta esplicita di Danilo lo stesso giorno, frontend già pronto in
`Aurora Atleta360/src/Calendario.jsx`: `canAdd = canManage || role === "atleta"`).
Consegnati a Danilo come file scaricabili, non incollati in chat (troppo lunghi).

## ⚠️ Script SQL: trappole scoperte eseguendoli in blocco (2026-08-15)

Eseguendo insieme gli script accumulati in mesi diversi sono venute a galla tre
incoerenze che si mascheravano a vicenda. Valgono come regole per ogni script nuovo.

- **Non fidarsi di "già eseguito"**: questo CLAUDE.md dava per eseguiti
  `self-assessments.sql` e `goals.sql`, ma quelle tabelle **non esistevano** sul
  progetto di produzione — gli script fallivano e il SQL Editor annullava tutto
  (una transazione sola). Nessuno se n'era accorto perché l'app degrada in
  silenzio. Verificare sempre con
  `select to_regclass('public.<tabella>');` prima di dare per scontato lo stato
  del database.
- **Nelle policy, qualificare SEMPRE la colonna della riga**: scritto
  `a.id = athlete_id` dentro una subquery che ha `profiles` nel FROM, Postgres
  risolve `athlete_id` con `profiles.athlete_id` (**text**) invece che con la riga
  in inserimento (**uuid**) → `operator does not exist: uuid = text`, e l'intero
  script va in rollback. Va scritto `a.id = <tabella>.athlete_id`. Colpiva solo le
  policy di INSERT: quelle di select/update/delete erano già qualificate, per
  questo il bug è rimasto nascosto a lungo.
- **Vincoli ricreati da zero = liste da tenere allineate**: sei script diversi
  facevano `drop constraint` + `add constraint` su `notifications_type_check`,
  ognuno con la lista dei tipi di quando era stato scritto (5 tipi in `goals.sql`,
  6 in `push.sql`, 9 in `gamify-d.sql`). Eseguirne uno "vecchio" dopo uno "nuovo"
  **restringe** il vincolo e fallisce con `is violated by some row`. Ora tutti
  dichiarano la stessa lista completa: aggiungendo un tipo, aggiornarla in **tutti**
  i file che toccano quel vincolo.
- **Trigger su tabelle di altri script → guardia**: in `gamify-a.sql` i trigger su
  `checkins`/`event_rsvps`/`self_assessments` sono dentro un
  `do $$ ... if exists (select 1 from information_schema.tables ...) ... $$` che
  salta il singolo pezzo con un `raise notice` se la tabella manca, invece di far
  fallire tutto lo script. Pattern da riusare quando un file dipende da un altro.

**Quota Supabase condivisa (stessa giornata)**: il progetto di Oasi mostrava
"EXCEEDING USAGE LIMITS" pur avendo un database sotto 1 MB. I limiti del piano
gratuito valgono **per organizzazione, non per progetto**: a saturarli è il bucket
`post-media` di **Caterino IG** (~1 GB di immagini/video generati, mai ripuliti
perché `deletePost` lì non cancella i file). Se ricompare quel badge su una
qualsiasi app dell'ecosistema, guardare prima **quale** progetto consuma davvero —
non è detto sia quello che mostra l'avviso.

## Bug reali di utilizzo, sistemati in giornata (2026-08-14)

Segnalati da Danilo durante l'uso reale con Oasi Volley, in rapida successione. Tutti corretti,
buildati, committati/pushati (Oasi) o `scp`-ati (Aurora) e deployati sui due VPS lo stesso giorno.

- **Album foto: il tap su una foto non apriva nulla** (`src/components/PhotoAlbumCard.jsx`).
  Causa: `window.open(url, "_blank")` fallisce in silenzio quando l'app gira come **PWA
  installata standalone** (niente "nuova scheda" del browser, specialmente su iOS) — esattamente
  il contesto in cui gira sul telefono di Oasi. Fix: lightbox in-app (overlay full-screen con
  l'immagine, niente `window.open`). Pattern da ricordare: **mai `window.open`/`target="_blank"`
  per contenuti interni** in un'app pensata per girare installata — usare sempre un overlay/router.
- **Registro presenze: nessun modo di cancellare una sessione sbagliata** (`src/attendance.js`,
  `src/components/AttendanceCard.jsx`). Il salvataggio correggeva già i singoli check-in per la
  STESSA data (upsert), ma non c'era modo di eliminare una sessione inserita per la data sbagliata.
  Aggiunta `removeSession(sessionDate)` (delete su `attendance` filtrato per data, già coperto
  dalla policy `attendance write` esistente, nessun nuovo SQL) + elenco sessioni con conferma a
  due tap in fondo alla card.
- **Autovalutazione invisibile finché il mister non valuta** (`src/data.js` `buildModel()`,
  `src/views/ProfiloView.jsx`; stesso bug su Aurora, già risolto lì l'8/14 col wizard di benvenuto
  ma il gate `!last` in `Panoramica` restava). Il profilo atleta nasce SOLO dai rilevamenti del
  mister (`atleti[identifier]` costruito da `assessments`, non da `self_assessments`): un'atleta
  che si autovaluta prima che il mister la valuti mai una volta finiva nel ramo "Ancora nessuna
  valutazione", che ritornava PRIMA di arrivare al rendering di `SelfAssessmentCard` — la sua
  autovalutazione spariva nel nulla anche se salvata correttamente sul DB. Fix: `buildModel()`
  espone ora anche `selfOnly` (autovalutazioni di atlete senza ancora un `atleti[identifier]`);
  `ProfiloView` ha un ramo intermedio tra "nessun profilo collegato" e "profilo completo" che
  mostra comunque `SelfAssessmentCard` quando c'è un'autovalutazione (o quando è lo staff a poterla
  compilare). Attenzione a mantenere l'ordine degli hook invariato (vedi bug Ondata 1 sopra) se si
  ritocca ancora questo file.
- **Frase "leggete solo tu e Danilo" tolta dal diario privato** (`WellbeingCard.jsx` su Oasi e
  Aurora + guida in `InfoView.jsx`/App.jsx): su richiesta di Danilo, la lettura da parte sua è
  solo per salvaguardia in caso di problemi, non serve dirlo esplicitamente alle atlete. Il diario
  resta comunque non visibile al mister (unica cosa rilevante per loro).
- **Rimosso il banner "Icona e nome nuovi"** (`RebrandNotice.jsx`, Oasi e Aurora): avviso una
  tantum per il rebrand dell'8/14 che spiegava come reinstallare la PWA su iPhone per vedere la
  nuova icona — tolto su richiesta di Danilo (comunicherà lui agli utenti quando serve un
  aggiornamento). Il componente resta nel repo ma non è più importato/montato.

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
