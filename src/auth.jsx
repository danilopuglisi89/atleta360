import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase, supabaseConfigured } from "./supabaseClient";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);

  // Contatore delle richieste: se arrivano due caricamenti del profilo
  // sovrapposti (avvio + rinnovo del token), vince solo l'ultimo.
  const profileReq = useRef(0);

  const loadProfile = useCallback(async (sess) => {
    const req = ++profileReq.current;
    if (!sess?.user) { setProfile(null); return; }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", sess.user.id)
      .maybeSingle();
    if (req === profileReq.current) setProfile(data ?? null);
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) { setLoading(false); return; }
    let active = true;

    // Rete di sicurezza: qualunque cosa succeda, lo schermo "Un attimo…"
    // non può restare per sempre.
    const watchdog = setTimeout(() => { if (active) setLoading(false); }, 10000);

    supabase.auth.getSession()
      .then(async ({ data }) => {
        if (!active) return;
        setSession(data.session);
        await loadProfile(data.session);
      })
      .catch(() => { /* senza sessione si vede il login */ })
      .finally(() => { if (active) { clearTimeout(watchdog); setLoading(false); } });

    // ⚠️ Questo callback NON deve fare await di chiamate Supabase.
    // Gira mentre il client tiene il lucchetto dell'autenticazione: una query
    // lanciata qui dentro aspetta lo stesso lucchetto e tutto si blocca.
    // Succedeva riaprendo l'app installata dopo ore, col token scaduto: il
    // rinnovo scatenava l'evento, il profilo restava in attesa e l'app
    // rimaneva ferma su "Un attimo…" / "Attendi…" finché non si ricaricava.
    // Il setTimeout sposta il caricamento fuori dal lucchetto.
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(sess);
      setTimeout(() => { if (active) loadProfile(sess); }, 0);
    });

    return () => { active = false; clearTimeout(watchdog); sub.subscription.unsubscribe(); };
  }, [loadProfile]);

  const signUp = async ({ firstName, lastName, email, password, category }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName, category } },
    });
    return error;
  };

  const signIn = async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return error;
  };

  const updatePassword = async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setRecovery(false);
    return error;
  };

  const refreshProfile = () => loadProfile(session);

  return (
    <AuthCtx.Provider value={{ session, profile, loading, recovery, signUp, signIn, signOut, resetPassword, updatePassword, refreshProfile }}>
      {children}
    </AuthCtx.Provider>
  );
}
