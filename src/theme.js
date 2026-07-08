/* ============================================================
   BRAND — palette e font condivisi da tutta l'app.
   (sostituisci con gli hex esatti del brand Atleta360)
   ============================================================ */
export const C = {
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

export const font = { fontFamily: "'Inter', system-ui, sans-serif" };
export const display = { fontFamily: "'Space Grotesk', system-ui, sans-serif" };

// Medaglie del podio (oro / argento / bronzo).
export const MEDALS = ["#E8A400", "#9AA6BF", "#CD7F32"];

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
