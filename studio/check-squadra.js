// Stato della squadra a colpo d'occhio: chi è entrata, chi ha l'app
// installata, chi ha le notifiche, chi ha il profilo completo.
//
// Gira SOLO sul VPS, dove sta la chiave di servizio (mai in locale, mai nel
// repository). Uso:
//   cd /opt/atleta360 && set -a && . ./.env.coach && set +a && node studio/check-squadra.js
const U = process.env.SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!U || !K) { console.error("Mancano SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

const get = async (p) =>
  (await fetch(U + "/rest/v1/" + p, { headers: { apikey: K, Authorization: "Bearer " + K } })).json();

const giorni = (iso) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null);

// Stessa definizione del popup nell'app: foto + ruolo + almeno un contatto.
const CONTATTI = ["phone", "instagram", "tiktok", "youtube", "snapchat", "facebook"];
const completo = (p) =>
  !!(p.avatar_url || p.avatar_config) && !!(p.ruolo || "").trim() && CONTATTI.some((c) => (p[c] || "").trim());

(async () => {
  const [profili, push, eventi] = await Promise.all([
    get("profiles?select=id,first_name,category,status,last_seen_at,pwa_installed,avatar_url,avatar_config,ruolo,phone,instagram,tiktok,youtube,snapchat,facebook&status=eq.approved"),
    get("push_subscriptions?select=user_id"),
    get("app_events?select=kind"),
  ]);

  const atlete = profili.filter((p) => p.category === "atleta");
  const conPush = new Set((push || []).map((r) => r.user_id));

  const riga = (p) => {
    const d = giorni(p.last_seen_at);
    return [
      (p.first_name || "?").padEnd(12),
      d === null ? "mai entrata" : d === 0 ? "oggi       " : `${d}g fa`.padEnd(11),
      p.pwa_installed ? "app ✓" : "app —",
      conPush.has(p.id) ? "push ✓" : "push —",
      completo(p) ? "profilo ✓" : "profilo —",
    ].join("  ");
  };

  const entrate = atlete.filter((p) => p.last_seen_at);
  console.log(`\nATLETE APPROVATE: ${atlete.length}`);
  console.log(`entrate almeno una volta: ${entrate.length}`);
  console.log(`app installata:           ${atlete.filter((p) => p.pwa_installed).length}`);
  console.log(`notifiche attive:         ${atlete.filter((p) => conPush.has(p.id)).length}`);
  console.log(`profilo completo:         ${atlete.filter(completo).length}\n`);

  atlete
    .slice()
    .sort((a, b) => (giorni(b.last_seen_at) ?? 1e9) - (giorni(a.last_seen_at) ?? 1e9))
    .reverse()
    .forEach((p) => console.log("  " + riga(p)));

  const perTipo = (eventi || []).reduce((m, r) => ((m[r.kind] = (m[r.kind] || 0) + 1), m), {});
  console.log("\nazioni tracciate:", Object.keys(perTipo).length ? JSON.stringify(perTipo) : "nessuna ancora");

  // "app installata" si accende solo quando l'app viene aperta dall'icona in
  // Home: aperta dentro il browser resta a no anche se è installata davvero.
  console.log("\nNota: 'app ✓' si registra solo aprendo dall'icona, non dal browser.\n");
})();
