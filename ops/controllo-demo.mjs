// Controllo periodico della demo pubblica (demo.atleta-360.com), 27/09/2026.
//
// La demo si era rotta in silenzio: il progetto Supabase a cui puntava era
// stato cancellato e nessuno se n'era accorto (segnalazione di Codex). Qui
// si fa quello che fa un visitatore:
//   1. apre la pagina della demo e trova il file dell'app;
//   2. legge da lì a quale Supabase punta (indirizzo e chiave pubblica);
//   3. prova l'accesso con le credenziali demo, che sono pubbliche.
// Se qualcosa non va, avvisa Danilo con una notifica nell'app di Oasi
// (una volta ogni 24 ore al massimo, finché non torna a funzionare).
//
// Gira dal cron sul VPS, con le variabili di .env.coach (serve la chiave di
// servizio di Oasi SOLO per scrivere la notifica all'admin):
//   cd /opt/atleta360 && set -a && . ./.env.coach && set +a && node ops/controllo-demo.mjs
// Con --prova stampa l'esito e non manda notifiche.
import { readFileSync, writeFileSync } from "node:fs";

const DEMO = "https://demo.atleta-360.com";
const CREDENZIALI = { email: "demo.atleta@atleta-360.com", password: "Atleta360!" };   // come src/demoMode.js
const STATO = "/var/tmp/atleta360-controllo-demo.json";
const PROVA = process.argv.includes("--prova");

async function controlla() {
  const pagina = await fetch(DEMO + "/?demo=atleta", { signal: AbortSignal.timeout(20000) });
  if (!pagina.ok) return `la pagina della demo risponde ${pagina.status}`;
  const js = (await pagina.text()).match(/assets\/index-[\w-]+\.js/)?.[0];
  if (!js) return "non trovo il file dell'app nella pagina della demo";
  const bundle = await (await fetch(`${DEMO}/${js}`, { signal: AbortSignal.timeout(30000) })).text();
  const url = bundle.match(/https:\/\/[a-z0-9]{20}\.supabase\.co/)?.[0];
  const chiave = bundle.match(/eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+/g)?.find((t) => {
    try { return JSON.parse(Buffer.from(t.split(".")[1], "base64url")).role === "anon"; } catch { return false; }
  });
  if (!url || !chiave) return "la demo non contiene un indirizzo Supabase valido";
  let r;
  try {
    r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST", headers: { apikey: chiave, "Content-Type": "application/json" },
      body: JSON.stringify(CREDENZIALI), signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    return `il database della demo non risponde (${url.replace("https://", "")}: ${e.cause?.code || e.message})`;
  }
  if (!r.ok) return `l'accesso demo viene rifiutato (${r.status})`;
  return null;
}

let problema;
try { problema = await controlla(); } catch (e) { problema = `controllo non riuscito: ${e.message}`; }
console.log(new Date().toISOString(), problema ? `DEMO ROTTA: ${problema}` : "demo ok");

let stato = {};
try { stato = JSON.parse(readFileSync(STATO, "utf8")); } catch { /* prima volta */ }
if (!problema) { if (!PROVA) writeFileSync(STATO, JSON.stringify({ ok: new Date().toISOString() })); process.exit(0); }
if (PROVA) process.exit(1);

const ultimoAvviso = stato.avvisato ? new Date(stato.avvisato).getTime() : 0;
if (Date.now() - ultimoAvviso < 24 * 3600 * 1000) process.exit(1);

const U = process.env.SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: K, Authorization: "Bearer " + K, "Content-Type": "application/json" };
const admin = await (await fetch(`${U}/rest/v1/profiles?select=id&role=eq.admin`, { headers: H })).json();
for (const a of Array.isArray(admin) ? admin : []) {
  await fetch(`${U}/rest/v1/notifications`, {
    method: "POST", headers: H,
    body: JSON.stringify({ user_id: a.id, type: "reminder", title: "La demo pubblica non funziona ⚠️",
      body: `demo.atleta-360.com: ${problema}.`, view: "admin" }),
  });
}
writeFileSync(STATO, JSON.stringify({ ...stato, avvisato: new Date().toISOString(), problema }));
process.exit(1);
