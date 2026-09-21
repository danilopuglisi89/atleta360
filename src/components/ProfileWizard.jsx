// Popup guidato per completare il profilo: foto, ruolo e almeno un
// contatto. Si ripropone a ogni apertura finché non è completo; "Più tardi"
// vale solo per la sessione corrente, come il wizard dell'autovalutazione.
//
// Il telefono è VOLUTAMENTE facoltativo: la squadra è fatta di minorenni e
// un popup che torna finché non lo dai equivale a chiederlo per forza.
// Basta un contatto qualsiasi, anche solo un social.
import { useEffect, useRef, useState } from "react";
import { Camera, ChevronRight, ChevronLeft, Check, Sparkles } from "lucide-react";
import { C, font, display } from "../theme";
import { supabase } from "../supabaseClient";
import { compressImage } from "../photos";
import { Avatar } from "../PersonalArea";
import { avatarImageUrl } from "../avatar";

const LATER_KEY = "a360-profilo-piu-tardi";

const CONTATTI = [
  { key: "phone", label: "Telefono", ph: "es. 333 1234567", type: "tel" },
  { key: "instagram", label: "Instagram", ph: "@nomeutente" },
  { key: "tiktok", label: "TikTok", ph: "@nomeutente" },
  { key: "youtube", label: "YouTube", ph: "@canale" },
  { key: "snapchat", label: "Snapchat", ph: "@nomeutente" },
  { key: "facebook", label: "Facebook", ph: "nome utente o link" },
];

// Completo = foto + ruolo + almeno un contatto.
export function profileIsComplete(p) {
  if (!p) return true;                       // niente profilo: non disturbare
  const foto = !!(p.avatar_url || p.avatar_config);
  const ruolo = !!(p.ruolo || "").trim();
  const contatto = CONTATTI.some((c) => (p[c.key] || "").trim());
  return foto && ruolo && contatto;
}

const input = {
  ...font, fontSize: 16, color: C.ink, background: C.card, border: `1.5px solid ${C.grid}`,
  borderRadius: 11, padding: "0 13px", height: 48, width: "100%", boxSizing: "border-box", outline: "none",
};
const label = { ...font, fontSize: 12.5, color: C.muted, fontWeight: 600, marginBottom: 6, display: "block" };

