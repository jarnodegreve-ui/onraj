import { NextResponse } from "next/server";

import { buildBackup } from "@/lib/backup";
import { secureEquals } from "@/lib/secure";
import {
  adminConfigured,
  createAdminClient,
  getOwnerUserId,
} from "@/lib/supabase/admin";
import { pushConfigured, sendPush, type PushSub } from "@/lib/push";
import { sendTelegramDocument, telegramConfigured } from "@/lib/telegram";

const cronSecret = process.env.CRON_SECRET ?? "";
const telegramChatId = process.env.TELEGRAM_ALLOWED_USER_ID ?? "";

function weekdayBrussels(now: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Brussels",
    weekday: "short",
  }).format(now); // bv. "Sun"
}

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
  // Admin is voor alles nodig; push enkel voor de digest. Zonder push draait de
  // wekelijkse backup nog steeds.
  if (!adminConfigured) {
    return NextResponse.json({ ok: false, reason: "niet-geconfigureerd" });
  }

  const ownerId = await getOwnerUserId();
  if (!ownerId) {
    return NextResponse.json({ ok: false, reason: "geen-gebruiker" });
  }

  const admin = createAdminClient();
  const now = new Date();

  let taskCount = 0;
  let sent = 0;

  // 1) Dagelijkse ochtend-digest via web-push.
  if (pushConfigured) {
    const todayKey = todayKeyBrussels(now);

    const { data: tasks } = await admin
      .from("tasks")
      .select("id")
      .eq("user_id", ownerId)
      .is("deleted_at", null)
      .eq("done", false)
      .not("due_on", "is", null)
      .lte("due_on", todayKey);

    taskCount = tasks?.length ?? 0;

    const taskPart =
      taskCount === 0
        ? "geen taken"
        : `${taskCount} ${taskCount === 1 ? "taak" : "taken"}`;
    const body = `Vandaag: ${taskPart} te doen.`;

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", ownerId);

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
  }

  // 2) Wekelijkse backup (zondag) als Telegram-document — buiten Supabase, en
  // zonder een tweede Vercel-cron (Hobby staat er maar één per dag toe).
  let backup: "verstuurd" | "mislukt" | "overgeslagen" = "overgeslagen";
  if (telegramConfigured && telegramChatId && weekdayBrussels(now) === "Sun") {
    const result = await buildBackup(admin, ownerId, now);
    const ok = await sendTelegramDocument(
      telegramChatId,
      result.filename,
      result.contents,
      `🗄 Wekelijkse backup — ${result.filename}\n${result.summary}`,
    );
    backup = ok ? "verstuurd" : "mislukt";
  }

  // 3) Prullenbak opschonen: rijen die langer dan 30 dagen in de prullenbak
  // zitten, definitief weggooien (vault-bestanden van notities zijn al weg).
  const cutoff = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
  let purged = 0;
  // events blijft erbij: de prullenbak kan nog oude afspraken bevatten.
  for (const table of ["tasks", "notes", "transactions", "events"] as const) {
    const { data: gone } = await admin
      .from(table)
      .delete()
      .eq("user_id", ownerId)
      .lt("deleted_at", cutoff)
      .select("id");
    purged += gone?.length ?? 0;
  }

  return NextResponse.json({
    ok: true,
    taskCount,
    sent,
    backup,
    purged,
  });
}
