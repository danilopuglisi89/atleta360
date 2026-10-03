// Campionato dal sito FIPAV, 02/10/2026.
//
// Legge calendario e classifica pubblici del girone dal sito FIPAV
// (gli stessi dati di public.fipavonline.it, senza account) e li scrive nel
// database di Oasi: risultato e parziali, arbitri, cambi di data o palestra,
// classifica. L'app legge dal database, quindi se la FIPAV non risponde
// restano visibili gli ultimi dati. Nessuna notifica (decisione di Danilo).
//
// Gira dal cron del VPS ogni ora, con le variabili di .env.coach:
//   cd /opt/atleta360 && set -a && . ./.env.coach && set +a && node ops/sync-fipav.mjs
// Con --prova stampa cosa cambierebbe e non scrive niente.

const GIRONI = ["63785"];                 // Under 19 Femminile, Girone B, 2026/27
const NOSTRA = /OASI VOLLEY/i;            // come la FIPAV chiama la squadra
const FIPAV = "https://data.fipavonline.it/api/v2";
const PROVA = process.argv.includes("--prova");

const U = process.env.SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!U || !K) { console.error("mancano SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const H = { apikey: K, Authorization: "Bearer " + K, "Content-Type": "application/json" };

const minuscole = new Set(["di", "del", "della", "dello", "dei", "delle", "de", "a", "e"]);
const bello = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim()
  .split(" ").map((w, i) => (i && minuscole.has(w)) ? w : w.replace(/(^|[.'(-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase())).join(" ");
const palestra = (s) => String(s || "").split(" - ").map(bello).join(", ");

async function fipav(percorso) {
  const r = await fetch(`${FIPAV}/${percorso}`, { headers: { "User-Agent": "Atleta360 (oasi.danilopuglisi.com)" }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`FIPAV ${percorso}: ${r.status}`);
  const j = await r.json();
  return (Array.isArray(j) ? j[0] : j).data;
}
async function db(percorso, opz = {}) {
  const r = await fetch(`${U}/rest/v1/${percorso}`, { ...opz, headers: { ...H, ...(opz.headers || {}) } });
  if (!r.ok) throw new Error(`database ${percorso.split("?")[0]}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const testo = await r.text();          // le scritture con return=minimal rispondono senza corpo
  return testo ? JSON.parse(testo) : null;
}

let modifiche = 0;
async function scrivi(cosa, percorso, opz) {
  modifiche++;
  console.log((PROVA ? "[prova] " : "") + cosa);
  if (!PROVA) await db(percorso, opz);
}

for (const girone of GIRONI) {
  const cal = await fipav(`calendar/0/${girone}`);
  const nostre = (cal.matches || []).filter((m) => NOSTRA.test(m.team1?.title) || NOSTRA.test(m.team2?.title));
  const esistenti = await db(`events?select=id,starts_at,location,result,set_scores,referees,fipav_gara,fipav_round,fipav&fipav_gara=not.is.null`);
  const perGara = new Map(esistenti.map((e) => [e.fipav_gara, e]));

  for (const m of nostre) {
    const inCasa = NOSTRA.test(m.team1.title);
    const avversaria = inCasa ? m.team2.title : m.team1.title;
    if (/^RIPOSO$/i.test(avversaria)) continue;
    const giornata = (m.day || "").match(/\d+/)?.[0] || null;
    const inizio = new Date(Number(m.ts_gara) * 1000).toISOString();
    const fonte = { date: m.date, time: m.time, stadium: m.stadium };

    // Risultato e parziali sempre dal punto di vista di Oasi.
    const noi = inCasa ? m["team1-setwin"] : m["team2-setwin"], loro = inCasa ? m["team2-setwin"] : m["team1-setwin"];
    const pa = inCasa ? m.pt_a : m.pt_b, pb = inCasa ? m.pt_b : m.pt_a;
    const giocata = m.played && (noi + loro) > 0;
    const risultato = giocata ? `${noi}-${loro}` : null;
    const parziali = giocata && pa?.length ? pa.map((p, i) => `${p}-${pb[i]}`).join(", ") : null;
    const arbitri = [m["1referee"], m["2referee"]].map((s) => String(s || "").trim()).filter(Boolean).join(" · ") || null;

    const ev = perGara.get(m.ng);
    if (!ev) {
      await scrivi(`nuova partita: gara ${m.ng}, giornata ${giornata}, vs ${bello(avversaria)}`, "events", {
        method: "POST", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          kind: "match", title: `vs ${bello(avversaria)} (${inCasa ? "casa" : "trasferta"})`,
          starts_at: inizio, ends_at: new Date(Date.parse(inizio) + 2 * 3600e3).toISOString(),
          location: palestra(m.stadium), notes: `${bello(cal.title)} · Giornata ${giornata} · Gara ${m.ng}`,
          fipav_gara: m.ng, fipav_round: giornata, result: risultato, set_scores: parziali, referees: arbitri, fipav: fonte,
        }),
      });
      continue;
    }

    const patch = {};
    // Data, ora o palestra cambiano solo se è la FIPAV a cambiarle: una
    // correzione a mano nell'app resta finché la FIPAV non cambia di nuovo.
    const prima = ev.fipav || {};
    if (!ev.fipav) patch.fipav = fonte;
    else {
      if (prima.date !== fonte.date || prima.time !== fonte.time) {
        Object.assign(patch, { starts_at: inizio, ends_at: new Date(Date.parse(inizio) + 2 * 3600e3).toISOString(),
          reminder_sent: false, checkin_prompt_sent: false, prematch_prompt_sent: false });
      }
      if (prima.stadium !== fonte.stadium) patch.location = palestra(m.stadium);
      if (Object.keys(patch).length) patch.fipav = fonte;
    }
    if (giornata && ev.fipav_round !== giornata) patch.fipav_round = giornata;
    if (risultato && ev.result !== risultato) patch.result = risultato;
    if (parziali && ev.set_scores !== parziali) patch.set_scores = parziali;
    if (arbitri !== (ev.referees || null)) patch.referees = arbitri;
    if (Object.keys(patch).length) {
      await scrivi(`gara ${m.ng}: ${Object.keys(patch).filter((k) => k !== "fipav").join(", ") || "collegata"}`,
        `events?id=eq.${ev.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
    }
  }

  const tab = await fipav(`tables/${girone}`);
  const squadre = (tab.teams || []).map((t) => ({
    pos: t.pos, name: String(t.title || "").trim(), pts: +t.p || 0, played: +t.g || 0, won: +t.gv || 0, lost: +t.gp || 0,
    setsWon: +t.sv || 0, setsLost: +t.sp || 0, us: NOSTRA.test(t.title),
  })).sort((a, b) => a.pos - b.pos);
  const [attuale] = await db(`league_tables?select=teams&girone_id=eq.${girone}`);
  if (JSON.stringify(attuale?.teams) !== JSON.stringify(squadre)) {
    await scrivi(`classifica girone ${girone} aggiornata`, "league_tables", {
      method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ girone_id: girone, title: bello(tab.title), teams: squadre, updated_at: new Date().toISOString() }),
    });
  }
}

console.log(new Date().toISOString(), modifiche ? `${modifiche} modifiche${PROVA ? " (prova, nulla scritto)" : ""}` : "nessuna novità");
