import { avatarSvgMarkup } from "../avatar";

export default function Avatar2D({ config, size = 44, ring, style }) {
  const svg = avatarSvgMarkup(config);
  return (
    <div
      style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
        border: ring ? `3px solid ${ring}` : "none", boxShadow: ring ? `0 0 0 3px ${ring}22` : "none", ...style }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// Data URL utilizzabile da <img>, da avatarUrl delle card condivisibili o
// da loadImage() nel motore canvas (shareCards.js) — stessa firma di
// un'immagine caricata, così le card non devono sapere se l'atleta ha una
// foto vera o un avatar disegnato.
export function avatarSvgDataUrl(config) {
  const svg = avatarSvgMarkup(config);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
