// ============================================================
// Motore delle card condivisibili — disegna su canvas, senza dipendenze.
// Un solo posto per lo stile (sfondo, wordmark, tag Instagram, firma), poi
// una funzione per ogni tipo di contenuto: profilo, traguardo, settimana,
// risultato partita, squadra.
//
// Due formati:
//   story = 1080x1920 (Storie: sparisce in 24h)
//   post  = 1080x1080 (feed: resta nel profilo, vale di piu' per farsi
//           conoscere — per questo e' il default dove ha senso)
//
// I tag Instagram vengono SEMPRE disegnati dentro l'immagine: quando si
// condivide una foto nelle Storie, il testo passato a navigator.share()
// nella maggior parte dei telefoni viene ignorato. La didascalia esiste
// comunque e si copia a parte (vedi ShareSheet.jsx).
// ============================================================

export const IG_ATLETA360 = "@atleta360.volley";
export const IG_SOCIETA = "@oasivolley";
// TikTok della società: sta solo nelle didascalie, non disegnato sulla card
// (la riga dei tag resterebbe troppo lunga) — ma per le ragazze è il canale
// dove finiscono davvero le storie.
export const TIKTOK_SOCIETA = "@oasi.volley.viare";
const TAGS = `${IG_ATLETA360} · ${IG_SOCIETA}`;

export const SIZES = {
  story: { W: 1080, H: 1920, label: "Storia" },
  post: { W: 1080, H: 1080, label: "Post" },
};

