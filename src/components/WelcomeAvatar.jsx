// La primissima cosa che vede un'atleta al primo accesso: "scegli chi sei".
// Prima di qualsiasi domanda o questionario — è personalizzazione pura, e il
// primo istinto è farla vedere alle compagne. Si mostra solo a chi non ha
// ancora né avatar né foto, e sparisce per sempre appena sceglie.
import { useState } from "react";
import { Check } from "lucide-react";
import { C, font, display } from "../theme";
import { supabase } from "../supabaseClient";
import { avatarImageUrl, LOOKS, JERSEYS, DEFAULT_AVATAR } from "../avatar";

const LATER_KEY = "a360-welcome-avatar-later";   // "Più tardi": solo per questa apertura

export function needsWelcomeAvatar(profile) {
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(LATER_KEY)) return false;
  return profile?.category === "atleta" && profile?.status === "approved"
    && !profile?.avatar_config && !profile?.avatar_url;
}

export default function WelcomeAvatar({ profile, onDone }) {
  const [cfg, setCfg] = useState(DEFAULT_AVATAR);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  if (!needsWelcomeAvatar(profile)) return null;

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("set_my_avatar_config", { p_config: cfg });
    setBusy(false);
    if (error) return;
    onDone?.();
  };

  const later = () => { sessionStorage.setItem(LATER_KEY, "1"); onDone?.(); };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 230, background: `linear-gradient(160deg, ${C.navy} 0%, ${C.navy2} 100%)`,
      display: "flex", flexDirection: "column", padding: "calc(28px + env(safe-area-inset-top)) 20px calc(20px + env(safe-area-inset-bottom))" }}>

      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ ...display, fontSize: 22, fontWeight: 700, color: "#fff" }}>
          Ciao {profile?.first_name || ""}! 👋
        </div>
        <div style={{ ...font, fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 6, lineHeight: 1.5 }}>
          Prima di tutto: scegli come vuoi apparire.
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <img src={avatarImageUrl(cfg)} alt="" width={124} height={124}
          style={{ width: 124, height: 124, borderRadius: "50%", objectFit: "cover", border: `4px solid ${C.orange}`, boxShadow: "0 12px 40px rgba(0,0,0,0.35)" }} />
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 }}>
        {Object.entries(JERSEYS).map(([key, label]) => (
          <button key={key} onClick={() => { setCfg((c) => ({ ...c, jersey: key })); setTouched(true); }}
            style={{ ...font, fontSize: 13, fontWeight: 600, padding: "8px 18px", borderRadius: 99, cursor: "pointer",
              border: `1.5px solid ${cfg.jersey === key ? C.orange : "rgba(255,255,255,0.3)"}`,
              background: cfg.jersey === key ? C.orange : "transparent", color: "#fff" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(68px, 1fr))", gap: 10, maxWidth: 460, margin: "0 auto" }}>
          {LOOKS.map((l) => {
            const on = cfg.look === l.id;
            return (
              <button key={l.id} onClick={() => { setCfg((c) => ({ ...c, look: l.id })); setTouched(true); }} title={l.label}
                style={{ padding: 0, borderRadius: "50%", cursor: "pointer", lineHeight: 0, background: "none",
                  border: `3px solid ${on ? C.orange : "transparent"}` }}>
                <img src={avatarImageUrl({ look: l.id, jersey: cfg.jersey })} alt={l.label}
                  style={{ width: "100%", aspectRatio: "1", borderRadius: "50%", objectFit: "cover", display: "block" }} />
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 16 }}>
        <button onClick={save} disabled={busy}
          style={{ ...font, display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 30px", borderRadius: 12, border: "none",
            background: C.orange, color: "#fff", fontSize: 16, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
          <Check size={18} /> {busy ? "Un attimo…" : touched ? "Sono io!" : "Va bene così"}
        </button>
        <button onClick={later}
          style={{ ...font, fontSize: 13, color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer" }}>
          Più tardi
        </button>
      </div>
    </div>
  );
}
