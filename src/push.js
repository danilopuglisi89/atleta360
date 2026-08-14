// Notifiche push lato client: richiesta permesso, subscription al browser,
// salvataggio su Supabase (tabella push_subscriptions, vedi supabase/push.sql).
// La chiave pubblica VAPID è pubblica per definizione: sta qui senza problemi.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const VAPID_PUBLIC_KEY = "BMRj8iPjut1xsS0771gMURFeNUtYqNUyc5L6zTN5u9KRKX0p50ZBMHir1-6-EKg04FYAIdZF7d6eqap55h04Pww";

function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// Su iPhone le push PWA esistono solo da iOS 16.4 e SOLO se l'app è stata
// aggiunta alla schermata Home: nel Safari "normale" PushManager manca.
export function isIosSafariNotInstalled() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  return ios && !standalone;
}

// Stato: "unsupported" | "ios-install" | "denied" | "on" | "off" | "loading"
export function usePush(userId) {
  const [status, setStatus] = useState("loading");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!pushSupported()) {
      setStatus(isIosSafariNotInstalled() ? "ios-install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") { setStatus("denied"); return; }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    } catch {
      setStatus("off");
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Tiene la riga su Supabase allineata alla subscription del browser
  // (ri-upsert a ogni apertura: così le subscription rigenerate restano valide).
  useEffect(() => {
    if (!userId || status !== "on") return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await saveSubscription(userId, sub);
      } catch { /* non bloccare l'app per la push */ }
    })();
  }, [userId, status]);

  const enable = useCallback(async () => {
    if (!userId || !pushSupported()) return;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setStatus(perm === "denied" ? "denied" : "off"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await saveSubscription(userId, sub);
      setStatus("on");
    } catch {
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }, [userId]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch {
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, enable, disable };
}

async function saveSubscription(userId, sub) {
  const json = sub.toJSON();
  await supabase.from("push_subscriptions").upsert(
    { user_id: userId, endpoint: sub.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    { onConflict: "endpoint" }
  );
}
