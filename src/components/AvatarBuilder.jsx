import { useState } from "react";
import { Save, Check, Trash2 } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "./ui";
import { supabase } from "../supabaseClient";
import { avatarImageUrl, LOOKS, JERSEYS, DEFAULT_AVATAR } from "../avatar";

export default function AvatarBuilder({ initial, onSaved }) {
  const [cfg, setCfg] = useState({ ...DEFAULT_AVATAR, ...initial });
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("set_my_avatar_config", { p_config: cfg });
    setBusy(false);
    if (!error) { setFlash("Salvato!"); onSaved?.(cfg); setTimeout(() => setFlash(null), 2500); }
  };

  const remove = async () => {
    setBusy(true);
    await supabase.rpc("set_my_avatar_config", { p_config: null });
    setBusy(false);
    onSaved?.(null);
  };

  return (
    <Card title="Il tuo avatar" subtitle="Scegli il tuo look — puoi usarlo al posto della foto, anche nelle card" style={{ marginTop: 20 }} className="a360-noprint">
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <img src={avatarImageUrl(cfg)} alt="Avatar" width={110} height={110}
          style={{ width: 110, height: 110, borderRadius: "50%", objectFit: "cover", border: `3px solid ${C.orange}`, flexShrink: 0 }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <div style={{ ...font, fontSize: 11.5, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>Maglia</div>
            <div style={{ display: "flex", gap: 6 }}>
              {Object.entries(JERSEYS).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setCfg((c) => ({ ...c, jersey: key }))}
                  style={{ ...font, fontSize: 12.5, fontWeight: 600, padding: "7px 14px", borderRadius: 9, cursor: "pointer",
                    border: `1.5px solid ${cfg.jersey === key ? C.orange : C.grid}`, background: cfg.jersey === key ? C.orangeSoft : C.card, color: cfg.jersey === key ? C.orange : C.muted }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ ...font, fontSize: 11.5, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>Numero</div>
            <input value={cfg.number || ""} onChange={(e) => setCfg((c) => ({ ...c, number: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) }))}
              placeholder="es. 7" inputMode="numeric"
              style={{ ...font, fontSize: 14, width: 70, border: `1px solid ${C.grid}`, borderRadius: 9, padding: "8px 11px", outline: "none" }} />
          </div>
        </div>
      </div>

      <div style={{ ...font, fontSize: 11.5, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 }}>Scegli il look</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: 8, maxHeight: 260, overflowY: "auto", paddingRight: 2 }}>
        {LOOKS.map((l) => {
          const on = cfg.look === l.id;
          return (
            <button key={l.id} type="button" onClick={() => setCfg((c) => ({ ...c, look: l.id }))} title={l.label}
              style={{ padding: 0, borderRadius: "50%", cursor: "pointer", border: `3px solid ${on ? C.orange : "transparent"}`, background: "none", lineHeight: 0 }}>
              <img src={avatarImageUrl({ look: l.id, jersey: cfg.jersey })} alt={l.label} width={64} height={64}
                style={{ width: "100%", aspectRatio: "1", borderRadius: "50%", objectFit: "cover", display: "block" }} />
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <button onClick={save} disabled={busy}
          style={{ ...font, display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: "none",
            background: flash ? "#0F7A4E" : C.orange, color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
          {flash ? <Check size={16} /> : <Save size={16} />} {flash || "Salva avatar"}
        </button>
        {initial && (
          <button onClick={remove} disabled={busy}
            style={{ ...font, display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.grid}`, background: C.card, color: C.muted, fontSize: 13, cursor: "pointer" }}>
            <Trash2 size={14} /> Torna alla foto
          </button>
        )}
      </div>
    </Card>
  );
}
