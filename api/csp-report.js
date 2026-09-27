// Raccoglie le segnalazioni della Content-Security-Policy in prova
// (header Content-Security-Policy-Report-Only in nginx, 27/09/2026).
// Servono a scoprire cosa romperebbe la CSP prima di renderla effettiva.
//
// Riservatezza (osservazione di Codex): i link d'invito portano un codice
// nella query string. Qui si registra solo il PERCORSO della pagina e solo
// l'ORIGINE della risorsa bloccata: mai query, frammenti o testo.
// Tetto di 300 segnalazioni l'ora, così un browser impazzito non riempie i log.

let finestra = Date.now(), contate = 0;

const soloPercorso = (u) => { try { return new URL(u).pathname; } catch { return "?"; } };
const soloOrigine = (u) => {
  if (!u) return "?";
  if (/^[a-z-]+$/i.test(u)) return u;               // inline, eval, data, blob…
  try { return new URL(u).origin; } catch { return String(u).split(/[?#]/)[0].slice(0, 80); }
};

export default function cspReport(req, res) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  if (Date.now() - finestra > 3600_000) { finestra = Date.now(); contate = 0; }
  if (++contate > 300) { res.status(204).end(); return; }

  // Formato vecchio: { "csp-report": {...} }; formato nuovo (Reporting API): [ { body: {...} } ]
  const b = req.body || {};
  const voci = Array.isArray(b) ? b.map((r) => r && r.body).filter(Boolean) : [b["csp-report"] || b];
  for (const r of voci.slice(0, 10)) {
    const direttiva = r["effective-directive"] || r.effectiveDirective || r["violated-directive"] || r.violatedDirective || "?";
    const bloccato = soloOrigine(r["blocked-uri"] || r.blockedURL);
    const pagina = soloPercorso(r["document-uri"] || r.documentURL);
    console.log(`[csp] ${direttiva} bloccherebbe ${bloccato} su ${pagina}`);
  }
  res.status(204).end();
}
