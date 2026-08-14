/* Service worker della PWA: precache degli asset (come prima, via Workbox)
   + gestione delle notifiche push (nuovo). Compilato da vite-plugin-pwa
   in modalità injectManifest. */
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { clientsClaim } from "workbox-core";

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

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
