import { NextResponse } from "next/server";

import { secureEquals } from "@/lib/secure";
import {
  adminConfigured,
  createAdminClient,
  getOwnerUserId,
} from "@/lib/supabase/admin";
import { sendTelegramMessage, telegramConfigured } from "@/lib/telegram";

const cronSecret = process.env.CRON_SECRET ?? "";
const telegramChatId = process.env.TELEGRAM_ALLOWED_USER_ID ?? "";

function brusselsDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
  }).format(now); // YYYY-MM-DD
}

function brusselsHHmm(now: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Brussels",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now); // "HH:mm"
}

/**
 * Frequente cron (Vercel Pro): pingt via Telegram bij taken met een tijdstip
 * (due_on = vandaag, due_time ≤ nu, nog niet afgevinkt). `reminded_on` voorkomt
 * dubbele meldingen — elke taak wordt hoogstens één keer per dag gepingd.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!cronSecret || !secureEquals(auth, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!adminConfigured || !telegramConfigured || !telegramChatId) {
    return NextResponse.json({ ok: false, reason: "niet-geconfigureerd" });
  }

  const ownerId = await getOwnerUserId();
  if (!ownerId) {
    return NextResponse.json({ ok: false, reason: "geen-gebruiker" });
  }

  const admin = createAdminClient();
  const now = new Date();
  const today = brusselsDate(now);
  const nowHHmm = brusselsHHmm(now);

  let sent = 0;
  try {
    const { data: tasks } = await admin
      .from("tasks")
      .select("id, title, due_time, reminded_on")
      .eq("user_id", ownerId)
      .is("deleted_at", null)
      .eq("done", false)
      .eq("due_on", today)
      .not("due_time", "is", null);

    for (const task of tasks ?? []) {
      if (task.reminded_on === today) continue; // vandaag al gepingd
      if ((task.due_time as string) > nowHHmm) continue; // nog niet aan de beurt
      await sendTelegramMessage(
        telegramChatId,
        `⏰ ${task.due_time} — ${task.title}`,
      );
      await admin
        .from("tasks")
        .update({ reminded_on: today })
        .eq("id", task.id);
      sent += 1;
    }
  } catch (error) {
    console.error("[cron] taak-reminders mislukt:", error);
  }

  return NextResponse.json({ ok: true, sent });
}
