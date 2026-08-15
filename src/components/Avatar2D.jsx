import { avatarImageUrl, avatarNumber } from "../avatar";
import { C, display } from "../theme";

export default function Avatar2D({ config, size = 44, ring, style }) {
  const number = avatarNumber(config);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0, ...style }}>
      <img src={avatarImageUrl(config)} alt="Avatar" width={size} height={size}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block",
          border: ring ? `3px solid ${ring}` : "none", boxShadow: ring ? `0 0 0 3px ${ring}22` : "none" }} />
      {number && size >= 36 && (
        <span style={{ position: "absolute", bottom: -2, right: -2, minWidth: size * 0.34, height: size * 0.34, borderRadius: "50%",
          background: C.orange, color: "#fff", ...display, fontWeight: 700, fontSize: Math.max(size * 0.2, 9),
          display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff", padding: "0 2px" }}>
          {number}
        </span>
      )}
    </div>
  );
}

// URL utilizzabile da <img>, da avatarUrl delle card condivisibili o da
// loadImage() nel motore canvas (shareCards.js) — stessa firma di
// un'immagine caricata, così le card non devono sapere se l'atleta ha una
// foto vera o un avatar scelto dalla galleria.
export function avatarShareUrl(config) {
  return avatarImageUrl(config);
}
