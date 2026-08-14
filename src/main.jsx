import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Dopo un deploy, il service worker nuovo può prendere il controllo mentre
// la pagina ha ancora in memoria il codice vecchio (moduli JS già caricati):
// il disallineamento causa pagine bianche o schermate di caricamento che
// restano ferme finché non si ricarica a mano. Qui lo facciamo da soli, una
// volta sola, appena il nuovo SW prende il controllo.
if ("serviceWorker" in navigator) {
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
