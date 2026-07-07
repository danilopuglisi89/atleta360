import { useRef, useState } from "react";
import { Camera, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { C, font, display } from "./theme";
import { supabase } from "./supabaseClient";
import { useAuth } from "./auth";

const CATEGORY_LABEL = { direzione: "Direzione", staff: "Staff", atleta: "Atleta" };

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
const inputStyle = { ...font, fontSize: 14, color: C.ink, background: "#fff", border: `1px solid ${C.grid}`, borderRadius: 10, padding: "10px 12px", width: "100%", boxSizing: "border-box", outline: "none" };

export function Avatar({ url, name, size = 96 }) {
  const initials = (name || "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  if (url) return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.grid}` }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: C.navy2, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", ...display, fontWeight: 700, fontSize: size * 0.36 }}>
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

export default function PersonalArea() {
  const { profile, refreshProfile } = useAuth();
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    phone: profile?.phone || "", facebook: profile?.facebook || "", instagram: profile?.instagram || "",
    jersey_number: profile?.jersey_number || "", ruolo: profile?.ruolo || "", avatar_url: profile?.avatar_url || "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);

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
    setBusy(false);
    if (error) { setError(error.message); return; }
    await refreshProfile();
    setFlash("Profilo aggiornato.");
    setTimeout(() => setFlash(null), 4000);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
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
            <button onClick={() => fileRef.current?.click()} style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 500, padding: "9px 13px", borderRadius: 10, border: `1px solid ${C.grid}`, background: "#fff", color: C.ink, cursor: "pointer" }}>
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
    </div>
  );
}
