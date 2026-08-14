// Onboarding da telefono, in due tempi:
//  1. se l'app NON è installata (iPhone/Android): banner guidato "Installa l'app"
//     — su Android usa il prompt nativo del browser quando disponibile,
//     su iPhone spiega i passaggi (Condividi → Aggiungi a Home);
//  2. se l'app È installata ma le push non sono attive: popup guidato
//     "Attiva le notifiche" (rimandabile, riproposto alla prossima apertura).
import { useEffect, useState } from "react";
import { Share, PlusSquare, BellRing, X, Download } from "lucide-react";
import { C, font, display } from "../theme";
import { usePush } from "../push";

// Il browser emette beforeinstallprompt molto presto: lo catturiamo a livello
// di modulo, prima ancora che React monti, e lo riusiamo al click.
let deferredInstallEvent = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallEvent = e;
  });
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = () => /android/i.test(navigator.userAgent);

const DISMISS_INSTALL = "a360-install-dismissed";   // per sempre (localStorage)
const DISMISS_PUSH = "a360-push-later";             // solo per questa apertura (sessionStorage)

function Sheet({ children, onClose }) {
  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 80, padding: "0 12px calc(14px + env(safe-area-inset-bottom))" }} className="a360-reveal a360-noprint">
      <div style={{ maxWidth: 480, margin: "0 auto", background: C.card, borderRadius: 18, border: `1px solid ${C.grid}`, boxShadow: "0 18px 50px rgba(10,22,80,0.28)", padding: 18, position: "relative" }}>
        <button onClick={onClose} aria-label="Chiudi" style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 6 }}>
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}

export default function InstallPrompt({ userId }) {
  const { status, busy, enable } = usePush(userId);
  const [stage, setStage] = useState(null);   // null | "install-ios" | "install-android" | "push"

  useEffect(() => {
    const mobile = isIos() || isAndroid();
    if (!mobile) return;

    if (isStandalone()) {
      // App installata: proponi le push (una volta per apertura, finché non le attiva).
      if (status === "off" && !sessionStorage.getItem(DISMISS_PUSH)) {
        const t = setTimeout(() => setStage("push"), 1500);
        return () => clearTimeout(t);
      }
      if (status !== "off") setStage((s) => (s === "push" ? null : s));
      return;
    }

    // Browser normale: proponi l'installazione (finché non la rifiuta per sempre).
    if (!localStorage.getItem(DISMISS_INSTALL)) {
      const t = setTimeout(() => setStage(isIos() ? "install-ios" : "install-android"), 1200);
      return () => clearTimeout(t);
    }
  }, [status]);

  if (!stage) return null;

  const dismissInstall = () => { localStorage.setItem(DISMISS_INSTALL, "1"); setStage(null); };
  const dismissPush = () => { sessionStorage.setItem(DISMISS_PUSH, "1"); setStage(null); };

  const Step = ({ n, icon, children }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
      <span style={{ ...display, width: 22, height: 22, borderRadius: 99, background: C.orangeSoft, color: C.orange, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>
      {icon}
      <span style={{ ...font, fontSize: 13.5, color: C.ink, lineHeight: 1.4 }}>{children}</span>
    </div>
  );

  if (stage === "install-ios") {
    return (
      <Sheet onClose={dismissInstall}>
        <div style={{ ...display, fontSize: 16, fontWeight: 700, color: C.ink, paddingRight: 24 }}>Installa l'app sul telefono 📲</div>
        <div style={{ ...font, fontSize: 13, color: C.muted, marginTop: 4 }}>Icona sulla schermata Home, schermo intero e notifiche: 3 tocchi.</div>
        <Step n={1} icon={<Share size={17} color={C.navy2} />}>Tocca <b>Condividi</b> (in basso al centro di Safari)</Step>
        <Step n={2} icon={<PlusSquare size={17} color={C.navy2} />}>Scegli <b>"Aggiungi alla schermata Home"</b></Step>
        <Step n={3} icon={<BellRing size={17} color={C.navy2} />}>Apri l'app <b>dall'icona nuova</b>: ti guiderà ad attivare le notifiche</Step>
        <button onClick={dismissInstall} style={{ ...font, marginTop: 14, fontSize: 12.5, color: C.muted, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
          Non mostrare più
        </button>
      </Sheet>
    );
  }

  if (stage === "install-android") {
    const nativePrompt = async () => {
      if (deferredInstallEvent) {
        deferredInstallEvent.prompt();
        const choice = await deferredInstallEvent.userChoice.catch(() => null);
        deferredInstallEvent = null;
        if (choice?.outcome === "accepted") setStage(null);
      }
    };
    return (
      <Sheet onClose={dismissInstall}>
        <div style={{ ...display, fontSize: 16, fontWeight: 700, color: C.ink, paddingRight: 24 }}>Installa l'app sul telefono 📲</div>
        <div style={{ ...font, fontSize: 13, color: C.muted, marginTop: 4 }}>Icona sulla schermata Home, schermo intero e notifiche.</div>
        {deferredInstallEvent ? (
          <button onClick={nativePrompt}
            style={{ ...font, display: "inline-flex", alignItems: "center", gap: 8, marginTop: 14, padding: "12px 18px", borderRadius: 11, border: "none", background: C.orange, color: "#fff", fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}>
            <Download size={17} /> Installa ora
          </button>
        ) : (
          <>
            <Step n={1} icon={null}>Apri il menu del browser (<b>⋮</b> in alto a destra)</Step>
            <Step n={2} icon={<PlusSquare size={17} color={C.navy2} />}>Scegli <b>"Aggiungi a schermata Home"</b> (o "Installa app")</Step>
            <Step n={3} icon={<BellRing size={17} color={C.navy2} />}>Apri l'app <b>dall'icona nuova</b>: ti guiderà ad attivare le notifiche</Step>
          </>
        )}
        <button onClick={dismissInstall} style={{ ...font, marginTop: 12, fontSize: 12.5, color: C.muted, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", display: "block" }}>
          Non mostrare più
        </button>
      </Sheet>
    );
  }

  // stage === "push": app installata, proponi l'attivazione guidata.
  return (
    <Sheet onClose={dismissPush}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: C.orangeSoft, color: C.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <BellRing size={21} />
        </div>
        <div>
          <div style={{ ...display, fontSize: 16, fontWeight: 700, color: C.ink }}>Attiva le notifiche 🔔</div>
          <div style={{ ...font, fontSize: 13, color: C.muted, marginTop: 2, lineHeight: 1.45 }}>
            Un avviso sul telefono per messaggi, rilevamenti e promemoria — anche ad app chiusa.
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button onClick={async () => { await enable(); setStage(null); }} disabled={busy}
          style={{ ...font, flex: 1, padding: "12px 16px", borderRadius: 11, border: "none", background: C.orange, color: "#fff", fontSize: 14.5, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
          {busy ? "Un attimo…" : "Attiva le notifiche"}
        </button>
        <button onClick={dismissPush}
          style={{ ...font, padding: "12px 16px", borderRadius: 11, border: `1px solid ${C.grid}`, background: C.card, color: C.muted, fontSize: 14, cursor: "pointer" }}>
          Più tardi
        </button>
      </div>
    </Sheet>
  );
}
