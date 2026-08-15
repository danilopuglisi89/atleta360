// Endpoint di consegna delle notifiche push (Web Push / VAPID).
// Viene chiamato dal database Supabase (trigger dispatch_push in
// supabase/push.sql, via pg_net) con la notifica e le subscription
// del destinatario; qui si firma e si spedisce ai browser.
//
// Env richieste (in .env.coach sul VPS):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  — coppia generata con `npx web-push generate-vapid-keys`
//   PUSH_SECRET                          — deve combaciare col segreto nel trigger SQL
import webpush from "web-push";

const CONTACT = "mailto:info@danilopuglisi.com";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, PUSH_SECRET } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return res.status(500).json({ error: "VAPID non configurato" });
  }
  if (PUSH_SECRET && req.headers["x-push-secret"] !== PUSH_SECRET) {
    return res.status(401).json({ error: "Segreto non valido" });
  }

  const { title, body, view, type, anchor, subs } = req.body || {};
  if (!title || !Array.isArray(subs) || subs.length === 0) {
    return res.status(400).json({ error: "Payload incompleto" });
  }

  webpush.setVapidDetails(CONTACT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const payload = JSON.stringify({ title, body: body || "", view: view || "home", type: type || "generic", anchor: anchor || null });
  let ok = 0, gone = 0, failed = 0;

  await Promise.all(subs.map(async (s) => {
    if (!s?.endpoint || !s?.p256dh || !s?.auth) { failed++; return; }
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { TTL: 60 * 60 * 24 }  // se il telefono è offline, riprova per 24h
      );
      ok++;
    } catch (err) {
      // 404/410 = subscription morta (app disinstallata, permesso revocato):
      // il client la ricrea da solo alla prossima apertura, qui basta contarla.
      if (err?.statusCode === 404 || err?.statusCode === 410) gone++;
      else failed++;
    }
  }));

  return res.status(200).json({ ok, gone, failed });
}
