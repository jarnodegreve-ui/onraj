import { NextResponse } from "next/server";

import { secureEquals } from "@/lib/secure";
import {
  adminConfigured,
  createAdminClient,
  getOwnerUserId,
} from "@/lib/supabase/admin";
import { pushConfigured, sendPush, type PushSub } from "@/lib/push";

const cronSecret = process.env.CRON_SECRET ?? "";

function todayKeyBrussels(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
  }).format(now);
}

// Dagelijkse ochtend-digest: telt openstaande taken (vandaag/te laat) en
// afspraken in de komende 24u, en pusht dat naar alle toestellen.
export async function GET(request: Request) {
  // Vercel Cron stuurt Authorization: Bearer <CRON_SECRET>. Fail-closed: zonder
  // geconfigureerd secret wordt de cron geweigerd (geen publiek triggerbare push).
  const auth = request.headers.get("authorization") ?? "";
  if (!cronSecret || !secureEquals(auth, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!adminConfigured || !pushConfigured) {
    return NextResponse.json({ ok: false, reason: "niet-geconfigureerd" });
  }

  const ownerId = await getOwnerUserId();
  if (!ownerId) {
    return NextResponse.json({ ok: false, reason: "geen-gebruiker" });
  }

  const admin = createAdminClient();
  const now = new Date();
  const todayKey = todayKeyBrussels(now);
  const in24h = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

  const { data: tasks } = await admin
    .from("tasks")
    .select("id")
    .eq("user_id", ownerId)
    .eq("done", false)
    .not("due_on", "is", null)
    .lte("due_on", todayKey);

  const { data: events } = await admin
    .from("events")
    .select("id")
    .eq("user_id", ownerId)
    .gte("starts_at", now.toISOString())
    .lte("starts_at", in24h);

  const taskCount = tasks?.length ?? 0;
  const eventCount = events?.length ?? 0;

  const taskPart =
    taskCount === 0
      ? "geen taken"
      : `${taskCount} ${taskCount === 1 ? "taak" : "taken"}`;
  const eventPart =
    eventCount === 0
      ? "geen afspraken"
      : `${eventCount} ${eventCount === 1 ? "afspraak" : "afspraken"}`;
  const body = `Vandaag: ${taskPart} te doen · ${eventPart} de komende 24u.`;

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", ownerId);

  let sent = 0;
  for (const row of subs ?? []) {
    const sub: PushSub = {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
    };
    const result = await sendPush(sub, {
      title: "Goeiemorgen ☀️",
      body,
      url: "/dashboard",
    });
    if (result === "ok") {
      sent += 1;
    } else if (result === "gone") {
      await admin
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", row.endpoint);
    }
  }

  return NextResponse.json({ ok: true, taskCount, eventCount, sent });
}
