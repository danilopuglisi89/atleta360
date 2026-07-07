import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Se le variabili non sono impostate, l'app mostra le istruzioni di setup
// invece di crashare.
export const supabaseConfigured = Boolean(url && anon);

export const supabase = supabaseConfigured ? createClient(url, anon) : null;
