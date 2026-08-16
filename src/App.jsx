import { lazy, Suspense, useState, useEffect, useMemo, useRef } from "react";
import { Home, User, Users, TrendingUp, Info, Menu, X, ShieldCheck, LogOut, ClipboardList, ClipboardPlus, UserCircle, MessagesSquare, MoreHorizontal, CalendarDays } from "lucide-react";
import { C, font, display, ringForRole, applyTheme, getStoredThemeMode, setStoredThemeMode, getStoredAccent, setStoredAccent } from "./theme";
import ThemeToggle from "./components/ThemeToggle";
import { AuthProvider, useAuth } from "./auth";
import { supabase, supabaseConfigured } from "./supabaseClient";
import { fetchModel } from "./data";
import { bindSkills } from "./skills";
import AuthScreen, { ResetPasswordScreen } from "./AuthScreen";
import AdminPanel from "./AdminPanel";
import NewAssessment from "./NewAssessment";
import PersonalArea, { Avatar } from "./PersonalArea";
import ChatPage from "./ChatPage";
import PublicProfileCard from "./PublicProfileCard";
import { getDemoParam, getDemoCredentials } from "./demoMode";
import { StatusBox, DashboardSkeleton } from "./components/ui";
import Footer, { SiteLogo } from "./components/Footer";
import { GateScreen, SetupNotice } from "./components/GateScreens";
import NotificationBell from "./components/NotificationBell";
import InstallPrompt from "./components/InstallPrompt";
import SelfAssessmentWizard from "./components/SelfAssessmentWizard";
import WelcomeAvatar, { needsWelcomeAvatar } from "./components/WelcomeAvatar";
import ErrorBoundary from "./components/ErrorBoundary";
import { useNotifications } from "./notifications";
import SecretEgg from "./components/SecretEgg";
import { useAppSettings } from "./settings";

// Le viste con grafici (recharts) pesano parecchio: caricate on-demand così
// il primo avvio da telefono non le scarica finché non servono davvero.
const HomeView = lazy(() => import("./views/HomeView"));
const ProfiloView = lazy(() => import("./views/ProfiloView"));
const ConfrontoView = lazy(() => import("./views/ConfrontoView"));
const AndamentoView = lazy(() => import("./views/AndamentoView"));
const StaffView = lazy(() => import("./views/StaffView"));
const InfoView = lazy(() => import("./views/InfoView"));
const CalendarioView = lazy(() => import("./views/CalendarioView"));

function ViewFallback() {
  return <DashboardSkeleton />;
}

// La card-obiettivo può non essere ancora nel DOM (vista lazy + dati ancora
// in caricamento): qualche tentativo ravvicinato invece di un singolo timeout.
function scrollToAnchor(id, attempt = 0) {
  const el = document.getElementById(id);
  if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
  if (attempt < 6) setTimeout(() => scrollToAnchor(id, attempt + 1), 400);
}

/* ============================================================
   APP + LAYOUT RESPONSIVE
   ============================================================ */
const BASE_NAV = [
  { id: "home", label: "Home", icon: Home, comp: HomeView },
  { id: "profilo", label: "Profilo Atleta", icon: User, comp: ProfiloView },
  { id: "confronto", label: "Confronto", icon: Users, comp: ConfrontoView },
  { id: "andamento", label: "Andamento", icon: TrendingUp, comp: AndamentoView },
  { id: "calendario", label: "Calendario", icon: CalendarDays, comp: CalendarioView },
  { id: "info", label: "Info & Legenda", icon: Info, comp: InfoView },
];

// Le voci che entrano nella tab bar mobile (le altre restano nel drawer "Altro").
const MOBILE_TAB_IDS = ["home", "profilo", "chat", "andamento"];

