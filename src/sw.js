/* Service worker della PWA: precache degli asset (come prima, via Workbox)
   + gestione delle notifiche push (nuovo). Compilato da vite-plugin-pwa
   in modalità injectManifest. */
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// ---------- Modalità offline: l'app si apre sempre, anche senza rete ----------
// Le rotte sono tutte client-side (SPA): senza questo, navigare offline verso
// una voce di menu diversa dalla schermata già in cache mostra l'errore del
// browser invece della shell dell'app (che poi mostra i dati salvati sotto).
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html"), {
  denylist: [/^\/api\//],
}));

// ---------- Modalità offline: ultimi dati visti, senza rete ----------
// Solo LETTURE verso Supabase (GET su /rest/v1/): prova la rete, se non
// risponde entro 4s usa l'ultima risposta salvata. Le SCRITTURE (POST/
// PATCH/DELETE, cioè quando l'atleta o il mister salvano qualcosa) non
// passano MAI da qui — solo il browser decide se sono possibili offline,
// mai dati vecchi spacciati per nuovi.
registerRoute(
  ({ url, request }) => request.method === "GET" && url.pathname.startsWith("/rest/v1/"),
  new NetworkFirst({ cacheName: "a360-data-cache", networkTimeoutSeconds: 4 })
);

// ---------- Push in arrivo: mostra la notifica di sistema ----------
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* payload non JSON */ }
  const title = data.title || "Atleta360";
  const options = {
    body: data.body || "",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag: data.type || "atleta360",          // raggruppa le notifiche dello stesso tipo
    data: { view: data.view || "home" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ---------- Click sulla notifica: apri l'app sulla vista giusta ----------
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const view = event.notification.data?.view || "home";
  const url = `/?view=${encodeURIComponent(view)}`;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) { w.navigate(url); return w.focus(); }
      }
      return self.clients.openWindow(url);
    })
  );
});
