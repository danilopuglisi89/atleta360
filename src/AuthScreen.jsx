import { useState, useEffect } from "react";
import { LogIn, UserPlus, CheckCircle2, AlertCircle, Mail, Lock, Eye, EyeOff, ArrowRight, User } from "lucide-react";
import { C, font, display } from "./theme";
import { useAuth } from "./auth";

// La schermata di accesso è la porta d'ingresso del club: resta sul rosa
// Oasi anche quando l'app è impostata su un altro accento (che comunque è
// una preferenza del dispositivo, letta solo dopo il login).
const ROSA = "#E5007E";
const ROSA_RING = "rgba(229,0,126,0.14)";
const ROSA_SHADOW = "rgba(229,0,126,0.38)";
const SCENA = "#0A1024";

const inputWrap = (focused) => ({
  display: "flex", alignItems: "center", gap: 10, height: 54, boxSizing: "border-box",
  background: focused ? C.card : C.surface,
  border: `1.5px solid ${focused ? ROSA : C.surface}`,
  borderRadius: 14, padding: "0 15px",
  boxShadow: focused ? `0 0 0 3px ${ROSA_RING}` : "none",
  transition: "border-color .15s, box-shadow .15s, background .15s",
});

// 16px non è un vezzo: sotto questa soglia iOS ingrandisce da solo la
// pagina quando il campo prende il fuoco.
// alignSelf stretch: senza, l'input resta alto quanto il testo (~19px) e
// toccare la parte alta o bassa del riquadro da 54px non gli dà il fuoco.
const inputStyle = {
  ...font, fontSize: 16, color: C.ink, background: "transparent",
  border: "none", outline: "none", padding: 0, flexGrow: 1, minWidth: 0,
  alignSelf: "stretch",
};

const labelStyle = { ...font, fontSize: 13, color: C.muted, fontWeight: 600, marginBottom: 7, display: "block" };

function Field({ label, icon: Icon, trailing, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={labelStyle}>{label}</label>}
      <div style={inputWrap(focused)}>
        {Icon && <Icon size={18} color={focused ? ROSA : "#A6AEC4"} style={{ flexShrink: 0 }} />}
        <input {...props} style={inputStyle}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }} />
        {trailing}
      </div>
    </div>
  );
}

// Occhio per mostrare la password: 44px di lato, non un'icona da centrare
// col polpastrello.
function RevealButton({ shown, onToggle }) {
  return (
    <button type="button" onClick={onToggle} aria-label={shown ? "Nascondi password" : "Mostra password"}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44,
        marginRight: -13, flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: C.muted }}>
      {shown ? <EyeOff size={19} /> : <Eye size={19} />}
    </button>
  );
}

// Radar di Atleta360 in sovrimpressione sulla scena, come una grafica di regia.
function RadarOverlay() {
  return (
    <svg viewBox="0 0 375 400" width="375" height="400" aria-hidden="true"
      style={{ position: "absolute", top: 18, left: "50%", transform: "translateX(-50%)", display: "block", opacity: 0.3, pointerEvents: "none" }}>
      <g stroke="#fff" fill="none" strokeWidth="0.9" opacity="0.55">
        <line x1="187" y1="200" x2="187" y2="50" />
        <line x1="187" y1="200" x2="316.9" y2="125" />
        <line x1="187" y1="200" x2="316.9" y2="275" />
        <line x1="187" y1="200" x2="187" y2="350" />
        <line x1="187" y1="200" x2="57.1" y2="275" />
        <line x1="187" y1="200" x2="57.1" y2="125" />
        <polygon points="187,50 316.9,125 316.9,275 187,350 57.1,275 57.1,125" strokeWidth="1.1" />
        <polygon points="187,101 272.7,150.5 272.7,249.5 187,299 101.3,249.5 101.3,150.5" opacity="0.7" />
        <polygon points="187,150.5 229.9,175.3 229.9,224.8 187,249.5 144.1,224.8 144.1,175.3" opacity="0.5" />
      </g>
      <polygon points="187,72.5 277.9,147.5 303.9,267.5 187,297.5 83.1,260 89.6,143.8"
        fill="rgba(255,72,170,0.16)" stroke="#FF48AA" strokeWidth="1.8" strokeLinejoin="round" />
      <g fill="#FF8ACB">
        <circle cx="187" cy="72.5" r="2.8" />
        <circle cx="277.9" cy="147.5" r="2.8" />
        <circle cx="303.9" cy="267.5" r="2.8" />
        <circle cx="187" cy="297.5" r="2.8" />
        <circle cx="83.1" cy="260" r="2.8" />
        <circle cx="89.6" cy="143.8" r="2.8" />
      </g>
    </svg>
  );
}

