// Pannello di condivisione: anteprima della card, scelta del formato,
// condivisione di sistema, copia della didascalia, download di riserva.
//
// Perche' la didascalia ha un pulsante suo: condividendo un'immagine nelle
// Storie Instagram, il testo passato a navigator.share() viene quasi sempre
// ignorato dal telefono. I tag li disegniamo dentro l'immagine (sempre
// visibili) e la didascalia si copia con un tocco, pronta da incollare.
import { useEffect, useRef, useState } from "react";
import { Share2, Download, Check, Copy, X, Instagram } from "lucide-react";
import { C, font, display } from "../theme";
import { SIZES, captionFor, drawProfile, drawBadge, drawRecap, drawMatch, drawTeam } from "../shareCards";

const DRAW = { profile: drawProfile, badge: drawBadge, recap: drawRecap, match: drawMatch, team: drawTeam };

// Formato di partenza per tipo: il post nel feed resta nel profilo, quindi
// per squadra e risultati (i contenuti "da far girare") parte da li'.
const DEFAULT_FORMAT = { profile: "story", badge: "story", recap: "story", match: "post", team: "post" };

export default function ShareSheet({ kind, data, onClose }) {
  const [format, setFormat] = useState(DEFAULT_FORMAT[kind] || "story");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [err, setErr] = useState(null);
  const canvasRef = useRef(null);
  const caption = captionFor(kind, data);

  // Rigenera l'anteprima a ogni cambio di formato.
  useEffect(() => {
    let alive = true;
    setPreview(null); setErr(null);
    (async () => {
      try {
        const draw = DRAW[kind] || drawProfile;
        const canvas = await draw(data, format);
        if (!alive) return;
        canvasRef.current = canvas;
        setPreview(canvas.toDataURL("image/png"));
      } catch {
        if (alive) setErr("Non riesco a generare l'immagine.");
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, format]);

  const toBlob = () => new Promise((res) => canvasRef.current?.toBlob(res, "image/png", 0.95));

  const share = async () => {
    if (!canvasRef.current) return;
    setBusy(true); setErr(null);
    try {
      const blob = await toBlob();
      if (!blob) throw new Error("no blob");
      const fileName = `atleta360-${kind}-${format}.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Atleta360", text: caption });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    } catch (e) {
      if (e?.name !== "AbortError") setErr("Condivisione non riuscita.");
    } finally {
      setBusy(false);
    }
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      // Ripiego per i browser che bloccano l'API appunti.
      const ta = document.createElement("textarea");
      ta.value = caption;
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const canShareFiles = typeof navigator !== "undefined" && navigator.canShare;

  return (
    <div className="a360-noprint" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(6,10,30,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} className="a360-reveal"
        style={{ background: C.card, borderRadius: 20, padding: 18, width: "min(420px, 96vw)", maxHeight: "94vh", overflowY: "auto", position: "relative" }}>
        <button onClick={onClose} aria-label="Chiudi"
          style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 6 }}>
          <X size={19} />
        </button>

        <div style={{ ...display, fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 12, paddingRight: 26 }}>
          Condividi
        </div>

        {/* Scelta formato */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {Object.entries(SIZES).map(([key, s]) => (
            <button key={key} onClick={() => setFormat(key)}
              style={{ ...font, flex: 1, fontSize: 13, fontWeight: 600, padding: "9px 0", borderRadius: 10, cursor: "pointer",
                border: `1.5px solid ${format === key ? C.orange : C.grid}`,
                background: format === key ? C.orangeSoft : C.card, color: format === key ? C.orange : C.muted }}>
              {s.label}
              <span style={{ ...font, display: "block", fontSize: 10.5, fontWeight: 400, opacity: 0.8 }}>
                {key === "story" ? "sparisce in 24h" : "resta nel profilo"}
              </span>
            </button>
          ))}
        </div>

        {/* Anteprima */}
        <div style={{ background: C.surface, borderRadius: 14, padding: 10, display: "flex", justifyContent: "center", minHeight: 180 }}>
          {preview
            ? <img src={preview} alt="anteprima" style={{ maxWidth: "100%", maxHeight: "46vh", borderRadius: 8, display: "block" }} />
            : <div style={{ ...font, fontSize: 13, color: C.muted, alignSelf: "center" }}>Preparo l'immagine…</div>}
        </div>

        {err && <div style={{ ...font, fontSize: 12.5, color: "#B4232A", marginTop: 8 }}>{err}</div>}

        {/* Azioni */}
        <button onClick={share} disabled={busy || !preview}
          style={{ ...font, width: "100%", marginTop: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "13px 0", borderRadius: 12, border: "none", background: shared ? "#0F7A4E" : C.orange, color: "#fff",
            fontSize: 15, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy || !preview ? 0.6 : 1 }}>
          {shared ? <Check size={17} /> : (canShareFiles ? <Share2 size={17} /> : <Download size={17} />)}
          {shared ? "Fatto!" : busy ? "Preparo…" : (canShareFiles ? "Condividi l'immagine" : "Scarica l'immagine")}
        </button>

        <button onClick={copyCaption}
          style={{ ...font, width: "100%", marginTop: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "12px 0", borderRadius: 12, border: `1px solid ${copied ? "#0F7A4E" : C.grid}`,
            background: copied ? "#DDF3E7" : C.card, color: copied ? "#0F7A4E" : C.ink, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Didascalia copiata!" : "Copia la didascalia coi tag"}
        </button>

        <div style={{ ...font, fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginTop: 10, background: C.surface, borderRadius: 10, padding: "9px 11px" }}>
          <b style={{ color: C.ink }}>Come si fa:</b> tocca <i>Condividi</i> e scegli Instagram.
          Poi <i>Copia la didascalia</i> e incollala nel post — Instagram non la porta da solo.
          I tag sono comunque già stampati sull'immagine.
        </div>

        <a href="https://www.instagram.com/atleta360.volley/" target="_blank" rel="noopener noreferrer"
          style={{ ...font, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", boxSizing: "border-box",
            marginTop: 10, padding: "10px 0", borderRadius: 11, textDecoration: "none", fontSize: 13, fontWeight: 600, color: "#fff",
            background: "linear-gradient(135deg, #F58529, #DD2A7B, #8134AF)" }}>
          <Instagram size={16} /> Segui @atleta360.volley
        </a>
      </div>
    </div>
  );
}

/* Pulsante che apre il pannello. */
export function ShareButton({ kind, data, label = "Condividi", icon: Icon = Share2, variant = "solid", style }) {
  const [open, setOpen] = useState(false);
  const solid = variant === "solid";
  return (
    <>
      <button onClick={() => setOpen(true)} className="a360-noprint"
        style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600,
          padding: "9px 14px", borderRadius: 10, cursor: "pointer",
          border: solid ? "none" : `1px solid ${C.grid}`,
          background: solid ? C.orange : C.card, color: solid ? "#fff" : C.ink, ...style }}>
        <Icon size={16} /> {label}
      </button>
      {open && <ShareSheet kind={kind} data={data} onClose={() => setOpen(false)} />}
    </>
  );
}
