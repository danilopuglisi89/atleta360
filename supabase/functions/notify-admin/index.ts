// ============================================================
// Atleta360 — Edge Function "notify-admin"
// Invia una email di notifica a ogni nuova richiesta di iscrizione.
// Attivata da un Database Webhook su INSERT in public.profiles.
//
// Segreti da impostare (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY  (obbligatorio)  chiave API di Resend
//   NOTIFY_TO       (opzionale)     destinatario; default info@danilopuglisi.com
//   NOTIFY_FROM     (opzionale)     mittente; default onboarding@resend.dev
//   WEBHOOK_SECRET  (consigliato)   stesso valore messo nell'header del webhook
//   APP_URL         (opzionale)     link al pannello nel corpo della mail
// ============================================================

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_TO = Deno.env.get("NOTIFY_TO") ?? "info@danilopuglisi.com";
const NOTIFY_FROM = Deno.env.get("NOTIFY_FROM") ?? "Atleta360 <onboarding@resend.dev>";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");
const APP_URL = Deno.env.get("APP_URL") ?? "https://atleta360-jl71.vercel.app";

const CATEGORY_LABEL: Record<string, string> = {
  direzione: "Direzione",
  staff: "Staff",
  atleta: "Atleta",
};

Deno.serve(async (req) => {
  // Sicurezza: se è impostato un segreto, deve combaciare con l'header del webhook.
  if (WEBHOOK_SECRET && req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const r = payload?.record ?? {};
  const name = [r.first_name, r.last_name].filter(Boolean).join(" ") || "(senza nome)";
  const cat = CATEGORY_LABEL[r.category] ?? r.category ?? "Atleta";

  if (!RESEND_API_KEY) {
    return new Response("RESEND_API_KEY non configurata", { status: 500 });
  }

  const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;color:#0C1330;max-width:520px">
      <h2 style="color:#0A1650;margin:0 0 12px">Nuova richiesta di accesso — Atleta360</h2>
      <p style="font-size:15px;line-height:1.6;margin:0 0 6px">
        <strong>${name}</strong>
        <span style="color:#B4520A;background:#FFE9D5;padding:2px 8px;border-radius:99px;font-size:13px">${cat}</span>
        ha richiesto l'accesso alla dashboard.
      </p>
      <p style="font-size:14px;color:#64708F;margin:0 0 18px">Email: <a href="mailto:${r.email}">${r.email}</a></p>
      <a href="${APP_URL}" style="display:inline-block;background:#FF7A18;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:600;font-size:14px">
        Approva o rifiuta &rarr;
      </a>
    </div>`;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: NOTIFY_FROM,
      to: [NOTIFY_TO],
      subject: `Nuova richiesta accesso: ${name} (${cat})`,
      html,
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    console.error("Errore Resend:", detail);
    return new Response(`Errore invio email: ${detail}`, { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
