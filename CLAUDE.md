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
3. **Esperienza atlete** — autovalutazione (atleta vs mister), obiettivi personali, più gamification.
4. **Strumenti staff** — report IA salvati nello storico, registro presenze, stampa/PDF rifinita.

Ogni ondata che tocca il database arriva con il suo script SQL in `supabase/`.
