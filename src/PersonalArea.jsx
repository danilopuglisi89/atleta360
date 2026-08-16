import { useRef, useState } from "react";
import { Camera, Save, CheckCircle2, AlertCircle, Lock, UserCircle } from "lucide-react";
import { C, font, display, ACCENTS } from "./theme";
import { supabase } from "./supabaseClient";
import { useAuth } from "./auth";
import { useParticipation } from "./participation";
import AvatarBuilder from "./components/AvatarBuilder";

const CATEGORY_LABEL = { direzione: "Direzione", staff: "Staff", atleta: "Atleta" };

// Personalizzazione sbloccabile coi punti partecipazione (Ondata C
// gamification): un'emoji decorativa accanto al nome, non serve Storage.
const FLAIRS = [
  { emoji: "⭐", min: 0 },
  { emoji: "🔥", min: 15 },
  { emoji: "💪", min: 15 },
  { emoji: "🚀", min: 50 },
  { emoji: "🌈", min: 50 },
  { emoji: "💎", min: 120 },
  { emoji: "👑", min: 250 },
  { emoji: "🏆", min: 500 },
];

function Card({ title, subtitle, children, style }) {
  return (
    <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.grid}`, boxShadow: "0 1px 2px rgba(12,19,48,0.04)", padding: 20, ...style }}>
      {title && <h3 style={{ ...display, fontSize: 15, fontWeight: 600, color: C.ink, margin: 0 }}>{title}</h3>}
      {subtitle && <p style={{ ...font, fontSize: 13, color: C.muted, margin: "4px 0 0" }}>{subtitle}</p>}
      {(title || subtitle) && <div style={{ height: 16 }} />}
      {children}
    </div>
  );
}

const labelStyle = { ...font, fontSize: 12.5, color: C.muted, fontWeight: 500, marginBottom: 6, display: "block" };
const inputStyle = { ...font, fontSize: 14, color: C.ink, background: C.card, border: `1px solid ${C.grid}`, borderRadius: 10, padding: "10px 12px", width: "100%", boxSizing: "border-box", outline: "none" };

export function Avatar({ url, name, size = 96, ring }) {
  const initials = (name || "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  // Anello colorato: bordo più marcato + alone, in base a punteggio o ruolo.
  const border = ring ? `3px solid ${ring}` : `2px solid ${C.grid}`;
  const glow = ring ? { boxShadow: `0 0 0 3px ${ring}22` } : {};
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border, ...glow }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: C.navy2, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", ...display, fontWeight: 700, fontSize: size * 0.36, border, ...glow }}>
      {initials}
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input {...props} style={inputStyle} />
    </div>
  );
}

export default function PersonalArea({ accent, onPickAccent, onOpenCard }) {
  const { profile, refreshProfile } = useAuth();
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    phone: profile?.phone || "", facebook: profile?.facebook || "", instagram: profile?.instagram || "",
    jersey_number: profile?.jersey_number || "", ruolo: profile?.ruolo || "", avatar_url: profile?.avatar_url || "",
    motto: profile?.motto || "", flair: profile?.flair || "",
    card_bg: profile?.card_bg || "", card_bg_style: profile?.card_bg_style || "sfumata",
    song_title: profile?.song_title || "", song_artist: profile?.song_artist || "",
    ritual: profile?.ritual || "", nickname: profile?.nickname || "",
  });
  const bgRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);
  const { level } = useParticipation(null);
  const points = level?.total_points ?? 0;

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");

  const onFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 256, canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d");
        const s = Math.min(img.width, img.height), sx = (img.width - s) / 2, sy = (img.height - s) / 2;
        ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
        setForm((f) => ({ ...f, avatar_url: canvas.toDataURL("image/jpeg", 0.82) }));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  // Sfondo della card: la foto viene comunque velata di navy e (in modalità
  // sfumata) sfocata, quindi 760px bastano — teniamo leggera la riga sul
  // database, che è testo come l'avatar.
  const onBgFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 760;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        setForm((f) => ({ ...f, card_bg: canvas.toDataURL("image/jpeg", 0.72) }));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const save = async () => {
    setBusy(true); setError(null);
    const { error } = await supabase.rpc("update_my_profile", {
      p_phone: form.phone.trim() || null,
      p_facebook: form.facebook.trim() || null,
      p_instagram: form.instagram.trim() || null,
      p_jersey_number: form.jersey_number.trim() || null,
      p_ruolo: form.ruolo.trim() || null,
      p_avatar_url: form.avatar_url || null,
    });
    if (!error) await supabase.rpc("set_my_motto", { p_motto: form.motto || "" });
    if (!error) await supabase.rpc("set_my_flair", { p_flair: form.flair || "" });
    if (!error) await supabase.rpc("set_my_card_bg", { p_bg: form.card_bg || "", p_style: form.card_bg_style || "sfumata" });
    if (!error) await supabase.rpc("set_my_cameretta", {
      p_song_title: form.song_title || "", p_song_artist: form.song_artist || "",
      p_ritual: form.ritual || "", p_nickname: form.nickname || "", p_showcase: profile?.showcase_badges ?? null,
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    await refreshProfile();
    setFlash("Profilo aggiornato.");
    setTimeout(() => setFlash(null), 4000);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
      {onOpenCard && profile?.id && (
        <button onClick={() => onOpenCard(profile.id)}
          style={{ ...font, gridColumn: "1 / -1", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
            padding: "13px 18px", borderRadius: 14, border: "none", background: `linear-gradient(120deg, ${C.navy} 0%, ${C.navy2} 100%)`,
            color: "#fff", fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}>
          <UserCircle size={18} /> Vedi il mio profilo
        </button>
      )}
      <Card title="I tuoi dati" subtitle="Inseriti alla registrazione (li modifica lo staff)">
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
          <Avatar url={form.avatar_url} name={fullName} size={72} />
          <div>
            <div style={{ ...display, fontSize: 17, fontWeight: 700, color: C.ink }}>{fullName || "—"}</div>
            <div style={{ ...font, fontSize: 13, color: C.muted }}>{CATEGORY_LABEL[profile?.category] || "Atleta"}</div>
          </div>
        </div>
        <div style={{ ...font, fontSize: 13.5, color: C.ink, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: C.muted }}>Nome</span><span>{profile?.first_name || "—"}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: C.muted }}>Cognome</span><span>{profile?.last_name || "—"}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span style={{ color: C.muted }}>Email</span><span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{profile?.email}</span></div>
        </div>
      </Card>

      <Card title="Il tuo profilo (facoltativo)" subtitle="Compila e aggiorna quando vuoi">
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <Avatar url={form.avatar_url} name={fullName} size={72} />
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
            <button onClick={() => fileRef.current?.click()} style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 500, padding: "9px 13px", borderRadius: 10, border: `1px solid ${C.grid}`, background: C.card, color: C.ink, cursor: "pointer" }}>
              <Camera size={16} /> {form.avatar_url ? "Cambia foto" : "Aggiungi foto"}
            </button>
            {form.avatar_url && (
              <button onClick={() => setForm((f) => ({ ...f, avatar_url: "" }))} style={{ ...font, fontSize: 12.5, color: C.muted, background: "none", border: "none", cursor: "pointer", marginLeft: 8 }}>Rimuovi</button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Numero di telefono" type="tel" value={form.phone} onChange={upd("phone")} placeholder="es. 333 1234567" />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 120px" }}><Field label="Numero di maglia" value={form.jersey_number} onChange={upd("jersey_number")} placeholder="es. 7" /></div>
            <div style={{ flex: "1 1 160px" }}><Field label="Ruolo" value={form.ruolo} onChange={upd("ruolo")} placeholder="es. Palleggiatrice" /></div>
          </div>
          <Field label="Profilo Facebook" value={form.facebook} onChange={upd("facebook")} placeholder="link o nome utente" />
          <Field label="Profilo Instagram" value={form.instagram} onChange={upd("instagram")} placeholder="@nomeutente o link" />
          <Field label="Il tuo motto" value={form.motto} onChange={upd("motto")} placeholder="es. Punto dopo punto." />
          <Field label="Il tuo soprannome" value={form.nickname} onChange={upd("nickname")} placeholder="come ti chiamano le compagne" />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 160px" }}><Field label="La canzone che ti carica" value={form.song_title} onChange={upd("song_title")} placeholder="titolo" /></div>
            <div style={{ flex: "1 1 140px" }}><Field label="Artista" value={form.song_artist} onChange={upd("song_artist")} placeholder="es. Elodie" /></div>
          </div>
          <Field label="Il tuo rito / portafortuna" value={form.ritual} onChange={upd("ritual")} placeholder="es. calzini fortunati, treccia prima del match" />

          {/* Sfondo delle card condivisibili */}
          <div>
            <label style={labelStyle}>Sfondo delle tue card da condividere</label>
            <input ref={bgRef} type="file" accept="image/*" onChange={onBgFile} style={{ display: "none" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ width: 74, height: 96, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.grid}`, background: "#0A1650", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                {form.card_bg
                  ? <img src={form.card_bg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: form.card_bg_style === "nitida" ? "blur(1px)" : "blur(5px)", opacity: 0.85 }} />
                  : <span style={{ ...font, fontSize: 10, color: "rgba(255,255,255,0.5)", textAlign: "center", padding: 4 }}>nessuna foto</span>}
              </div>
              <div style={{ flex: "1 1 180px" }}>
                <button onClick={() => bgRef.current?.click()}
                  style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 500, padding: "9px 13px", borderRadius: 10, border: `1px solid ${C.grid}`, background: C.card, color: C.ink, cursor: "pointer" }}>
                  <Camera size={16} /> {form.card_bg ? "Cambia foto" : "Carica la tua foto"}
                </button>
                {form.card_bg && (
                  <button onClick={() => setForm((f) => ({ ...f, card_bg: "" }))}
                    style={{ ...font, fontSize: 12.5, color: C.muted, background: "none", border: "none", cursor: "pointer", marginLeft: 8 }}>Togli</button>
                )}
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {[["sfumata", "Sfumata"], ["nitida", "Nitida"]].map(([k, lab]) => (
                    <button key={k} onClick={() => setForm((f) => ({ ...f, card_bg_style: k }))}
                      style={{ ...font, fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                        border: `1.5px solid ${form.card_bg_style === k ? C.orange : C.grid}`,
                        background: form.card_bg_style === k ? C.orangeSoft : C.card, color: form.card_bg_style === k ? C.orange : C.muted }}>
                      {lab}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ ...font, fontSize: 11.5, color: C.muted, marginTop: 7, lineHeight: 1.45 }}>
              Compare dietro alle card che condividi su Instagram. <b>Sfumata</b>: la foto resta uno sfondo di colore.
              <b> Nitida</b>: si riconosce il soggetto. Ricordati che la card diventa pubblica quando la pubblichi.
            </div>
          </div>

          {onPickAccent && (
            <div>
              <label style={labelStyle}>Colore dell'app ({points} punti — se ne sbloccano di nuovi salendo di livello)</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(ACCENTS).map(([key, a]) => {
                  const unlocked = points >= a.minPoints;
                  const selected = accent === key;
                  return (
                    <button key={key} type="button" disabled={!unlocked}
                      onClick={() => onPickAccent(key)}
                      title={unlocked ? a.label : `Sblocca a ${a.minPoints} punti`}
                      style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 10, cursor: unlocked ? "pointer" : "default",
                        border: `2px solid ${selected ? a.light.orange : C.grid}`, background: selected ? `${a.light.orange}18` : C.card,
                        opacity: unlocked ? 1 : 0.45 }}>
                      <span style={{ width: 16, height: 16, borderRadius: 99, background: a.light.orange, flexShrink: 0, filter: unlocked ? "none" : "grayscale(1)" }} />
                      <span style={{ ...font, fontSize: 12.5, fontWeight: 600, color: unlocked ? C.ink : C.muted }}>
                        {unlocked ? a.label : <Lock size={11} style={{ verticalAlign: -1 }} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>La tua emoji ({points} punti — se ne sbloccano di nuove salendo di livello)</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {FLAIRS.map((f) => {
                const unlocked = points >= f.min;
                const selected = form.flair === f.emoji;
                return (
                  <button key={f.emoji} type="button" disabled={!unlocked}
                    onClick={() => setForm((v) => ({ ...v, flair: selected ? "" : f.emoji }))}
                    title={unlocked ? f.emoji : `Sblocca a ${f.min} punti`}
                    style={{ width: 42, height: 42, borderRadius: 11, fontSize: 19, cursor: unlocked ? "pointer" : "default",
                      border: `2px solid ${selected ? C.orange : C.grid}`, background: selected ? C.orangeSoft : C.card,
                      filter: unlocked ? "none" : "grayscale(1)", opacity: unlocked ? 1 : 0.45, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {unlocked ? f.emoji : <Lock size={14} color={C.muted} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#FDECEC", color: "#B4232A", borderRadius: 10, padding: "10px 12px", ...font, fontSize: 13, marginTop: 14 }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{error}</span>
          </div>
        )}
        {flash && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#DDF3E7", color: "#0F7A4E", borderRadius: 10, padding: "10px 12px", ...font, fontSize: 13, marginTop: 14 }}>
            <CheckCircle2 size={16} /> {flash}
          </div>
        )}

        <button onClick={save} disabled={busy} style={{ ...font, display: "inline-flex", alignItems: "center", gap: 8, marginTop: 18, padding: "12px 18px", borderRadius: 11, border: "none", background: C.orange, color: "#fff", fontSize: 15, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
          <Save size={17} /> {busy ? "Salvo…" : "Salva"}
        </button>
      </Card>

      {profile?.role !== "admin" && profile?.category === "atleta" && (
        <AvatarBuilder initial={profile?.avatar_config} onSaved={refreshProfile} />
      )}
    </div>
  );
}
