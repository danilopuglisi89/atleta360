import { useState } from "react";
import { LogIn, UserPlus, CheckCircle2, AlertCircle } from "lucide-react";
import { C, font, display } from "./theme";
import { useAuth } from "./auth";

const inputStyle = {
  ...font, fontSize: 14, color: C.ink, background: "#fff",
  border: `1px solid ${C.grid}`, borderRadius: 10, padding: "11px 13px",
  outline: "none", width: "100%", boxSizing: "border-box",
};
const labelStyle = { ...font, fontSize: 12.5, color: C.muted, fontWeight: 500, marginBottom: 6, display: "block" };

function Field({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      <input {...props} style={inputStyle} />
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

  return (
    <div style={{ ...font, minHeight: "100vh", background: `linear-gradient(160deg, ${C.navy} 0%, ${C.navy2} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Brand */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "12px 18px", display: "inline-flex", boxShadow: "0 10px 30px rgba(0,0,0,0.22)" }}>
            <img src="/logo-oasivolley.png" alt="Oasi Volley Viareggio" style={{ height: 44, width: "auto", display: "block" }} />
          </div>
        </div>

        <div style={{ background: C.card, borderRadius: 18, padding: 26, boxShadow: "0 20px 60px rgba(0,0,0,0.28)" }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "10px 4px" }}>
              <CheckCircle2 size={44} color={C.orange} style={{ marginBottom: 12 }} />
              <div style={{ ...display, fontSize: 18, fontWeight: 700, color: C.ink }}>
                {mode === "forgot" ? "Email inviata!" : "Richiesta inviata!"}
              </div>
              <p style={{ ...font, fontSize: 14, color: C.muted, lineHeight: 1.6, marginTop: 10 }}>
                {mode === "forgot"
                  ? "Ti abbiamo inviato una email con il link per reimpostare la password. Controlla anche lo spam."
                  : "La tua richiesta di accesso è stata registrata. Riceverai l'accesso appena lo staff l'avrà approvata. Poi potrai entrare con la tua email e password."}
              </p>
              <button onClick={() => switchMode("login")} style={primaryBtn}>Torna al login</button>
            </div>
          ) : (
            <>
              {mode === "forgot" ? (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ ...display, fontSize: 17, fontWeight: 700, color: C.ink }}>Recupera password</div>
                  <p style={{ ...font, fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
                    Inserisci la tua email: ti invieremo un link per reimpostarla.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", background: C.surface, borderRadius: 12, padding: 4, marginBottom: 22 }}>
                  {[
                    { id: "login", label: "Accedi", Icon: LogIn },
                    { id: "register", label: "Registrati", Icon: UserPlus },
                  ].map(({ id, label, Icon }) => {
                    const on = mode === id;
                    return (
                      <button key={id} type="button" onClick={() => switchMode(id)}
                        style={{ ...font, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                          padding: "9px 10px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 14,
                          fontWeight: on ? 600 : 500, background: on ? "#fff" : "transparent",
                          color: on ? C.navy : C.muted, boxShadow: on ? "0 1px 3px rgba(12,19,48,0.1)" : "none" }}>
                        <Icon size={16} /> {label}
                      </button>
                    );
                  })}
                </div>
              )}

              <form onSubmit={submit}>
                {mode === "register" && (
                  <>
                    <Field label="Nome" value={form.firstName} onChange={upd("firstName")} autoComplete="given-name" />
                    <Field label="Cognome" value={form.lastName} onChange={upd("lastName")} autoComplete="family-name" />
                    <div style={{ marginBottom: 14 }}>
                      <label style={labelStyle}>Ruolo</label>
                      <select value={form.category} onChange={upd("category")} style={{ ...inputStyle, cursor: "pointer" }}>
                        <option value="atleta">Atleta</option>
                        <option value="staff">Staff</option>
                        <option value="direzione">Direzione</option>
                      </select>
                    </div>
                  </>
                )}
                <Field label="Email" type="email" value={form.email} onChange={upd("email")} autoComplete="email" required />
                {mode !== "forgot" && (
                  <Field label="Password" type="password" value={form.password} onChange={upd("password")}
                    autoComplete={mode === "register" ? "new-password" : "current-password"} required
                    minLength={6} placeholder={mode === "register" ? "almeno 6 caratteri" : ""} />
                )}

                {mode === "login" && (
                  <div style={{ textAlign: "right", marginTop: -4, marginBottom: 14 }}>
                    <button type="button" onClick={() => switchMode("forgot")} style={linkBtn}>Password dimenticata?</button>
                  </div>
                )}

                {error && (
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#FDECEC", color: "#B4232A",
                    borderRadius: 10, padding: "10px 12px", ...font, fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{error}</span>
                  </div>
                )}

                <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.7 : 1, cursor: busy ? "default" : "pointer" }}>
                  {busy ? "Attendi…" : mode === "register" ? "Richiedi l'accesso" : mode === "forgot" ? "Invia link di reset" : "Entra"}
                </button>
              </form>

              <p style={{ ...font, fontSize: 12, color: C.muted, textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
                {mode === "register" && "La registrazione va approvata dallo staff prima di poter accedere."}
                {mode === "login" && "Non hai ancora accesso? Passa a “Registrati” e invia la richiesta."}
                {mode === "forgot" && (
                  <button type="button" onClick={() => switchMode("login")} style={linkBtn}>← Torna al login</button>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const primaryBtn = {
  ...font, width: "100%", marginTop: 8, padding: "12px 16px", borderRadius: 11, border: "none",
  background: C.orange, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
};

const linkBtn = {
  ...font, background: "none", border: "none", padding: 0, cursor: "pointer",
  color: C.navy2, fontSize: 12.5, fontWeight: 500, textDecoration: "underline",
};

const shell = {
  ...font, minHeight: "100vh", background: `linear-gradient(160deg, ${C.navy} 0%, ${C.navy2} 100%)`,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
};

// Schermata mostrata dopo il click sul link di recupero password (evento PASSWORD_RECOVERY).
export function ResetPasswordScreen() {
  const { updatePassword } = useAuth();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

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
    <div style={shell}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "12px 18px", display: "inline-flex", boxShadow: "0 10px 30px rgba(0,0,0,0.22)" }}>
            <img src="/logo-oasivolley.png" alt="Oasi Volley Viareggio" style={{ height: 44, width: "auto", display: "block" }} />
          </div>
        </div>
        <div style={{ background: C.card, borderRadius: 18, padding: 26, boxShadow: "0 20px 60px rgba(0,0,0,0.28)" }}>
          <div style={{ ...display, fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Imposta una nuova password</div>
          <p style={{ ...font, fontSize: 13, color: C.muted, marginBottom: 18, lineHeight: 1.5 }}>Scegli una nuova password per il tuo account.</p>
          <form onSubmit={submit}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Nuova password</label>
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} required autoComplete="new-password" placeholder="almeno 6 caratteri" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Conferma password</label>
              <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={6} required autoComplete="new-password" style={inputStyle} />
            </div>
            {error && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#FDECEC", color: "#B4232A",
                borderRadius: 10, padding: "10px 12px", ...font, fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{error}</span>
              </div>
            )}
            <button type="submit" disabled={busy} style={{ ...primaryBtn, marginTop: 0, opacity: busy ? 0.7 : 1, cursor: busy ? "default" : "pointer" }}>
              {busy ? "Attendi…" : "Aggiorna password"}
            </button>
          </form>
        </div>
      </div>
    </div>
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
