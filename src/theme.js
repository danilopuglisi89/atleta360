/* ============================================================
   BRAND — palette e font condivisi da tutta l'app.
   (sostituisci con gli hex esatti del brand Atleta360)
   ============================================================ */
const LIGHT = {
  navy: "#0A1650",
  navy2: "#17297A",
  orange: "#FF7A18",
  orangeSoft: "#FFE9D5",
  ink: "#0C1330",
  muted: "#64708F",
  surface: "#F6F7FB",
  card: "#FFFFFF",
  grid: "#E6E9F2",
};

// Stessi accenti (arancio/navy), sfondi/testo invertiti. `C` resta lo
// stesso oggetto condiviso in tutta l'app: cambiare tema muta le sue
// proprietà "sul posto" (non riassegna il riferimento `C`), così ogni
// componente che legge C.card/C.ink ecc. durante il render vede subito
// i valori nuovi — non serve toccare i colori inline sparsi nei file,
// basta far ri-renderizzare l'albero (vedi useDarkMode in App.jsx).
const DARK = {
  navy: "#0A1650",
  navy2: "#3B4FB8",
  orange: "#FF9142",
  orangeSoft: "#3A2A16",
  ink: "#EDEFF7",
  muted: "#9AA3C0",
  surface: "#181B2E",
  card: "#20233A",
  grid: "#31354F",
};

export const C = { ...LIGHT };

const THEME_KEY = "a360-theme";  // "light" | "dark" | "auto" (default)

export function applyTheme(mode) {
  const dark = mode === "dark" || (mode === "auto" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  Object.assign(C, dark ? DARK : LIGHT);
  document.body.style.background = C.surface;
  return dark;
}

export function getStoredThemeMode() {
  try { return localStorage.getItem(THEME_KEY) || "auto"; } catch { return "auto"; }
}

export function setStoredThemeMode(mode) {
  try { localStorage.setItem(THEME_KEY, mode); } catch { /* ignora */ }
}

export const font = { fontFamily: "'Inter', system-ui, sans-serif" };
export const display = { fontFamily: "'Space Grotesk', system-ui, sans-serif" };

// Medaglie del podio (oro / argento / bronzo).
export const MEDALS = ["#E8A400", "#9AA6BF", "#CD7F32"];

// Palette dei grafici: serie del confronto atlete e curve dell'andamento.
export const SERIES = ["#FF7A18", "#17297A", "#16A6A6"];
export const CORE_COLORS = ["#FF7A18", "#17297A", "#16A6A6", "#8B5CF6", "#E11D74", "#0EA5E9"];

// Anello colorato attorno all'avatar in base al punteggio complessivo.
export function ringForScore(v) {
  if (v >= 7.5) return "#0F7A4E";   // verde — ottimo
  if (v >= 5.5) return C.orange;    // arancione — in crescita
  return C.navy2;                   // navy — da allenare
}

// Anello in base al ruolo (quando non c'è un punteggio, es. staff/admin).
export function ringForRole(role, category) {
  if (role === "admin") return C.navy2;
  if (category === "direzione" || category === "staff") return "#16A6A6";
  return C.orange;                  // atleta
}