// Guscio comune ad accesso e reimpostazione password: scena in alto,
// foglio che sale dal basso. Il foglio scorre da solo quando il modulo è
// più lungo dello schermo (registrazione su telefoni piccoli).
function AuthShell({ heroHeight = "min(430px, 38dvh)", children }) {
  return (
    <div className="a360-authshell"
      style={{ ...font, background: SCENA, display: "flex", flexDirection: "column" }}>

      {/* Scena */}
      <div style={{ position: "relative", height: heroHeight, flexShrink: 0, overflow: "hidden" }}>
        <img src="/login-hero.jpg" alt="" aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }} />
        <RadarOverlay />
        {/* Dissolvenza verso il foglio */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 190,
          background: `linear-gradient(to bottom, rgba(10,16,36,0) 0%, rgba(10,16,36,0.75) 55%, ${SCENA} 100%)` }} />

        {/* Marchio */}
        <div style={{ position: "absolute", top: "calc(20px + env(safe-area-inset-top, 0px))", left: 24 }}>
          <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(255,255,255,0.94)",
            borderRadius: 99, padding: "7px 15px", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
            <img src="/logo-oasivolley.png" alt="Oasi Volley Viareggio" style={{ height: 24, width: "auto", display: "block" }} />
          </div>
        </div>
      </div>

      {/* Foglio */}
      <div style={{ flexGrow: 1, position: "relative", marginTop: -28, background: C.card,
        borderRadius: "28px 28px 0 0", padding: "26px 24px 0", boxSizing: "border-box",
        boxShadow: "0 -18px 55px rgba(0,0,0,0.55)" }}>
        <div style={{ maxWidth: 420, margin: "0 auto" }}>
          {children}
          {/* Zona sicura in basso (barra home) */}
          <div style={{ height: "calc(28px + env(safe-area-inset-bottom, 0px))" }} />
        </div>
      </div>
    </div>
  );
}

const primaryBtn = {
  ...font, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  width: "100%", height: 54, borderRadius: 15, border: "none",
  background: ROSA, color: "#fff", fontSize: 16.5, fontWeight: 600, cursor: "pointer",
  boxShadow: `0 8px 22px ${ROSA_SHADOW}`,
};

// Riga da 44px: il vecchio link era alto 15px, si sbagliava mira.
const linkRow = {
  ...font, display: "inline-flex", alignItems: "center", height: 44, padding: "0 4px",
  background: "none", border: "none", cursor: "pointer",
  color: C.navy2, fontSize: 13.5, fontWeight: 600,
};

function ErrorBox({ children }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#FDECEC", color: "#B4232A",
      borderRadius: 12, padding: "11px 13px", ...font, fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
      <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{children}</span>
    </div>
  );
}

