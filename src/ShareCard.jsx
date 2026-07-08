import { useState } from "react";
import { Share2, Download, Check } from "lucide-react";
import { C, font } from "./theme";

// ============================================================
// Card condivisibile del profilo — genera un'immagine 1080×1920
// (formato storie Instagram) con radar + punteggio, pronta da
// condividere o scaricare. Tutto su canvas, senza dipendenze.
// ============================================================

const W = 1080, H = 1920;

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

async function drawCard({ name, position, scores, keys, SHORT, overall, avatarUrl }) {
  // Assicura i font pronti prima di disegnare (Google Fonts).
  try { await document.fonts.ready; } catch { /* ignore */ }

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Sfondo: gradiente navy + bagliore arancio.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0A1650");
  g.addColorStop(1, "#17297A");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 1180, 60, W / 2, 1180, 640);
  glow.addColorStop(0, "rgba(255,122,24,0.20)");
  glow.addColorStop(1, "rgba(255,122,24,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";

  // Wordmark in alto.
  ctx.fillStyle = C.orange;
  ctx.font = "700 30px 'Space Grotesk', sans-serif";
  ctx.textAlign = "left";
  // Pillola "360"
  roundRect(ctx, 90, 118, 74, 74, 18);
  ctx.fillStyle = C.orange; ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "700 30px 'Space Grotesk', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("360", 127, 165);
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.font = "700 40px 'Space Grotesk', sans-serif";
  ctx.fillText("Atleta360", 182, 166);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "500 26px 'Inter', sans-serif";
  ctx.fillText("Oasi Volley", 184, 202);

  // Avatar (o iniziali).
  const cx = W / 2, avY = 340, avR = 96;
  const avatar = await loadImage(avatarUrl);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, avY, avR, 0, Math.PI * 2);
  ctx.closePath();
  ctx.lineWidth = 8;
  ctx.strokeStyle = C.orange;
  ctx.stroke();
  ctx.clip();
  if (avatar) {
    const s = Math.min(avatar.width, avatar.height);
    ctx.drawImage(avatar, (avatar.width - s) / 2, (avatar.height - s) / 2, s, s, cx - avR, avY - avR, avR * 2, avR * 2);
  } else {
    ctx.fillStyle = "#17297A";
    ctx.fillRect(cx - avR, avY - avR, avR * 2, avR * 2);
    const initials = (name || "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
    ctx.fillStyle = "#fff";
    ctx.font = "700 78px 'Space Grotesk', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(initials, cx, avY + 28);
  }
  ctx.restore();

  // Nome + ruolo.
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = "700 62px 'Space Grotesk', sans-serif";
  ctx.fillText(name || "Atleta", cx, avY + 200);
  if (position) {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "500 30px 'Inter', sans-serif";
    ctx.fillText(position, cx, avY + 248);
  }

  // Radar.
  const rcx = cx, rcy = 1180, R = 340;
  const n = keys.length;
  const angleFor = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  // Griglia concentrica.
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  for (let ring = 1; ring <= 5; ring++) {
    const rr = (R * ring) / 5;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = angleFor(i % n);
      const x = rcx + rr * Math.cos(a), y = rcy + rr * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // Raggi + etichette.
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  keys.forEach((k, i) => {
    const a = angleFor(i);
    const x = rcx + R * Math.cos(a), y = rcy + R * Math.sin(a);
    ctx.beginPath(); ctx.moveTo(rcx, rcy); ctx.lineTo(x, y); ctx.stroke();
    const lx = rcx + (R + 46) * Math.cos(a), ly = rcy + (R + 46) * Math.sin(a);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "600 26px 'Inter', sans-serif";
    ctx.textAlign = Math.abs(Math.cos(a)) < 0.3 ? "center" : (Math.cos(a) > 0 ? "left" : "right");
    ctx.textBaseline = "middle";
    ctx.fillText(SHORT[k] || k, lx, ly);
  });
  ctx.textBaseline = "alphabetic";

  // Poligono dei valori.
  ctx.beginPath();
  keys.forEach((k, i) => {
    const v = Math.max(0, Math.min(10, scores[k] ?? 0));
    const rr = (R * v) / 10;
    const a = angleFor(i);
    const x = rcx + rr * Math.cos(a), y = rcy + rr * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(255,122,24,0.38)";
  ctx.fill();
  ctx.strokeStyle = C.orange;
  ctx.lineWidth = 5;
  ctx.stroke();
  keys.forEach((k, i) => {
    const v = Math.max(0, Math.min(10, scores[k] ?? 0));
    const rr = (R * v) / 10;
    const a = angleFor(i);
    const x = rcx + rr * Math.cos(a), y = rcy + rr * Math.sin(a);
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
  });

  // Punteggio complessivo grande.
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "600 30px 'Inter', sans-serif";
  ctx.fillText("PUNTEGGIO COMPLESSIVO", cx, 1690);
  ctx.fillStyle = C.orange;
  ctx.font = "700 120px 'Space Grotesk', sans-serif";
  ctx.fillText(overall.toFixed(1), cx, 1810);

  // Firma.
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "500 24px 'Inter', sans-serif";
  ctx.fillText("Atleta360 · dashboard soft skills · danilopuglisi.com", cx, 1880);

  return canvas;
}

export default function ShareCard(props) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);

  const handleShare = async () => {
    setBusy(true); setErr(null); setDone(false);
    try {
      const canvas = await drawCard(props);
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png", 0.95));
      if (!blob) throw new Error("Immagine non generata.");
      const fileName = `atleta360-${(props.name || "profilo").toLowerCase().replace(/\s+/g, "-")}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      // Web Share (mobile) se disponibile e capace di condividere file.
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Il mio profilo Atleta360" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      if (e?.name !== "AbortError") setErr("Non riesco a generare l'immagine.");
    } finally {
      setBusy(false);
    }
  };

  const canShareFiles = typeof navigator !== "undefined" && navigator.canShare;
  const Icon = done ? Check : (canShareFiles ? Share2 : Download);
  const label = done ? "Fatto!" : busy ? "Preparo…" : (canShareFiles ? "Condividi profilo" : "Scarica card");

  return (
    <>
      <button onClick={handleShare} disabled={busy} className="a360-noprint"
        style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600,
          padding: "9px 14px", borderRadius: 10, border: "none",
          background: done ? "#0F7A4E" : C.orange, color: "#fff", cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
        <Icon size={16} /> {label}
      </button>
      {err && <span style={{ ...font, fontSize: 12, color: "#B4232A", marginLeft: 8 }}>{err}</span>}
    </>
  );
}
