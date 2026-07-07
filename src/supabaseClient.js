import { createClient } from "@supabase/supabase-js";

/*
 * Configurazione Supabase.
 *
 * La chiave "anon public" è PUBBLICA per definizione: viaggia sempre nel bundle
 * del frontend (chiunque apra il sito la vede) ed è protetta dalle regole di
 * sicurezza del database (Row Level Security), non dalla sua segretezza.
 * Per questo può stare tranquillamente nel codice come fallback: così l'app
 * funziona anche se le variabili d'ambiente su Vercel non sono impostate.
 *
 * Se in futuro vuoi gestirla solo da variabili d'ambiente, imposta
 * VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY: hanno la precedenza sul fallback.
 */
const FALLBACK_URL = "https://rugkamlysbftwyenvugu.supabase.co";
const FALLBACK_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1Z2thbWx5c2JmdHd5ZW52dWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MTIxNzYsImV4cCI6MjA5ODk4ODE3Nn0.5p6O41YfASA2nEJA-uRnaq13DY8-E0dK_VncpCQ3zAM";

const url = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON;

export const supabaseConfigured = Boolean(url && anon);

export const supabase = supabaseConfigured ? createClient(url, anon) : null;
