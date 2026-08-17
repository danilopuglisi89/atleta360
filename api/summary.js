// Endpoint di riepilogo in SOLA LETTURA della squadra.
// Nasce per il widget "Oasi" del desktop Windows 12 Beta (progetto windows12/),
// che non poteva mostrare nulla: questa dashboard legge tutto da Supabase
// direttamente lato client con RLS, quindi non esisteva alcun endpoint HTTP
// interrogabile da fuori.
//
// Restituisce solo NUMERI e il prossimo impegno — nessun dato personale delle
// atlete (niente nomi, punteggi, note, diari): un riepilogo che, se anche
// finisse nel posto sbagliato, non racconta nulla di nessuno.
//
// Env richieste (in .env.coach sul VPS, accanto a quelle di coach/push):
//   SUPABASE_URL                 — stesso progetto della dashboard
//   SUPABASE_SERVICE_ROLE_KEY    — service role: scavalca la RLS, resta SOLO sul server
//   SUMMARY_SECRET (facoltativo) — se impostata, va inviata in x-summary-secret
//
// Senza le prime due l'endpoint risponde 503 con un messaggio chiaro invece di
// rompersi: stesso principio "degrada senza rompere" del resto dell'ecosistema.

const TABLE_ATHLETES = "athletes";
const TABLE_EVENTS = "events";
const TABLE_NOTIFICATIONS = "notifications";

async function sbSelect(base, key, path) {
  const res = await fetch(`${base}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      // count=exact + Range vuoto: Postgrest ritorna il totale nell'header
      // Content-Range senza scaricare le righe.
      Prefer: "count=exact",
    },
  });
  if (!res.ok) throw new Error(`Supabase ${path} → HTTP ${res.status}`);
  const range = res.headers.get("content-range") || "";
  const total = Number(range.split("/")[1]);
  return { rows: await res.json(), total: Number.isFinite(total) ? total : null };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUMMARY_SECRET } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: "Supabase non configurato per il riepilogo" });
  }
  if (SUMMARY_SECRET && req.headers["x-summary-secret"] !== SUMMARY_SECRET) {
    return res.status(401).json({ error: "Segreto non valido" });
  }

  try {
    const nowIso = new Date().toISOString();

    const [athletes, nextEvents, unread] = await Promise.all([
      // Solo le atlete attive: quelle archiviate restano nello storico ma non
      // fanno più parte della squadra (vedi "archiviazione soft" in CLAUDE.md).
      sbSelect(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, `${TABLE_ATHLETES}?select=id&active=eq.true`),
      sbSelect(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        `${TABLE_EVENTS}?select=kind,title,starts_at,location&cancelled=eq.false&starts_at=gte.${nowIso}&order=starts_at.asc&limit=1`
      ),
      sbSelect(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        `${TABLE_NOTIFICATIONS}?select=id&read=eq.false`
      ),
    ]);

    const next = nextEvents.rows[0] || null;

    return res.status(200).json({
      athletes: athletes.total ?? athletes.rows.length,
      nextEvent: next
        ? {
            kind: next.kind,           // 'match' | 'training' | 'other'
            title: next.title || null,
            startsAt: next.starts_at,
            location: next.location || null,
          }
        : null,
      unreadNotifications: unread.total ?? unread.rows.length,
      generatedAt: nowIso,
    });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
