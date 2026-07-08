// ============================================================
// Effetti "young": coriandoli leggeri, senza dipendenze esterne.
// fireConfetti() crea un layer temporaneo di coriandoli che cadono
// e si autoelimina. Rispetta prefers-reduced-motion.
// ============================================================
const CONFETTI_COLORS = ["#FF7A18", "#17297A", "#16A6A6", "#FFC24B", "#E11D74", "#0EA5E9"];

export function fireConfetti({ count = 90, duration = 2600 } = {}) {
  if (typeof document === "undefined") return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (reduce) return;

  const layer = document.createElement("div");
  layer.className = "a360-confetti-layer";

  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    p.className = "a360-confetti-piece";
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const fall = 1.8 + Math.random() * 1.4;
    const size = 6 + Math.random() * 7;
    p.style.left = left + "vw";
    p.style.width = size + "px";
    p.style.height = size * 1.4 + "px";
    p.style.background = color;
    p.style.borderRadius = Math.random() > 0.5 ? "2px" : "50%";
    p.style.animationDuration = fall + "s";
    p.style.animationDelay = delay + "s";
    p.style.transform = `translateY(-14px) rotate(${Math.random() * 360}deg)`;
    layer.appendChild(p);
  }

  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), duration + 700);
}