export default function ProfileWizard({ profile, onDone }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    avatar_url: "", ruolo: "", jersey_number: "",
    phone: "", instagram: "", tiktok: "", youtube: "", snapchat: "", facebook: "",
  });

  useEffect(() => {
    if (!profile?.id) return;
    if (profileIsComplete(profile)) return;
    try { if (sessionStorage.getItem(LATER_KEY)) return; } catch { /* ignora */ }
    setForm({
      avatar_url: profile.avatar_url || "", ruolo: profile.ruolo || "", jersey_number: profile.jersey_number || "",
      phone: profile.phone || "", instagram: profile.instagram || "", tiktok: profile.tiktok || "",
      youtube: profile.youtube || "", snapchat: profile.snapchat || "", facebook: profile.facebook || "",
    });
    setOpen(true);
  }, [profile]);

  if (!open) return null;

  const isAtleta = profile?.category === "atleta";
  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const later = () => { try { sessionStorage.setItem(LATER_KEY, "1"); } catch { /* ignora */ } setOpen(false); };

  const onFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setErr(null);
    try {
      const dataUrl = await compressImage(file);
      setForm((f) => ({ ...f, avatar_url: dataUrl }));
    } catch { setErr("Non sono riuscito a leggere questa foto."); }
    e.target.value = "";
  };

  const haContatto = CONTATTI.some((c) => (form[c.key] || "").trim());
  // L'avatar della galleria vale quanto una foto: prima il passo 1 chiedeva
  // per forza una foto caricata, e tutte le atlete (che hanno l'avatar)
  // restavano ferme lì.
  const avatarGalleria = profile?.avatar_config ? avatarImageUrl(profile.avatar_config) : null;
  const haVolto = !!form.avatar_url || !!avatarGalleria;
  const puoAvanzare = step === 0 ? haVolto : step === 1 ? !!form.ruolo.trim() : haContatto;

  const salva = async () => {
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc("update_my_profile", {
      p_phone: form.phone.trim() || null,
      p_facebook: form.facebook.trim() || null,
      p_instagram: form.instagram.trim() || null,
      p_jersey_number: form.jersey_number.trim() || null,
      p_ruolo: form.ruolo.trim() || null,
      p_avatar_url: form.avatar_url || null,
      p_tiktok: form.tiktok.trim() || null,
      p_youtube: form.youtube.trim() || null,
      p_snapchat: form.snapchat.trim() || null,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setOpen(false);
    onDone?.();
  };

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");

  return (
    // zIndex 88, uno sotto il wizard dell'autovalutazione (90): a una nuova
    // arrivata possono toccare entrambi, e così restano in fila invece di
    // litigarsi lo schermo.
    <div className="a360-noprint" style={{ position: "fixed", inset: 0, zIndex: 88, background: "rgba(10,19,48,0.62)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="a360-reveal" style={{ width: "100%", maxWidth: 460, background: C.card, borderRadius: 20, boxShadow: "0 24px 70px rgba(10,22,80,0.4)", padding: 24, position: "relative", maxHeight: "88vh", overflowY: "auto" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Sparkles size={17} color={C.orange} />
          <span style={{ ...font, fontSize: 11.5, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: C.orange }}>
            Passo {step + 1} di 3
          </span>
        </div>

        {step === 0 && (
          <>
            <div style={{ ...display, fontSize: 21, fontWeight: 700, color: C.ink }}>{avatarGalleria && !form.avatar_url ? "Il tuo avatar c'è già" : "Mettici la faccia"}</div>
            <p style={{ ...font, fontSize: 14, color: C.muted, lineHeight: 1.5, margin: "6px 0 18px" }}>
              {avatarGalleria && !form.avatar_url
                ? "Compare accanto al tuo nome in tutta l'app. Puoi tenerlo così e andare avanti, oppure mettere una tua foto."
                : "La tua foto compare accanto al nome in tutta l'app: nella squadra, in chat, sul tuo profilo."}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Avatar url={form.avatar_url || avatarGalleria} name={fullName} size={84} />
              <div>
                <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
                <button onClick={() => fileRef.current?.click()}
                  style={{ ...font, display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 16px", borderRadius: 11, border: `1px solid ${C.grid}`, background: C.card, color: C.ink, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  <Camera size={16} /> {form.avatar_url ? "Cambia foto" : avatarGalleria ? "Usa una foto" : "Scegli una foto"}
                </button>
                {isAtleta && !avatarGalleria && (
                  <div style={{ ...font, fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 1.45 }}>
                    Preferisci un avatar disegnato? Lo trovi in Area personale.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div style={{ ...display, fontSize: 21, fontWeight: 700, color: C.ink }}>Che ruolo hai?</div>
            <p style={{ ...font, fontSize: 14, color: C.muted, lineHeight: 1.5, margin: "6px 0 18px" }}>
              {isAtleta ? "In che ruolo giochi? E se hai un numero di maglia, mettilo qui." : "Che ruolo hai nella società?"}
            </p>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Ruolo</label>
              <input style={input} value={form.ruolo} onChange={upd("ruolo")}
                placeholder={isAtleta ? "es. Palleggiatrice" : "es. Allenatore"} />
            </div>
            {isAtleta && (
              <div>
                <label style={label}>Numero di maglia (facoltativo)</label>
                <input style={input} value={form.jersey_number} onChange={upd("jersey_number")} placeholder="es. 7" inputMode="numeric" />
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ ...display, fontSize: 21, fontWeight: 700, color: C.ink }}>Come ti si trova?</div>
            <p style={{ ...font, fontSize: 14, color: C.muted, lineHeight: 1.5, margin: "6px 0 18px" }}>
              Basta <b>uno</b> di questi, quello che preferisci. Compare sul tuo profilo, lo vede solo chi è dentro la squadra.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {CONTATTI.map((c) => (
                <div key={c.key}>
                  <label style={label}>{c.label}</label>
                  <input style={input} type={c.type || "text"} value={form[c.key]} onChange={upd(c.key)} placeholder={c.ph} />
                </div>
              ))}
            </div>
          </>
        )}

        {err && <div style={{ ...font, fontSize: 13, color: "#B4232A", marginTop: 14 }}>{err}</div>}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 22 }}>
          {step > 0 && (
            <button onClick={() => setStep((s) => s - 1)}
              style={{ ...font, display: "inline-flex", alignItems: "center", gap: 5, height: 46, padding: "0 14px", borderRadius: 11, border: `1px solid ${C.grid}`, background: C.card, color: C.navy2, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              <ChevronLeft size={16} /> Indietro
            </button>
          )}
          <button onClick={() => (step < 2 ? setStep((s) => s + 1) : salva())} disabled={!puoAvanzare || busy}
            style={{ ...font, flexGrow: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, height: 46, borderRadius: 11, border: "none", background: puoAvanzare ? C.orange : C.grid, color: puoAvanzare ? "#fff" : C.muted, fontSize: 15, fontWeight: 600, cursor: puoAvanzare && !busy ? "pointer" : "default" }}>
            {busy ? "Salvo…" : step < 2 ? <>Avanti <ChevronRight size={17} /></> : <><Check size={17} /> Finito</>}
          </button>
        </div>

        <button onClick={later}
          style={{ ...font, display: "block", margin: "12px auto 0", background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", height: 32 }}>
          Più tardi
        </button>
      </div>
    </div>
  );
}