// Livelli di partecipazione: la card "evolve" col colore (vedi gamify-a.sql).
const TIERS = [
  { color: "#9AA0B4", glow: "rgba(154,160,180,0.22)" },
  { color: "#CD7F32", glow: "rgba(205,127,50,0.24)" },
  { color: "#C0C0C0", glow: "rgba(192,192,192,0.24)" },
  { color: "#FFD700", glow: "rgba(255,215,0,0.26)" },
  { color: "#4FD8EA", glow: "rgba(79,216,234,0.28)" },
  { color: "#E11D74", glow: "rgba(225,29,116,0.32)" },
];
export const tierFor = (level) => (Number.isInteger(level?.level) ? TIERS[level.level] : null);

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Manda a capo un testo lungo entro una larghezza data. Ritorna le righe.
function wrap(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach((w) => {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

// Logo ufficiale (mai ridisegnato a mano). Sta in public/, quindi stessa
// origine: non "sporca" il canvas e toBlob() continua a funzionare.
const LOGO_URL = "/logo-esteso-bianco.png";
// Sfondo di riserva per chi non ha foto profilo: se il file non esiste si
// resta sul gradiente, senza errori.
const FALLBACK_BG = "/card-bg.jpg";

// ---------- Struttura comune a tutte le card ----------
// bgUrl: foto usata come sfondo (di norma quella dell'atleta). Viene
// sfocata e coperta dal navy, cosi' resta un'atmosfera personale senza
// rubare leggibilita' al testo.
async function base(ctx, W, H, tier, sottotitolo, bgUrl, bgStyle) {
  ctx.fillStyle = "#0A1650";
  ctx.fillRect(0, 0, W, H);

  // "sfumata" nasconde bene anche le foto a bassa risoluzione; "nitida"
  // lascia riconoscere il soggetto. La scelta e' dell'atleta.
  const soft = bgStyle !== "nitida";
  const blur = soft ? 26 : 7;
  const veilTop = soft ? 0.86 : 0.68;
  const veilBottom = soft ? 0.90 : 0.80;

  const bg = await loadImage(bgUrl) || await loadImage(FALLBACK_BG);
  if (bg) {
    const scale = Math.max(W / bg.width, H / bg.height);
    const w = bg.width * scale, h = bg.height * scale;
    ctx.save();
    ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(bg, (W - w) / 2, (H - h) / 2, w, h);
    ctx.restore();
  }

  // Velo navy sopra la foto: senza, il testo bianco diventa illeggibile.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, bg ? `rgba(10,22,80,${veilTop})` : "#0A1650");
  g.addColorStop(1, bg ? `rgba(23,41,122,${veilBottom})` : "#17297A");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, H * 0.58, 60, W / 2, H * 0.58, W * 0.62);
  glow.addColorStop(0, tier ? tier.glow : "rgba(255,122,24,0.20)");
  glow.addColorStop(1, "rgba(255,122,24,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const top = H > 1400 ? 112 : 70;
  const logo = await loadImage(LOGO_URL);
  if (logo) {
    const lh = H > 1400 ? 92 : 76;
    ctx.drawImage(logo, 76, top, logo.width * (lh / logo.height), lh);
  } else {
    // Riserva se il logo non si carica: meglio il nome scritto che il vuoto.
    ctx.fillStyle = "#fff";
    ctx.font = "700 38px 'Space Grotesk', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Atleta360", 80, top + 46);
  }
  if (sottotitolo) {
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.font = `500 ${H > 1400 ? 24 : 21}px 'Inter', sans-serif`;
    ctx.fillText(sottotitolo, 80, top + (H > 1400 ? 128 : 108));
  }

  // Tag Instagram in alto a destra: il primo che si vede.
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "600 25px 'Inter', sans-serif";
  ctx.fillText(TAGS, W - 76, top + 44);
  ctx.textAlign = "left";
}

// Il piede occupa gli ultimi ~110px: chi disegna sopra deve stare sopra
// FOOTER_TOP, altrimenti il contenuto ci finisce addosso (successo davvero
// col punteggio grande della card profilo).
export const FOOTER_TOP = 110;

function footer(ctx, W, H, tier) {
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "500 22px 'Inter', sans-serif";
  ctx.fillText("Atleta360 · dashboard soft skills · danilopuglisi.com", W / 2, H - 78);
  ctx.fillStyle = "#FF7A18";
  ctx.font = "700 27px 'Inter', sans-serif";
  ctx.fillText(TAGS, W / 2, H - 36);

  if (tier) {
    ctx.lineWidth = 10;
    ctx.strokeStyle = tier.color;
    roundRect(ctx, 18, 18, W - 36, H - 36, 26);
    ctx.stroke();
  }
}

function newCanvas(format) {
  const { W, H } = SIZES[format] || SIZES.story;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  return { canvas, ctx: canvas.getContext("2d"), W, H };
}

// ---------- Radar riutilizzabile ----------
function radar(ctx, { cx, cy, R, keys, SHORT, scores, labelSize = 24 }) {
  const n = keys.length;
  const angleFor = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  for (let ring = 1; ring <= 5; ring++) {
    const rr = (R * ring) / 5;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = angleFor(i % n);
      const x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  keys.forEach((k, i) => {
    const a = angleFor(i);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a)); ctx.stroke();
    const lx = cx + (R + 40) * Math.cos(a), ly = cy + (R + 40) * Math.sin(a);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `600 ${labelSize}px 'Inter', sans-serif`;
    ctx.textAlign = Math.abs(Math.cos(a)) < 0.3 ? "center" : (Math.cos(a) > 0 ? "left" : "right");
    ctx.textBaseline = "middle";
    ctx.fillText(SHORT[k] || k, lx, ly);
  });
  ctx.textBaseline = "alphabetic";

  ctx.beginPath();
  keys.forEach((k, i) => {
    const v = Math.max(0, Math.min(10, scores[k] ?? 0));
    const rr = (R * v) / 10, a = angleFor(i);
    const x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(255,122,24,0.38)";
  ctx.fill();
  ctx.strokeStyle = "#FF7A18";
  ctx.lineWidth = 5;
  ctx.stroke();
}

async function avatarCircle(ctx, { cx, cy, r, url, name, ring }) {
  const img = await loadImage(url);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.lineWidth = 8;
  ctx.strokeStyle = ring || "#FF7A18";
  ctx.stroke();
  ctx.clip();
  if (img) {
    const s = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = "#17297A";
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    const initials = (name || "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
    ctx.fillStyle = "#fff";
    ctx.font = `700 ${Math.round(r * 0.8)}px 'Space Grotesk', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(initials, cx, cy + r * 0.28);
  }
  ctx.restore();
}

// ============================================================
// TIPI DI CARD
// Ognuna ritorna un canvas. `format` = "story" | "post".
// ============================================================

export async function drawProfile({ name, position, scores, keys, SHORT, overall, avatarUrl, level, bgUrl, bgStyle }, format = "story") {
  try { await document.fonts.ready; } catch { /* ignore */ }
  const { canvas, ctx, W, H } = newCanvas(format);
  const tier = tierFor(level);
  const story = format === "story";
  await base(ctx, W, H, tier, "Oasi Volley", bgUrl || avatarUrl, bgStyle);

  if (tier && level?.level_label) {
    ctx.textAlign = "right";
    ctx.fillStyle = tier.color;
    ctx.font = "700 23px 'Inter', sans-serif";
    ctx.fillText(`🏆 ${level.level_label}`, W - 80, (story ? 118 : 74) + 76);
    ctx.textAlign = "left";
  }

  const cx = W / 2;
  // Nel formato quadrato il punteggio sta SOPRA il radar: sotto non c'e'
  // spazio senza finire addosso al piede.
  const L = story
    ? { avY: 390, avR: 96, nameGap: 104, posGap: 152, nameSize: 62, posSize: 30,
        radarY: 1160, radarR: 314, labelSize: 26, scoreLabelY: 1626, scoreY: 1744, scoreSize: 118 }
    : { avY: 250, avR: 52, nameGap: 48, posGap: 82, nameSize: 38, posSize: 21,
        radarY: 742, radarR: 156, labelSize: 17, scoreLabelY: 428, scoreY: 486, scoreSize: 54 };

  await avatarCircle(ctx, { cx, cy: L.avY, r: L.avR, url: avatarUrl, name, ring: tier?.color });

  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${L.nameSize}px 'Space Grotesk', sans-serif`;
  ctx.fillText(name || "Atleta", cx, L.avY + L.avR + L.nameGap);
  if (position) {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `500 ${L.posSize}px 'Inter', sans-serif`;
    ctx.fillText(position, cx, L.avY + L.avR + L.posGap);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `600 ${story ? 30 : 20}px 'Inter', sans-serif`;
  ctx.fillText("DOVE SONO ORA", cx, L.scoreLabelY);
  ctx.fillStyle = "#FF7A18";
  ctx.font = `700 ${L.scoreSize}px 'Space Grotesk', sans-serif`;
  ctx.fillText(overall.toFixed(1), cx, L.scoreY);

  radar(ctx, { cx, cy: L.radarY, R: L.radarR, keys, SHORT, scores, labelSize: L.labelSize });

  footer(ctx, W, H, tier);
  return canvas;
}

export async function drawBadge({ name, badge, avatarUrl, level, bgUrl, bgStyle }, format = "story") {
  try { await document.fonts.ready; } catch { /* ignore */ }
  const { canvas, ctx, W, H } = newCanvas(format);
  const tier = tierFor(level);
  const story = format === "story";
  await base(ctx, W, H, tier, "Oasi Volley", bgUrl || avatarUrl, bgStyle);

  const cx = W / 2, mid = story ? 820 : 520;

  ctx.textAlign = "center";
  ctx.fillStyle = "#FF7A18";
  ctx.font = `700 ${story ? 30 : 23}px 'Inter', sans-serif`;
  ctx.fillText("NUOVO TRAGUARDO", cx, mid - (story ? 300 : 190));

  ctx.font = `${story ? 200 : 130}px 'Inter', sans-serif`;
  ctx.fillText(badge.emoji || "🏅", cx, mid - (story ? 110 : 70));

  ctx.fillStyle = "#fff";
  ctx.font = `700 ${story ? 68 : 46}px 'Space Grotesk', sans-serif`;
  wrap(ctx, badge.label, W - 200).forEach((line, i) => {
    ctx.fillText(line, cx, mid + (story ? 20 : 14) + i * (story ? 78 : 54));
  });

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `500 ${story ? 32 : 24}px 'Inter', sans-serif`;
  wrap(ctx, badge.desc, W - 240).forEach((line, i) => {
    ctx.fillText(line, cx, mid + (story ? 116 : 84) + i * (story ? 44 : 34));
  });

  // Chi l'ha conquistato
  const avY = story ? 1420 : 790, avR = story ? 74 : 52;
  await avatarCircle(ctx, { cx, cy: avY, r: avR, url: avatarUrl, name, ring: tier?.color });
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${story ? 44 : 32}px 'Space Grotesk', sans-serif`;
  ctx.fillText(name || "Atleta", cx, avY + avR + (story ? 66 : 50));

  footer(ctx, W, H, tier);
  return canvas;
}

export async function drawRecap({ name, total, byAction, streak, avatarUrl, level, bgUrl, bgStyle }, format = "story") {
  try { await document.fonts.ready; } catch { /* ignore */ }
  const { canvas, ctx, W, H } = newCanvas(format);
  const tier = tierFor(level);
  const story = format === "story";
  await base(ctx, W, H, tier, "Oasi Volley", bgUrl || avatarUrl, bgStyle);

  const cx = W / 2;
  ctx.textAlign = "center";
  ctx.fillStyle = "#FF7A18";
  ctx.font = `700 ${story ? 30 : 23}px 'Inter', sans-serif`;
  ctx.fillText("LA MIA SETTIMANA", cx, story ? 420 : 260);

  ctx.fillStyle = "#fff";
  ctx.font = `700 ${story ? 190 : 120}px 'Space Grotesk', sans-serif`;
  ctx.fillText(`+${total}`, cx, story ? 610 : 400);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `500 ${story ? 34 : 26}px 'Inter', sans-serif`;
  ctx.fillText("punti guadagnati", cx, story ? 668 : 442);

  // Righe di dettaglio
  const rows = Object.entries(byAction || {});
  const startY = story ? 830 : 500;
  const gap = story ? 78 : 52;
  rows.slice(0, story ? 6 : 4).forEach(([label, count], i) => {
    const y = startY + i * gap;
    roundRect(ctx, 150, y - (story ? 42 : 32), W - 300, story ? 62 : 46, story ? 31 : 23);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fill();
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `500 ${story ? 30 : 23}px 'Inter', sans-serif`;
    ctx.fillText(label, 190, y);
    ctx.textAlign = "right";
    ctx.fillStyle = "#FF7A18";
    ctx.font = `700 ${story ? 32 : 24}px 'Space Grotesk', sans-serif`;
    ctx.fillText(`${count}×`, W - 190, y);
  });

  if (streak >= 2) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = `700 ${story ? 40 : 28}px 'Space Grotesk', sans-serif`;
    ctx.fillText(`🔥 ${streak} giorni di fila`, cx, startY + (story ? 6 : 4) * gap + (story ? 40 : 30));
  }

  const avY = story ? 1500 : 820, avR = story ? 66 : 46;
  await avatarCircle(ctx, { cx, cy: avY, r: avR, url: avatarUrl, name, ring: tier?.color });
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${story ? 40 : 30}px 'Space Grotesk', sans-serif`;
  ctx.fillText(name || "Atleta", cx, avY + avR + (story ? 60 : 46));

  footer(ctx, W, H, tier);
  return canvas;
}

export async function drawMatch({ title, result, dateLabel, location, bgUrl, bgStyle }, format = "post") {
  try { await document.fonts.ready; } catch { /* ignore */ }
  const { canvas, ctx, W, H } = newCanvas(format);
  const story = format === "story";
  await base(ctx, W, H, null, "Oasi Volley", bgUrl, bgStyle);

  const cx = W / 2, mid = story ? 900 : 520;
  ctx.textAlign = "center";

  ctx.fillStyle = "#FF7A18";
  ctx.font = `700 ${story ? 30 : 24}px 'Inter', sans-serif`;
  ctx.fillText("RISULTATO", cx, mid - (story ? 280 : 190));

  ctx.fillStyle = "#fff";
  ctx.font = `700 ${story ? 58 : 42}px 'Space Grotesk', sans-serif`;
  wrap(ctx, title || "Partita", W - 200).forEach((line, i) => {
    ctx.fillText(line, cx, mid - (story ? 170 : 116) + i * (story ? 68 : 50));
  });

  ctx.fillStyle = "#FF7A18";
  ctx.font = `700 ${story ? 150 : 104}px 'Space Grotesk', sans-serif`;
  ctx.fillText(result || "—", cx, mid + (story ? 40 : 28));

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `500 ${story ? 32 : 25}px 'Inter', sans-serif`;
  const sub = [dateLabel, location].filter(Boolean).join(" · ");
  if (sub) ctx.fillText(sub, cx, mid + (story ? 120 : 84));

  footer(ctx, W, H, null);
  return canvas;
}

export async function drawTeam({ teamName, keys, SHORT, avg, athleteCount, lastPeriod, bgUrl, bgStyle }, format = "post") {
  try { await document.fonts.ready; } catch { /* ignore */ }
  const { canvas, ctx, W, H } = newCanvas(format);
  const story = format === "story";
  await base(ctx, W, H, null, "Oasi Volley", bgUrl, bgStyle);

  const cx = W / 2;
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = `700 ${story ? 62 : 46}px 'Space Grotesk', sans-serif`;
  ctx.fillText(teamName || "La nostra squadra", cx, story ? 350 : 250);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `500 ${story ? 30 : 23}px 'Inter', sans-serif`;
  ctx.fillText(`${athleteCount} atlete · profilo medio soft skills`, cx, story ? 400 : 292);

  radar(ctx, {
    cx, cy: story ? 1120 : 630, R: story ? 318 : 196,
    keys, SHORT, scores: avg, labelSize: story ? 26 : 18,
  });

  if (lastPeriod) {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = `500 ${story ? 28 : 21}px 'Inter', sans-serif`;
    ctx.fillText(`Ultimo rilevamento: ${lastPeriod}`, cx, story ? 1660 : 930);
  }

  footer(ctx, W, H, null);
  return canvas;
}

// ============================================================
// DIDASCALIE — sempre con entrambi i tag. Si copiano negli appunti:
// Instagram scarta il testo passato alla condivisione di sistema.
// ============================================================
const HASHTAGS = "#Atleta360 #OasiVolley #pallavolo #volleyfemminile #softskills";

export function captionFor(kind, data = {}) {
  const tag = `${IG_ATLETA360} ${IG_SOCIETA} ${TIKTOK_SOCIETA}`;
  switch (kind) {
    case "badge":
      return `${data.badge?.emoji || "🏅"} Nuovo traguardo: ${data.badge?.label}!\n${data.badge?.desc || ""}\n\nIl mio percorso sulle soft skills con ${tag}\n${HASHTAGS}`;
    case "recap":
      return `La mia settimana: +${data.total} punti 💪${data.streak >= 2 ? `\n🔥 ${data.streak} giorni di fila` : ""}\n\nCresco anche fuori dal campo con ${tag}\n${HASHTAGS}`;
    case "match":
      return `${data.title || "Partita"} · ${data.result || ""} 🏐\n\nForza ragazze! ${tag}\n${HASHTAGS}`;
    case "team":
      return `Il profilo soft skills della nostra squadra 🏐\nNon solo tecnica: testa, gruppo e carattere.\n\n${tag}\n${HASHTAGS}`;
    default:
      return `Il mio profilo su Atleta360 🏐\nDove sono ora: ${data.overall ?? ""}\n\n${tag}\n${HASHTAGS}`;
  }
}
