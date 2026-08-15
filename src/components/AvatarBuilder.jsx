import { useState } from "react";
import { Save, Check, Trash2 } from "lucide-react";
import { C, font, display } from "../theme";
import { Card } from "./ui";
import { supabase } from "../supabaseClient";
import Avatar2D from "./Avatar2D";
import { SKIN_TONES, HAIR_STYLES, HAIR_COLORS, JERSEY_COLORS, DEFAULT_AVATAR } from "../avatar";

const HAIR_LABEL = { corti: "Corti", coda: "Coda", raccolti: "Raccolti", ricci: "Ricci", cappello: "Cappello" };

function Swatch({ color, selected, onClick, shape = "circle" }) {
  return (
    <button type="button" onClick={onClick}
      style={{ width: 30, height: 30, borderRadius: shape === "circle" ? "50%" : 8, background: color, cursor: "pointer",
        border: `3px solid ${selected ? C.orange : "transparent"}`, boxShadow: `0 0 0 1px ${C.grid}` }} />
  );
}

export default function AvatarBuilder({ initial, onSaved }) {
  const [cfg, setCfg] = useState({ ...DEFAULT_AVATAR, ...initial });
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);
  const set = (k) => (v) => setCfg((c) => ({ ...c, [k]: v }));

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
    <Card title="Il tuo avatar" subtitle="Crealo a modo tuo — puoi usarlo al posto della foto, anche nelle card" style={{ marginTop: 20 }} className="a360-noprint">
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <Avatar2D config={cfg} size={130} />

        <div style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ ...font, fontSize: 11.5, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>Carnagione</div>
            <div style={{ display: "flex", gap: 7 }}>
              {SKIN_TONES.map((s) => <Swatch key={s} color={s} selected={cfg.skin === s} onClick={() => set("skin")(s)} />)}
            </div>
          </div>

          <div>
            <div style={{ ...font, fontSize: 11.5, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>Capelli</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {HAIR_STYLES.map((h) => (
                <button key={h} type="button" onClick={() => set("hair")(h)}
                  style={{ ...font, fontSize: 12, fontWeight: 600, padding: "6px 11px", borderRadius: 8, cursor: "pointer",
                    border: `1.5px solid ${cfg.hair === h ? C.orange : C.grid}`, background: cfg.hair === h ? C.orangeSoft : C.card, color: cfg.hair === h ? C.orange : C.muted }}>
                  {HAIR_LABEL[h]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ ...font, fontSize: 11.5, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>Colore capelli</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {HAIR_COLORS.map((h) => <Swatch key={h} color={h} selected={cfg.hairColor === h} onClick={() => set("hairColor")(h)} />)}
            </div>
          </div>

          <div>
            <div style={{ ...font, fontSize: 11.5, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>Colore maglia</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {JERSEY_COLORS.map((j) => <Swatch key={j} color={j} selected={cfg.jersey === j} onClick={() => set("jersey")(j)} shape="square" />)}
            </div>
          </div>

          <div>
            <div style={{ ...font, fontSize: 11.5, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>Numero</div>
            <input value={cfg.number || ""} onChange={(e) => set("number")(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
              placeholder="es. 7" inputMode="numeric"
              style={{ ...font, fontSize: 14, width: 70, border: `1px solid ${C.grid}`, borderRadius: 9, padding: "8px 11px", outline: "none" }} />
          </div>
        </div>
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