export default function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", category: "atleta" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [invited, setInvited] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Link di invito (?invite=token, generato dallo staff): salva il token per
  // il riscatto post-registrazione (vedi redeem_invite_link in App.jsx) e
  // apre subito il tab di registrazione.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("invite");
    if (t) {
      try { localStorage.setItem("a360-invite-token", t); } catch { /* ignora */ }
      setInvited(true); setMode("register");
    }
  }, []);

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    if (mode === "register") {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        setBusy(false); setError("Inserisci nome e cognome."); return;
      }
      const err = await signUp(form);
      setBusy(false);
      if (err) { setError(traduci(err.message)); return; }
      setDone(true);
    } else if (mode === "forgot") {
      const err = await resetPassword(form.email);
      setBusy(false);
      if (err) { setError(traduci(err.message)); return; }
      setDone(true);
    } else {
      const err = await signIn(form);
      setBusy(false);
      if (err) setError(traduci(err.message));
      // se ok, l'AuthProvider aggiorna la sessione e il "cancello" mostra la vista giusta
    }
  };

  const switchMode = (m) => { setMode(m); setError(null); setDone(false); };

  // La scena si misura sullo schermo, non a pixel fissi: così l'accesso
  // entra intero anche su un telefono piccolo, senza dover scorrere per
  // arrivare al pulsante. La registrazione, che ha più campi, la accorcia.
  const heroHeight = done
    ? "min(400px, 36dvh)"
    : mode === "register" ? "min(250px, 22dvh)" : "min(430px, 38dvh)";

  if (done) {
    return (
      <AuthShell heroHeight={heroHeight}>
        <div style={{ textAlign: "center", padding: "6px 4px 0" }}>
          <CheckCircle2 size={46} color={ROSA} style={{ marginBottom: 12 }} />
          <div style={{ ...display, fontSize: 21, fontWeight: 700, color: C.ink }}>
            {mode === "forgot" ? "Email inviata!" : "Richiesta inviata!"}
          </div>
          <p style={{ ...font, fontSize: 14.5, color: C.muted, lineHeight: 1.6, margin: "10px 0 20px" }}>
            {mode === "forgot"
              ? "Ti abbiamo inviato una email con il link per reimpostare la password. Controlla anche lo spam."
              : "La tua richiesta di accesso è stata registrata. Riceverai l'accesso appena lo staff l'avrà approvata. Poi potrai entrare con la tua email e password."}
          </p>
          <button onClick={() => switchMode("login")} style={primaryBtn}>Torna al login</button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell heroHeight={heroHeight}>
      {mode === "forgot" ? (
        <div style={{ marginBottom: 18 }}>
          <div style={{ ...display, fontSize: 26, fontWeight: 700, color: C.ink, letterSpacing: -0.5, lineHeight: 1.15 }}>Recupera password</div>
          <p style={{ ...font, fontSize: 14, color: C.muted, marginTop: 6, lineHeight: 1.45 }}>
            Inserisci la tua email: ti invieremo un link per reimpostarla.
          </p>
        </div>
      ) : mode === "login" ? (
        <div style={{ marginBottom: 18 }}>
          <div style={{ ...display, fontSize: 27, fontWeight: 700, color: C.ink, letterSpacing: -0.5, lineHeight: 1.1 }}>Bentornata.</div>
          <p style={{ ...font, fontSize: 14, color: C.muted, marginTop: 5, lineHeight: 1.45 }}>La tua stagione ti aspetta.</p>
        </div>
      ) : (
        <div style={{ marginBottom: 18 }}>
          <div style={{ ...display, fontSize: 26, fontWeight: 700, color: C.ink, letterSpacing: -0.5, lineHeight: 1.15 }}>Unisciti alla squadra.</div>
          <p style={{ ...font, fontSize: 14, color: C.muted, marginTop: 5, lineHeight: 1.45 }}>Bastano pochi dati per chiedere l'accesso.</p>
        </div>
      )}

      {/* Linguette: 46px, non più 35 */}
      {mode !== "forgot" && (
        <div style={{ display: "flex", gap: 4, background: C.surface, borderRadius: 13, padding: 4, marginBottom: 20 }}>
          {[
            { id: "login", label: "Accedi", Icon: LogIn },
            { id: "register", label: "Registrati", Icon: UserPlus },
          ].map(({ id, label, Icon }) => {
            const on = mode === id;
            return (
              <button key={id} type="button" onClick={() => switchMode(id)}
                style={{ ...font, flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  height: 46, borderRadius: 10, border: "none", cursor: "pointer", fontSize: 15,
                  fontWeight: on ? 600 : 500, background: on ? C.card : "transparent",
                  color: on ? C.navy : C.muted, boxShadow: on ? "0 1px 3px rgba(12,19,48,0.1)" : "none" }}>
                <Icon size={17} /> {label}
              </button>
            );
          })}
        </div>
      )}

      <form onSubmit={submit}>
        {mode === "register" && invited && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#DDF3E7", color: "#0F7A4E",
            borderRadius: 12, padding: "11px 13px", ...font, fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} /> <span>Sei stata invitata dallo staff: appena confermi, il tuo accesso sarà già approvato.</span>
          </div>
        )}

        {mode === "register" && (
          <>
            <Field label="Nome" icon={User} value={form.firstName} onChange={upd("firstName")} autoComplete="given-name" />
            <Field label="Cognome" icon={User} value={form.lastName} onChange={upd("lastName")} autoComplete="family-name" />
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Ruolo</label>
              <div style={inputWrap(false)}>
                <select value={form.category} onChange={upd("category")}
                  style={{ ...inputStyle, cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}>
                  <option value="atleta">Atleta</option>
                  <option value="staff">Staff</option>
                  <option value="direzione">Direzione</option>
                </select>
              </div>
            </div>
          </>
        )}

        <Field label="Email" icon={Mail} type="email" value={form.email} onChange={upd("email")}
          autoComplete="email" inputMode="email" required placeholder="la.tua@email.it" />

        {mode !== "forgot" && (
          <Field label="Password" icon={Lock} type={showPw ? "text" : "password"}
            value={form.password} onChange={upd("password")}
            autoComplete={mode === "register" ? "new-password" : "current-password"} required
            minLength={6} placeholder={mode === "register" ? "almeno 6 caratteri" : ""}
            trailing={<RevealButton shown={showPw} onToggle={() => setShowPw((v) => !v)} />} />
        )}

        {mode === "login" && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
            <button type="button" onClick={() => switchMode("forgot")} style={linkRow}>Password dimenticata?</button>
          </div>
        )}

        {error && <ErrorBox>{error}</ErrorBox>}

        <button type="submit" disabled={busy}
          style={{ ...primaryBtn, marginTop: mode === "login" ? 0 : 8, opacity: busy ? 0.7 : 1, cursor: busy ? "default" : "pointer" }}>
          {busy ? "Attendi…" : mode === "register" ? "Richiedi l'accesso" : mode === "forgot" ? "Invia link di reset" : "Entra"}
          {!busy && mode === "login" && <ArrowRight size={18} />}
        </button>
      </form>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap",
        height: 50, ...font, fontSize: 14, color: C.muted, textAlign: "center" }}>
        {mode === "login" && (
          <>
            Prima volta qui?
            <button type="button" onClick={() => switchMode("register")}
              style={{ ...font, display: "inline-flex", alignItems: "center", height: 44, padding: "0 2px",
                background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, color: C.navy }}>
              Richiedi l'accesso
            </button>
          </>
        )}
        {mode === "register" && <span style={{ fontSize: 12.5, lineHeight: 1.5 }}>La registrazione va approvata dallo staff prima di poter accedere.</span>}
        {mode === "forgot" && (
          <button type="button" onClick={() => switchMode("login")} style={linkRow}>← Torna al login</button>
        )}
      </div>
    </AuthShell>
  );
}

