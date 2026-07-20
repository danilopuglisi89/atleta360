import { lazy, Suspense, useState, useEffect, useMemo, useRef } from "react";
import { Home, User, Users, TrendingUp, Info, Menu, X, ShieldCheck, LogOut, ClipboardList, ClipboardPlus, UserCircle, MessagesSquare, MoreHorizontal } from "lucide-react";
import { C, font, display, ringForRole } from "./theme";
import { AuthProvider, useAuth } from "./auth";
import { supabase, supabaseConfigured } from "./supabaseClient";
import { fetchModel } from "./data";
import { bindSkills } from "./skills";
import AuthScreen, { ResetPasswordScreen } from "./AuthScreen";
import AdminPanel from "./AdminPanel";
import NewAssessment from "./NewAssessment";
import PersonalArea, { Avatar } from "./PersonalArea";
import ChatPage from "./ChatPage";
import AdminChatLog from "./AdminChatLog";
import PublicProfileCard from "./PublicProfileCard";
import { getDemoParam, getDemoCredentials } from "./demoMode";
import { StatusBox, DashboardSkeleton } from "./components/ui";
import Footer, { SiteLogo } from "./components/Footer";
import { GateScreen, SetupNotice } from "./components/GateScreens";

// Le viste con grafici (recharts) pesano parecchio: caricate on-demand così
// il primo avvio da telefono non le scarica finché non servono davvero.
const HomeView = lazy(() => import("./views/HomeView"));
const ProfiloView = lazy(() => import("./views/ProfiloView"));
const ConfrontoView = lazy(() => import("./views/ConfrontoView"));
const AndamentoView = lazy(() => import("./views/AndamentoView"));
const StaffView = lazy(() => import("./views/StaffView"));
const InfoView = lazy(() => import("./views/InfoView"));

function ViewFallback() {
  return <DashboardSkeleton />;
}

/* ============================================================
   APP + LAYOUT RESPONSIVE
   ============================================================ */
const BASE_NAV = [
  { id: "home", label: "Home", icon: Home, comp: HomeView },
  { id: "profilo", label: "Profilo Atleta", icon: User, comp: ProfiloView },
  { id: "confronto", label: "Confronto", icon: Users, comp: ConfrontoView },
  { id: "andamento", label: "Andamento", icon: TrendingUp, comp: AndamentoView },
  { id: "info", label: "Info & Legenda", icon: Info, comp: InfoView },
];

// Le voci che entrano nella tab bar mobile (le altre restano nel drawer "Altro").
const MOBILE_TAB_IDS = ["home", "profilo", "chat", "andamento"];

