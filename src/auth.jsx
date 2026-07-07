import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, supabaseConfigured } from "./supabaseClient";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (sess) => {
    if (!sess?.user) { setProfile(null); return; }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", sess.user.id)
      .maybeSingle();
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) { setLoading(false); return; }
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      if (!active) return;
      setSession(sess);
      await loadProfile(sess);
    });

    return () => { active = false; sub.subscription.unsubscribe(); };
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

  const refreshProfile = () => loadProfile(session);

  return (
    <AuthCtx.Provider value={{ session, profile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthCtx.Provider>
  );
}
