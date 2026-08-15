// Avatar componibile — stilizzato, disegnato con forme semplici (cerchi,
// ellissi, archi): niente asset esterni, funziona anche sulle card
// condivisibili (si serializza in un'immagine via data URL SVG).
export const SKIN_TONES = ["#FFDAB4", "#F1B27A", "#C68863", "#8D5A3B", "#5C3A28"];
export const HAIR_COLORS = ["#2B1B12", "#5A3825", "#8B5A2B", "#C99A3E", "#D94F4F", "#7A4FD9", "#2E2E2E"];
export const JERSEY_COLORS = ["#FF7A18", "#0A1650", "#17297A", "#0EA394", "#E11D74"];

export const HAIR_STYLES = ["corti", "coda", "raccolti", "ricci", "cappello"];

export const DEFAULT_AVATAR = {
  skin: SKIN_TONES[0],
  hair: "corti",
  hairColor: HAIR_COLORS[0],
  jersey: JERSEY_COLORS[0],
  number: "",
};

// Ritorna il markup SVG (stringa) di un avatar 200x200 — usato sia per il
// componente React (dangerouslySetInnerHTML no: si ricostruisce via JSX,
// vedi Avatar2D.jsx) sia per rasterizzarlo su canvas nelle card.
// Solo cifre, max 2: e' un numero di maglia, non testo libero — e va
// interpolato in un SVG renderizzato con dangerouslySetInnerHTML, quindi
// niente caratteri che possano assomigliare a markup.
const safeNumber = (n) => String(n || "").replace(/[^0-9]/g, "").slice(0, 2);
// Solo valori delle palette note finiscono negli attributi SVG (fill/colore):
// il config puo' arrivare dal database, meglio non fidarsi ciecamente
// nemmeno di stringhe che sembrano gia' un colore.
const pick = (val, allowed, fallback) => (allowed.includes(val) ? val : fallback);

export function avatarSvgMarkup(cfg = {}) {
  const c = {
    ...DEFAULT_AVATAR,
    ...cfg,
    skin: pick(cfg.skin, SKIN_TONES, DEFAULT_AVATAR.skin),
    hair: pick(cfg.hair, HAIR_STYLES, DEFAULT_AVATAR.hair),
    hairColor: pick(cfg.hairColor, HAIR_COLORS, DEFAULT_AVATAR.hairColor),
    jersey: pick(cfg.jersey, JERSEY_COLORS, DEFAULT_AVATAR.jersey),
    number: safeNumber(cfg.number),
  };
  const hair = hairShape(c.hair, c.hairColor);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="100" fill="${c.jersey}22" />
      ${hair.back}
      <ellipse cx="100" cy="112" rx="52" ry="58" fill="${c.skin}" />
      <path d="M62 150 Q100 190 138 150 L150 200 L50 200 Z" fill="${c.jersey}" />
      ${c.number ? `<text x="100" y="196" font-family="'Space Grotesk',sans-serif" font-weight="700" font-size="22" fill="#fff" text-anchor="middle">${String(c.number).slice(0, 2)}</text>` : ""}
      <circle cx="80" cy="108" r="5" fill="#2B1B12" />
      <circle cx="120" cy="108" r="5" fill="#2B1B12" />
      <path d="M84 132 Q100 142 116 132" stroke="#8a5a3f" stroke-width="3" fill="none" stroke-linecap="round" />
      ${hair.front}
    </svg>`;
}

function hairShape(style, color) {
  switch (style) {
    case "coda":
      return {
        back: `<path d="M50 90 Q40 150 60 175 Q45 155 55 100 Z" fill="${color}" />`,
        front: `<path d="M52 95 Q100 40 148 95 Q140 70 100 62 Q60 70 52 95 Z" fill="${color}" />`,
      };
    case "raccolti":
      return {
        back: "",
        front: `<path d="M52 95 Q100 40 148 95 Q140 70 100 62 Q60 70 52 95 Z" fill="${color}" />
                <circle cx="72" cy="52" r="14" fill="${color}" /><circle cx="128" cy="52" r="14" fill="${color}" />`,
      };
    case "ricci":
      return {
        back: "",
        front: `<path d="M48 100 Q40 55 100 55 Q160 55 152 100 Q150 60 130 58 Q135 45 115 48 Q110 38 90 44 Q75 40 70 52 Q50 52 48 100 Z" fill="${color}" />`,
      };
    case "cappello":
      return {
        back: "",
        front: `<path d="M48 96 Q48 50 100 50 Q152 50 152 96 L152 78 Q100 62 48 78 Z" fill="${color}" />
                <rect x="46" y="72" width="108" height="14" rx="7" fill="${color}" />`,
      };
    case "corti":
    default:
      return {
        back: "",
        front: `<path d="M55 98 Q50 55 100 52 Q150 55 145 98 Q140 72 100 66 Q60 72 55 98 Z" fill="${color}" />`,
      };
  }
}