// Tema chiaro/scuro/automatico: mutando gli hex condivisi in theme.js e
// forzando un re-render, ogni schermata legge da sola i colori nuovi.
function useThemeToggle() {
  const [mode, setMode] = useState(() => getStoredThemeMode());
  const [accent, setAccent] = useState(() => getStoredAccent());
  const [, bump] = useState(0);

  useEffect(() => {
    applyTheme(mode, accent);
    bump((v) => v + 1);
    if (mode !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { applyTheme("auto", accent); bump((v) => v + 1); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode, accent]);

  const cycle = () => {
    const next = mode === "auto" ? "light" : mode === "light" ? "dark" : "auto";
    setStoredThemeMode(next);
    setMode(next);
  };
  const pickAccent = (key) => { setStoredAccent(key); setAccent(key); };
  const dark = mode === "dark" || (mode === "auto" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  return { mode, cycle, dark, accent, pickAccent };
}

function Dashboard() {
  const { profile, signOut, refreshProfile } = useAuth();
  const theme = useThemeToggle();
  // Interruttori globali (Admin → Impostazioni): "guasto = tutto acceso",
  // vedi src/settings.js — caricati una volta, condivisi da tutte le viste.
  const settings = useAppSettings();
  const isAdmin = profile?.role === "admin";
  const isStaff = isAdmin || ["direzione", "staff"].includes(profile?.category);
  const canAssess = isAdmin || !!profile?.can_assess;   // può inserire rilevamenti (mister)
  const isChatMember = isAdmin || profile?.category === "atleta";  // chat di squadra: atlete + admin
  const isAthlete = profile?.category === "atleta";                // messaggi privati tra atlete

  // Ultimo accesso (Area Staff → Iscritti): un tocco per sessione, non ad
  // ogni render — l'effetto riparte solo se cambia l'id (nuovo login).
  useEffect(() => {
    if (!profile?.id) return;
    const installed = window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
    supabase.rpc("touch_last_seen", { p_installed: !!installed });
  }, [profile?.id]);
  // Un'atleta "semplice" (non staff/admin) vede solo il proprio profilo.
  const viewCtx = {
    restricted: !isStaff && profile?.category === "atleta",
    athleteId: profile?.athlete_id || null,
    firstName: profile?.first_name || "",
    avatarUrl: profile?.avatar_url || "",
    flair: profile?.flair || "",
    avatarConfig: profile?.avatar_config || null,
    nickname: profile?.nickname || "",
    songTitle: profile?.song_title || "",
    songArtist: profile?.song_artist || "",
    ritual: profile?.ritual || "",
    cardBg: profile?.card_bg || "",
    cardBgStyle: profile?.card_bg_style || "sfumata",
    homeHidden: profile?.home_hidden || [],
    motto: profile?.motto || "",
    flags: settings.flags,
    venues: settings.venues,
    uid: profile?.id || null,
    isStaff,
    isAdmin,
  };
  const NAV = [
    ...BASE_NAV,
    ...(isStaff ? [{ id: "staff", label: "Area Staff", icon: ClipboardList, comp: StaffView }] : []),
    ...(canAssess ? [{ id: "rilevamento", label: "Nuovo rilevamento", icon: ClipboardPlus, comp: NewAssessment }] : []),
    { id: "personale", label: "Area personale", icon: UserCircle, comp: PersonalArea },
    ...(isChatMember ? [{ id: "chat", label: "Chat", icon: MessagesSquare, comp: ChatPage }] : []),
    ...(isAdmin ? [{ id: "admin", label: "Admin", icon: ShieldCheck, comp: AdminPanel }] : []),
  ];

  // Vista iniziale: se l'app è stata aperta toccando una notifica push,
  // il service worker passa ?view=... nell'URL (vedi src/sw.js).
  const [view, setView] = useState(() => {
    const v = new URLSearchParams(window.location.search).get("view");
    return ["home", "profilo", "chat", "andamento", "staff", "info", "calendario"].includes(v) ? v : "home";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cardTarget, setCardTarget] = useState(null);          // card social aperta cliccando un nome
  const [profileTarget, setProfileTarget] = useState(null);    // scheda completa (solo staff)
  const [dmTarget, setDmTarget] = useState(null);              // destinataria messaggio privato

  const openCard = (name) => setCardTarget(name);
  const openFullProfile = (name) => { setCardTarget(null); setProfileTarget(name); setView("profilo"); setMobileOpen(false); };
  const openDM = (userId, name) => { setCardTarget(null); setDmTarget({ id: userId, name }); setView("chat"); setMobileOpen(false); };

  // Notifiche: chat di squadra, messaggi privati, nuovi rilevamenti, approvazione.
  const { items: notifications, unread: unreadNotif, unreadChat, unreadDmFromIds, markAllRead, markTypeRead, markFromRead, remove: removeNotif, removeRead: removeReadNotif } = useNotifications(profile?.id);
  const openNotification = (n) => {
    if (n.type === "dm" && n.meta?.from_id) { openDM(n.meta.from_id, n.meta.from_name || ""); return; }
    setView(n.view || "home"); setMobileOpen(false);
    if (n.meta?.anchor) scrollToAnchor(n.meta.anchor);
  };
  // Se la notifica arriva da fuori (push toccata sul telefono), il service
  // worker passa ?anchor=... nell'URL: scrolla dritto alla card giusta
  // invece di lasciare l'atleta a cercarla nella vista.
  useEffect(() => {
    const anchor = new URLSearchParams(window.location.search).get("anchor");
    if (anchor) scrollToAnchor(anchor);
  }, []);
  // Aprendo la chat, le notifiche di bacheca risultano lette (la bacheca è
  // sempre visibile in ChatPage); quelle dei messaggi privati si segnano
  // conversazione per conversazione (vedi onConversationOpen in DirectMessages).
  useEffect(() => { if (view === "chat") markTypeRead(["team_chat"]); }, [view, markTypeRead]);
  // Aprendo il calendario, le notifiche degli eventi risultano lette.
  useEffect(() => { if (view === "calendario") markTypeRead(["event"]); }, [view, markTypeRead]);
  // L'atleta che apre il proprio profilo legge le notifiche di nuovo rilevamento e obiettivo raggiunto.
  useEffect(() => { if (view === "profilo" && viewCtx.restricted) markTypeRead(["assessment", "goal", "star"]); }, [view, viewCtx.restricted, markTypeRead]);

  // Roster dei membri (nome, foto, collegamento atleta) per le card social.
  const [roster, setRoster] = useState([]);
  useEffect(() => { supabase.rpc("chat_roster").then(({ data }) => setRoster(data || [])).catch(() => {}); }, []);
  const rosterByAthlete = useMemo(
    () => Object.fromEntries((roster || []).filter((r) => r.athlete_id).map((r) => [r.athlete_id, r])),
    [roster]
  );

  const [model, setModel] = useState(null);
  const [errore, setErrore] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let active = true;
    setModel(null); setErrore(null);
    fetchModel()
      .then((m) => { if (active) setModel(m); })
      .catch((e) => { if (active) setErrore(e.message); });
    return () => { active = false; };
  }, [reloadKey]);

  // Rende disponibili i focus (da Supabase) alle viste, prima del render dei figli.
  if (model) bindSkills(model);

  const active = NAV.find((x) => x.id === view) || NAV[0];
  const ViewComp = active.comp;

  const mobileTabs = MOBILE_TAB_IDS.map((id) => NAV.find((x) => x.id === id)).filter(Boolean);
  const moreItems = NAV.filter((x) => !MOBILE_TAB_IDS.includes(x.id));
  const moreActive = moreItems.some((x) => x.id === view);

  const goTo = (id) => { setView(id); setMobileOpen(false); if (id === "profilo") setProfileTarget(null); };

  const NavList = () => (
    <nav style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 12px" }}>
      {NAV.map((item) => {
        const on = item.id === view;
        const Icon = item.icon;
        const badge = item.id === "chat" ? unreadChat.length : 0;
        return (
          <button key={item.id} onClick={() => goTo(item.id)}
            style={{ ...font, display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 11,
              border: "none", cursor: "pointer", textAlign: "left", fontSize: 14.5,
              background: on ? "rgba(255,122,24,0.15)" : "transparent",
              color: on ? "#FFB27A" : "rgba(255,255,255,0.72)",
              fontWeight: on ? 600 : 400, borderLeft: on ? `3px solid ${C.orange}` : "3px solid transparent", transition: "all .15s" }}>
            <Icon size={19} /> {item.label}
            {badge > 0 && (
              <span style={{ marginLeft: "auto", minWidth: 18, height: 18, borderRadius: 99, background: "#E11D48", color: "#fff",
                ...display, fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  const Brand = () => (
    <div style={{ padding: "22px 22px 14px" }}>
      <SecretEgg>
        {/* Logo vero, mai ricostruito a mano (regola di brand): la versione
            bianca è quella giusta sul navy della sidebar. */}
        <img src="/logo-esteso-bianco.png" alt="Atleta360" style={{ width: 172, height: "auto", display: "block" }} />
      </SecretEgg>
      <div style={{ marginTop: 12, background: "#fff", borderRadius: 10, padding: "7px 11px", display: "inline-flex" }}>
        <img src="/logo-oasivolley.png" alt="Oasi Volley" style={{ height: 26, width: "auto", display: "block" }} />
      </div>
    </div>
  );

  const ellipsis = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
  const UserFooter = () => (
    <div style={{ marginTop: "auto", padding: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Avatar url={profile?.avatar_url} name={[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.email} size={34} ring={ringForRole(profile?.role, profile?.category)} />
        <div style={{ minWidth: 0 }}>
          <div style={{ ...display, fontSize: 13, color: "#fff", fontWeight: 600, ...ellipsis }}>
            {[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.email}
          </div>
          <div style={{ ...font, fontSize: 11, color: "rgba(255,255,255,0.45)", ...ellipsis }}>
            {isAdmin ? "Amministratore"
              : profile?.category === "direzione" ? "Direzione"
              : profile?.category === "staff" ? "Staff" : "Atleta"}
          </div>
        </div>
      </div>
      <button onClick={signOut} style={{ ...font, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)",
        background: "transparent", color: "rgba(255,255,255,0.85)", cursor: "pointer", fontSize: 13 }}>
        <LogOut size={16} /> Esci
      </button>
    </div>
  );

  // Tab bar in basso su mobile: le voci principali + "Altro" che apre il drawer
  // con il resto (Confronto, Info, Staff, Rilevamento, Area personale, Admin).
  const MobileTabBar = () => (
    <nav className="a360-mobilebar a360-tabbar" style={{ display: "flex", alignItems: "stretch" }}>
      {mobileTabs.map((item) => {
        const on = item.id === view && !mobileOpen;
        const Icon = item.icon;
        const badge = item.id === "chat" ? unreadChat.length : 0;
        return (
          <button key={item.id} onClick={() => goTo(item.id)}
            style={{ ...font, position: "relative", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
              padding: "8px 4px 10px", border: "none", background: "none", cursor: "pointer",
              color: on ? C.orange : "rgba(255,255,255,0.6)", fontSize: 10.5, fontWeight: on ? 600 : 400 }}>
            <span style={{ position: "relative" }}>
              <Icon size={21} />
              {badge > 0 && (
                <span style={{ position: "absolute", top: -4, right: -7, minWidth: 15, height: 15, borderRadius: 99, background: "#E11D48", color: "#fff",
                  ...display, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", border: "2px solid #0A1650" }}>
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </span>
            {item.label === "Profilo Atleta" ? "Profilo" : item.label}
          </button>
        );
      })}
      {moreItems.length > 0 && (
        <button onClick={() => setMobileOpen(true)}
          style={{ ...font, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
            padding: "8px 4px 10px", border: "none", background: "none", cursor: "pointer",
            color: moreActive || mobileOpen ? C.orange : "rgba(255,255,255,0.6)", fontSize: 10.5, fontWeight: moreActive || mobileOpen ? 600 : 400 }}>
          <MoreHorizontal size={21} />
          Altro
        </button>
      )}
    </nav>
  );

  // Contenuto dell'area principale in base allo stato dei dati.
  let content;
  if (active.id === "admin") {
    content = <AdminPanel onChange={reload} />;
  } else if (active.id === "rilevamento") {
    content = <NewAssessment onSaved={reload} />;
  } else if (active.id === "personale") {
    content = <PersonalArea accent={theme.accent} onPickAccent={theme.pickAccent} />;
  } else if (active.id === "chat") {
    content = <ChatPage dmTarget={dmTarget} onMarkDmRead={markFromRead} unreadDmFromIds={unreadDmFromIds} onOpenCard={openCard} />;
  } else if (errore) {
    content = (
      <StatusBox tone="error" title="Non riesco a leggere i dati"
        message="C'è stato un problema nel caricare i dati. Riprova tra poco; se persiste, verifica la connessione. Dettaglio tecnico in console." />
    );
  } else if (!model) {
    content = <DashboardSkeleton />;
  } else {
    // Prima che esista un solo rilevamento in tutta la squadra (es. il
    // giorno del lancio, prima che il mister ne inserisca uno), le viste
    // restano comunque accessibili — ognuna gestisce da sé la squadra
    // vuota — invece di bloccare tutta l'app dietro un unico avviso.
    content = <ViewComp d={model} auth={viewCtx} target={profileTarget} onOpenCard={openCard} onOpenFullProfile={openFullProfile} onReload={reload} onGoView={goTo} />;
  }
  const needsSuspense = ["home", "profilo", "confronto", "andamento", "info", "staff", "calendario"].includes(active.id);

  const isStaffViewer = isStaff;

  return (
    <div style={{ ...font, display: "flex", minHeight: "100vh", background: C.surface, color: C.ink }}>
      {/* Sidebar desktop */}
      <aside style={{ width: 250, background: C.navy, flexShrink: 0, position: "sticky", top: 0, height: "100vh", display: "none", flexDirection: "column" }} className="a360-sidebar">
        <Brand />
        <NavList />
        <UserFooter />
      </aside>
      <style>{`@media (min-width: 900px){ .a360-sidebar{ display:flex !important; } .a360-mobilebar{ display:none !important; } }`}</style>

      {/* Drawer mobile (aperto dalla topbar o dal tasto "Altro" della tab bar) */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={() => setMobileOpen(false)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(10,19,48,0.5)" }} />
          <aside onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: 0, top: 0, height: "100%", width: 260, background: C.navy, display: "flex", flexDirection: "column", paddingTop: "env(safe-area-inset-top, 0px)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Brand />
              <button onClick={() => setMobileOpen(false)} aria-label="Chiudi menu" style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 22 }}><X size={22} /></button>
            </div>
            <NavList />
            <UserFooter />
          </aside>
        </div>
      )}

      {/* Colonna principale */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Topbar mobile */}
        <header className="a360-mobilebar" style={{ display: "flex", alignItems: "center", gap: 14, padding: "calc(14px + env(safe-area-inset-top, 0px)) 18px 14px", background: C.navy, position: "sticky", top: 0, zIndex: 20 }}>
          <button onClick={() => setMobileOpen(true)} aria-label="Apri menu" style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}><Menu size={24} /></button>
          <img src="/logo-esteso-bianco.png" alt="Atleta360" style={{ height: 30, width: "auto", display: "block" }} />
        </header>

        <main className="a360-main" style={{ padding: "clamp(18px, 4vw, 34px)", maxWidth: 1180, width: "100%", margin: "0 auto" }}>
          <div className="a360-page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 22 }}>
            <div>
              <div style={{ ...font, fontSize: 12.5, color: C.orange, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" }}>Dashboard soft skills</div>
              <h1 style={{ ...display, fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 700, color: C.ink, margin: "4px 0 0", letterSpacing: -0.5 }}>{active.label}</h1>
            </div>
            <div className="a360-noprint" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ThemeToggle mode={theme.mode} onCycle={theme.cycle} />
              <NotificationBell items={notifications} unreadCount={unreadNotif.length} onOpenItem={openNotification} onMarkAllRead={markAllRead}
                onRemove={removeNotif} onRemoveRead={removeReadNotif} userId={profile?.id} />
            </div>
          </div>
          <ErrorBoundary key={active.id}>
            {needsSuspense ? <Suspense fallback={<ViewFallback />}>{content}</Suspense> : content}
          </ErrorBoundary>
        </main>
        <Footer />
      </div>

      <MobileTabBar />

      <InstallPrompt userId={profile?.id} />
      {/* L'avatar viene PRIMA di tutto: finché è aperto, il wizard
          dell'autovalutazione aspetta il suo turno. */}
      <WelcomeAvatar profile={profile} onDone={refreshProfile} />
      {!needsWelcomeAvatar(profile) && settings.flags.feature_selfassessment && (
        <SelfAssessmentWizard profile={profile} isStaff={isStaff} onDone={reload} />
      )}

      {cardTarget && model?.atleti?.[cardTarget] && (
        <PublicProfileCard
          identifier={cardTarget}
          model={model}
          entry={rosterByAthlete[cardTarget]}
          viewer={{ isAthlete, uid: profile?.id }}
          onClose={() => setCardTarget(null)}
          onMessage={isAthlete ? openDM : undefined}
          onFullProfile={isStaffViewer ? openFullProfile : undefined}
        />
      )}
    </div>
  );
}

/* ============================================================
   CANCELLO DI ACCESSO — decide cosa mostrare in base all'utente
   ============================================================ */
export default function App() {
  return (
    <AuthProvider>
      <Root />
      <SiteLogo />
    </AuthProvider>
  );
}

function Root() {
  const { loading, session, profile, recovery, signIn, signOut, refreshProfile } = useAuth();

  const demoKind = getDemoParam();
  const demoAttempted = useRef(false);
  const [demoFailed, setDemoFailed] = useState(false);

  useEffect(() => {
    if (!demoKind || loading || session || demoAttempted.current) return;
    demoAttempted.current = true;
    signIn(getDemoCredentials(demoKind)).then((err) => { if (err) setDemoFailed(true); });
  }, [demoKind, loading, session, signIn]);

  // Link di invito: se c'è un token in sospeso (vedi AuthScreen) e l'account
  // appena creato è ancora "pending", lo riscatta subito (approva + collega
  // all'atleta) invece di aspettare lo staff.
  useEffect(() => {
    if (profile?.status !== "pending") return;
    let token = null;
    try { token = localStorage.getItem("a360-invite-token"); } catch { /* ignora */ }
    if (!token) return;
    supabase.rpc("redeem_invite_link", { p_token: token }).then(({ data }) => {
      try { localStorage.removeItem("a360-invite-token"); } catch { /* ignora */ }
      if (data) refreshProfile();
    });
  }, [profile?.status, refreshProfile]);

  if (!supabaseConfigured) return <SetupNotice />;
  if (recovery) return <ResetPasswordScreen />;
  if (loading) return <GateScreen title="Un attimo…" message="Sto verificando il tuo accesso." />;
  if (demoKind && !session && !demoFailed) {
    return <GateScreen title="Un attimo…" message="Sto preparando la demo di Atleta360…" />;
  }
  if (!session) return <AuthScreen />;

  const status = profile?.status;
  if (!profile || status === "pending") {
    return (
      <GateScreen
        title="Richiesta in valutazione"
        message="La tua registrazione è in attesa di approvazione da parte dello staff. Appena viene approvata potrai accedere alla dashboard: riprova più tardi."
        onLogout={signOut}
        onRefresh={refreshProfile}
      />
    );
  }
  if (status === "rejected") {
    return (
      <GateScreen
        title="Accesso non approvato"
        message="La tua richiesta di accesso non è stata approvata. Se pensi sia un errore, contatta lo staff."
        onLogout={signOut}
      />
    );
  }
  return <Dashboard />;
}
