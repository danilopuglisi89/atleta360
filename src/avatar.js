// Avatar componibile — galleria di illustrazioni anime pre-generate (25
// aspetti diversi × 2 maglie Oasi Volley), non più forme SVG disegnate a
// mano. I file vivono in public/avatars/lookNN-{pink|black}.jpg.
export const LOOKS = [
  { id: "look01", label: "Castani corti" }, { id: "look02", label: "Corvini a coda" },
  { id: "look03", label: "Biondo miele" }, { id: "look04", label: "Ramati ricci" },
  { id: "look05", label: "Neri lisci" }, { id: "look06", label: "Castani corti" },
  { id: "look07", label: "Corvini a coda" }, { id: "look08", label: "Biondo miele" },
  { id: "look09", label: "Ramati ricci" }, { id: "look10", label: "Neri lisci" },
  { id: "look11", label: "Castani corti" }, { id: "look12", label: "Corvini a coda" },
  { id: "look13", label: "Biondo miele" }, { id: "look14", label: "Ramati ricci" },
  { id: "look15", label: "Neri lisci" }, { id: "look16", label: "Castani corti" },
  { id: "look17", label: "Corvini a coda" }, { id: "look18", label: "Biondo miele" },
  { id: "look19", label: "Ramati ricci" }, { id: "look20", label: "Neri lisci" },
  { id: "look21", label: "Castani corti" }, { id: "look22", label: "Corvini a coda" },
  { id: "look23", label: "Biondo miele" }, { id: "look24", label: "Ramati ricci" },
  { id: "look25", label: "Neri lisci" },
];
const LOOK_IDS = LOOKS.map((l) => l.id);

export const JERSEYS = { pink: "Rosa", black: "Nero" };
const JERSEY_KEYS = Object.keys(JERSEYS);

export const DEFAULT_AVATAR = { look: "look01", jersey: "pink", number: "" };

const safeNumber = (n) => String(n || "").replace(/[^0-9]/g, "").slice(0, 2);
const pick = (val, allowed, fallback) => (allowed.includes(val) ? val : fallback);

// Config -> url dell'immagine da mostrare. Il config può arrivare dal
// database: meglio non fidarsi ciecamente di valori fuori catalogo.
export function avatarImageUrl(cfg = {}) {
  const look = pick(cfg.look, LOOK_IDS, DEFAULT_AVATAR.look);
  const jersey = pick(cfg.jersey, JERSEY_KEYS, DEFAULT_AVATAR.jersey);
  return `/avatars/${look}-${jersey}.jpg`;
}

export function avatarNumber(cfg = {}) {
  return safeNumber(cfg.number);
}
