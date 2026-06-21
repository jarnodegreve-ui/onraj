import webpush from "web-push";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
const subject = process.env.VAPID_SUBJECT ?? "mailto:jarno.degreve@gmail.com";

export const pushConfigured = Boolean(publicKey && privateKey);

if (pushConfigured) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export interface PushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// Stuurt één push-melding. Geeft "gone" terug als de subscription verlopen is
// (404/410), zodat de cron 'm kan opruimen.
export async function sendPush(
  sub: PushSub,
  payload: PushPayload,
): Promise<"ok" | "gone" | "error"> {
  if (!pushConfigured) return "error";
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
    return "ok";
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode;
    if (status === 404 || status === 410) return "gone";
    console.error("[push] verzenden mislukt:", error);
    return "error";
  }
}