// Schermata mostrata dopo il click sul link di recupero password (evento PASSWORD_RECOVERY).
export function ResetPasswordScreen() {
  const { updatePassword } = useAuth();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [showPw, setShowPw] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 6) { setError("La password deve avere almeno 6 caratteri."); return; }
    if (pw !== pw2) { setError("Le due password non coincidono."); return; }
    setBusy(true);
    const err = await updatePassword(pw);
    setBusy(false);
    if (err) setError(traduci(err.message));
    // se ok, l'AuthProvider esce dalla modalità recovery e il "cancello" mostra la vista giusta
  };

  return (
    <AuthShell heroHeight="min(330px, 30dvh)">
      <div style={{ ...display, fontSize: 25, fontWeight: 700, color: C.ink, letterSpacing: -0.5, lineHeight: 1.15 }}>Nuova password</div>
      <p style={{ ...font, fontSize: 14, color: C.muted, margin: "6px 0 18px", lineHeight: 1.45 }}>Scegli una nuova password per il tuo account.</p>
      <form onSubmit={submit}>
        <Field label="Nuova password" icon={Lock} type={showPw ? "text" : "password"}
          value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} required
          autoComplete="new-password" placeholder="almeno 6 caratteri"
          trailing={<RevealButton shown={showPw} onToggle={() => setShowPw((v) => !v)} />} />
        <Field label="Conferma password" icon={Lock} type={showPw ? "text" : "password"}
          value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={6} required autoComplete="new-password" />
        {error && <ErrorBox>{error}</ErrorBox>}
        <button type="submit" disabled={busy}
          style={{ ...primaryBtn, marginTop: 8, opacity: busy ? 0.7 : 1, cursor: busy ? "default" : "pointer" }}>
          {busy ? "Attendi…" : "Aggiorna password"}
        </button>
      </form>
      <div style={{ height: 22 }} />
    </AuthShell>
  );
}

// Traduce i messaggi d'errore più comuni di Supabase in italiano.
function traduci(msg = "") {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Email o password non corretti.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Questa email è già registrata. Prova ad accedere.";
  if (m.includes("password should be at least")) return "La password deve avere almeno 6 caratteri.";
  if (m.includes("email not confirmed")) return "Email non ancora confermata.";
  if (m.includes("unable to validate email")) return "Indirizzo email non valido.";
  return msg || "Si è verificato un errore. Riprova.";
}
