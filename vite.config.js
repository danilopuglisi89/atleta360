import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",      // service worker nostro (src/sw.js): precache + push
      srcDir: "src",
      filename: "sw.js",
      includeAssets: ["favicon.png", "apple-touch-icon.png", "logo-oasivolley.png", "login-hero.jpg"],
      manifest: {
        name: "Oasi Volley Dashboard",
        short_name: "Oasi Volley",
        description: "Dashboard delle soft skill della squadra Oasi Volley.",
        lang: "it",
        theme_color: "#0A1650",
        background_color: "#0A1650",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});