function Dashboard() {
  const { profile, signOut } = useAuth();
  const isAdmin = profile?.role === "admin";
  const isStaff = isAdmin || ["direzione", "staff"].includes(profile?.category);
  const canAssess = isAdmin || !!profile?.can_assess;   // può inserire rilevamenti (mister)
  const isChatMember = isAdmin || profile?.category === "atleta";  // chat di squadra: atlete + admin
  const isAthlete = profile?.category === "atleta";                // messaggi privati tra atlete
  // Un'atleta "semplice" (non staff/admin) vede solo il proprio profilo.
  const viewCtx = {
    restricted: !isStaff && profile?.category === "atleta",
    athleteId: profile?.athlete_id || null,
    firstName: profile?.first_name || "",
    avatarUrl: profile?.avatar_url || "",
  };
  const NAV = [
    ...BASE_NAV,
    ...(isStaff ? [{ id: "staff", label: "Area Staff", icon: ClipboardList, comp: StaffView }] : []),
    ...(canAssess ? [{ id: "rilevamento", label: "Nuovo rilevamento", icon: ClipboardPlus, comp: NewAssessment }] : []),
    { id: "personale", label: "Area personale", icon: UserCircle, comp: PersonalArea },
    ...(isChatMember ? [{ id: "chat", label: "Chat", icon: MessagesSquare, comp: ChatPage }] : []),
    ...(isAdmin ? [{ id: "admin", label: "Admin", icon: ShieldCheck, comp: AdminPanel }] : []),
  ];

  const [view, setView] = useState("home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cardTarget, setCardTarget] = useState(null);          // card social aperta cliccando un nome
  const [profileTarget, setProfileTarget] = useState(null);    // scheda completa (solo staff)
  const [dmTarget, setDmTarget] = useState(null);              // destinataria messaggio privato

  const openCard = (name) => setCardTarget(name);
  const openFullProfile = (name) => { setCardTarget(null); setProfileTarget(name); setView("profilo"); setMobileOpen(false); };
  const openDM = (userId, name) => { setCardTarget(null); setDmTarget({ id: userId, name }); setView("chat"); setMobileOpen(false); };

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
        return (
          <button key={item.id} onClick={() => goTo(item.id)}
            style={{ ...font, display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 11,
              border: "none", cursor: "pointer", textAlign: "left", fontSize: 14.5,
              background: on ? "rgba(255,122,24,0.15)" : "transparent",
              color: on ? "#FFB27A" : "rgba(255,255,255,0.72)",
              fontWeight: on ? 600 : 400, borderLeft: on ? `3px solid ${C.orange}` : "3px solid transparent", transition: "all .15s" }}>
            <Icon size={19} /> {item.label}
          </button>
        );
      })}
    </nav>
  );

  const Brand = () => (
    <div style={{ padding: "22px 22px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", ...display, fontWeight: 700, color: "#fff", fontSize: 13, letterSpacing: -0.5 }}>360</div>
        <div style={{ ...display, color: "#fff", fontWeight: 700, fontSize: 17, letterSpacing: -0.3 }}>Atleta360</div>
      </div>
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
        return (
          <button key={item.id} onClick={() => goTo(item.id)}
            style={{ ...font, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
              padding: "8px 4px 10px", border: "none", background: "none", cursor: "pointer",
              color: on ? C.orange : "rgba(255,255,255,0.6)", fontSize: 10.5, fontWeight: on ? 600 : 400 }}>
            <Icon size={21} />
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
    content = (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <AdminPanel onChange={reload} />
        <AdminChatLog />
      </div>
    );
  } else if (active.id === "rilevamento") {
    content = <NewAssessment onSaved={reload} />;
  } else if (active.id === "personale") {
    content = <PersonalArea />;
  } else if (active.id === "chat") {
    content = <ChatPage dmTarget={dmTarget} />;
  } else if (errore) {
    content = (
      <StatusBox tone="error" title="Non riesco a leggere i dati"
        message="C'è stato un problema nel caricare i dati. Riprova tra poco; se persiste, verifica la connessione. Dettaglio tecnico in console." />
    );
  } else if (!model) {
    content = <DashboardSkeleton />;
  } else if (model.NOMI.length === 0) {
    content = <StatusBox title="Nessun rilevamento ancora" message="Appena il mister inserisce il primo rilevamento dalla pagina “Nuovo rilevamento”, la dashboard si popola da sola." />;
  } else {
    content = <ViewComp d={model} auth={viewCtx} target={profileTarget} onOpenCard={openCard} onOpenFullProfile={openFullProfile} />;
  }
  const needsSuspense = ["home", "profilo", "confronto", "andamento", "info", "staff"].includes(active.id);

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
          <aside onClick={(e) => e.stopPropagation()} style={{ position: "absolute", left: 0, top: 0, height: "100%", width: 260, background: C.navy, display: "flex", flexDirection: "column" }}>
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
        <header className="a360-mobilebar" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: C.navy, position: "sticky", top: 0, zIndex: 20 }}>
          <button onClick={() => setMobileOpen(true)} aria-label="Apri menu" style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}><Menu size={24} /></button>
          <div style={{ ...display, color: "#fff", fontWeight: 700, fontSize: 16 }}>Atleta360</div>
        </header>

        <main className="a360-main" style={{ padding: "clamp(18px, 4vw, 34px)", maxWidth: 1180, width: "100%", margin: "0 auto" }}>
          <div style={{ marginBottom: 22 }}>
            <div style={{ ...font, fontSize: 12.5, color: C.orange, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase" }}>Dashboard soft skills</div>
            <h1 style={{ ...display, fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 700, color: C.ink, margin: "4px 0 0", letterSpacing: -0.5 }}>{active.label}</h1>
          </div>
          {needsSuspense ? <Suspense fallback={<ViewFallback />}>{content}</Suspense> : content}
        </main>
        <Footer />
      </div>

      <MobileTabBar />

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
