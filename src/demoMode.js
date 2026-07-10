// Modalità demo per atleta360.it: attiva SOLO se l'URL contiene ?demo=atleta|societa.
// Le credenziali esistono solo nel progetto Supabase demo (mai in quello di produzione),
// quindi su questo dominio (oasi.danilopuglisi.com) il login automatico fallisce silenziosamente
// e l'app mostra la normale schermata di accesso.
const DEMO_PASSWORD = "Atleta360!";

const DEMO_CREDENTIALS = {
  atleta: { email: "demo.atleta@atleta360.it", password: DEMO_PASSWORD },
  societa: { email: "demo.societa@atleta360.it", password: DEMO_PASSWORD },
};

export function getDemoParam() {
  const p = new URLSearchParams(window.location.search).get("demo");
  return p === "atleta" || p === "societa" ? p : null;
}

export function getDemoCredentials(kind) {
  return DEMO_CREDENTIALS[kind];
}
