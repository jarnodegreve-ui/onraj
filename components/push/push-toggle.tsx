"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  removePushSubscription,
  savePushSubscription,
} from "@/lib/actions/push";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

// VAPID-sleutel (base64url) → Uint8Array voor PushManager.subscribe.
function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function PushToggle() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    // getRegistration() i.p.v. .ready: lost meteen op (undefined als er geen SW
    // is), terwijl .ready blijft hangen tot er ooit een SW de pagina bestuurt.
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setEnabled(!!sub))
      .catch(() => {});
  }, []);

  async function enable() {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !VAPID_PUBLIC
    ) {
      toast.error("Push wordt hier niet ondersteund", {
        description:
          "Op iPhone: voeg ONRAJ eerst toe aan je beginscherm en open het zo.",
      });
      return;
    }
    // De service worker draait alleen in productie (zie ServiceWorkerRegister);
    // in dev installeren we 'm bewust niet, om stale caches te vermijden.
    if (process.env.NODE_ENV !== "production") {
      toast.error("Meldingen werken alleen in de geïnstalleerde app");
      return;
    }
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Toestemming geweigerd");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
      const json = sub.toJSON();
      const result = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      if (result.ok) {
        setEnabled(true);
        toast.success("Meldingen staan aan ✅");
      } else {
        toast.error("Mislukt", { description: result.error });
      }
    } catch {
      toast.error("Kon meldingen niet inschakelen");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setEnabled(false);
      toast.success("Meldingen staan uit");
    } catch {
      toast.error("Kon meldingen niet uitschakelen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={enabled ? disable : enable}
      disabled={busy}
    >
      {enabled ? <BellOff className="size-4" /> : <Bell className="size-4" />}
      {enabled ? "Meldingen uit" : "Meldingen aan"}
    </Button>
  );
}
