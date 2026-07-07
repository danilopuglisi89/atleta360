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
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 11, marginBottom: 22 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", ...display, fontWeight: 700, color: "#fff", fontSize: 14, letterSpacing: -0.5 }}>360</div>
          <div style={{ ...display, color: "#fff", fontWeight: 700, fontSize: 22, letterSpacing: -0.3 }}>Atleta360</div>
        </div>

        <div style={{ background: C.card, borderRadius: 18, padding: 26, boxShadow: "0 20px 60px rgba(0,0,0,0.28)" }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "10px 4px" }}>
              <CheckCircle2 size={44} color={C.orange} style={{ marginBottom: 12 }} />
              <div style={{ ...display, fontSize: 18, fontWeight: 700, color: C.ink }}>Richiesta inviata!</div>
              <p style={{ ...font, fontSize: 14, color: C.muted, lineHeight: 1.6, marginTop: 10 }}>
                La tua richiesta di accesso è stata registrata. Riceverai l'accesso appena
                lo staff l'avrà approvata. Poi potrai entrare con la tua email e password.
              </p>
              <button onClick={() => switchMode("login")} style={primaryBtn}>Torna al login</button>
            </div>
          ) : (
            <>
              {/* Tab */}
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

              <form onSubmit={submit}>
                {mode === "register" && (
                  <>
                    <Field label="Nome" value={form.firstName} onChange={upd("firstName")} autoComplete="given-name" />
                    <Field label="Cognome" value={form.lastName} onChange={upd("lastName")} autoComplete="family-name" />
                  </>
                )}
                <Field label="Email" type="email" value={form.email} onChange={upd("email")} autoComplete="email" required />
                <Field label="Password" type="password" value={form.password} onChange={upd("password")}
                  autoComplete={mode === "register" ? "new-password" : "current-password"} required
                  minLength={6} placeholder={mode === "register" ? "almeno 6 caratteri" : ""} />

                {error && (
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#FDECEC", color: "#B4232A",
                    borderRadius: 10, padding: "10px 12px", ...font, fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{error}</span>
                  </div>
                )}

                <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.7 : 1, cursor: busy ? "default" : "pointer" }}>
                  {busy ? "Attendi…" : mode === "register" ? "Richiedi l'accesso" : "Entra"}
                </button>
              </form>

              <p style={{ ...font, fontSize: 12, color: C.muted, textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
                {mode === "register"
                  ? "La registrazione va approvata dallo staff prima di poter accedere."
                  : "Non hai ancora accesso? Passa a “Registrati” e invia la richiesta."}
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
