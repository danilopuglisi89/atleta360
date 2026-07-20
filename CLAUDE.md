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
- **Push PWA rimandata**: richiederebbe una tabella subscription + endpoint Vercel con firma
  VAPID (pg_net/webhook non basta per il protocollo Web Push) — troppo per questa ondata. Badge +
  campanella + le email Resend già esistenti (`notify-email.sql`) coprono il bisogno per ora.

**Importante**: `supabase/notifications.sql` va incollato ed eseguito da Danilo nel SQL Editor di
Supabase (stesso flusso manuale degli altri script in `supabase/`) — non è stato eseguito da
Claude Code, che non ha credenziali del database di produzione.

## Esperienza atlete (2026-07-21)

- **Autovalutazione** (`supabase/self-assessments.sql`, tabella `self_assessments`): l'atleta si
  valuta sugli stessi focus del mister; nel proprio profilo vede un piccolo radar "come ti vedi
  tu" vs "come ti vede il mister" (`src/components/SelfAssessmentCard.jsx`, editabile solo
  dall'atleta, sola lettura per lo staff). In Area Staff (`StaffView.jsx`) un pannello mostra le
  atlete con lo scostamento medio più grande tra le due valutazioni.
- **Obiettivi personali** (`supabase/goals.sql`, tabella `goals`): target 1-10 su un focus, con
  data facoltativa. Barra di progresso nel profilo (`src/components/GoalsCard.jsx`), editabile
  dall'atleta o dallo staff, sola lettura per chi guarda senza permesso. Il trigger
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
