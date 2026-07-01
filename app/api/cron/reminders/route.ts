import { NextResponse } from "next/server";

import { addMonths, addYears, format, parseISO } from "date-fns";

import { buildBackup } from "@/lib/backup";
import { formatDate, formatEuro } from "@/lib/format";
import { secureEquals } from "@/lib/secure";
import {
  adminConfigured,
  createAdminClient,
  getOwnerUserId,
} from "@/lib/supabase/admin";
import {
  pushConfigured,
  sendPush,
  type PushPayload,
  type PushSub,
} from "@/lib/push";
import {
  sendTelegramDocument,
  sendTelegramMessage,
  telegramConfigured,
} from "@/lib/telegram";

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

// Schuif een verlopen vervaldatum op naar de eerstvolgende datum ≥ vandaag,
// per cyclus (maandelijks/jaarlijks).
function advanceRenewal(
  dateStr: string,
  cycle: string,
  todayKey: string,
): string {
  let date = parseISO(dateStr);
  const step = cycle === "jaarlijks" ? addYears : addMonths;
  let guard = 0;
  while (format(date, "yyyy-MM-dd") < todayKey && guard < 600) {
    date = step(date, 1);
    guard += 1;
  }
  return format(date, "yyyy-MM-dd");
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

  // Push naar alle toestellen; ruimt verlopen subscriptions (404/410 → "gone")
  // meteen op, zodat dode endpoints zich niet opstapelen.
  async function pushToAllDevices(payload: PushPayload) {
    if (!pushConfigured) return;
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", ownerId);
    for (const row of subs ?? []) {
      const sub: PushSub = {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };
      const result = await sendPush(sub, payload);
      if (result === "gone") {
        await admin
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", row.endpoint);
      }
    }
  }

  let taskCount = 0;

  // Elke sectie eigen try/catch: een hapering in één stap mag de rest (incl.
  // backup en prullenbak-opschoning) niet overslaan.

  // 1) Dagelijkse ochtend-digest via Telegram: de taken die op datum staan
  // (vandaag of al te laat), opgesomd.
  try {
    if (telegramConfigured && telegramChatId) {
      const todayKey = todayKeyBrussels(now);

      const { data: tasks } = await admin
        .from("tasks")
        .select("title, due_on")
        .eq("user_id", ownerId)
        .is("deleted_at", null)
        .eq("done", false)
        .not("due_on", "is", null)
        .lte("due_on", todayKey)
        .order("due_on");

      taskCount = tasks?.length ?? 0;
      const lines: string[] = ["☀️ Goeiemorgen!"];
      if (taskCount === 0) {
        lines.push("", "Geen taken voor vandaag 🎉");
      } else {
        lines.push("", `📋 Vandaag (${taskCount}):`);
        for (const task of tasks ?? []) {
          const late = (task.due_on as string) < todayKey ? " — te laat" : "";
          lines.push(`• ${task.title}${late}`);
        }
      }
      await sendTelegramMessage(telegramChatId, lines.join("\n"));
    }
  } catch (error) {
    console.error("[cron] digest mislukt:", error);
  }

  // 1b) Wekelijkse herinnering (zondag) om de beleggingskoersen bij te werken.
  try {
    if (weekdayBrussels(now) === "Sun") {
      const { data: heldHoldings } = await admin
        .from("holdings")
        .select("id")
        .eq("user_id", ownerId)
        .limit(1);
      if (heldHoldings && heldHoldings.length > 0) {
        if (telegramConfigured && telegramChatId) {
          await sendTelegramMessage(
            telegramChatId,
            "📈 Het is zondag — vergeet je beleggingskoersen niet bij te werken in ONRAJ (Financiën).",
          );
        }
        await pushToAllDevices({
          title: "📈 Koersen bijwerken",
          body: "Het is zondag — werk je beleggingskoersen bij.",
          url: "/financien",
        });
      }
    }
  } catch (error) {
    console.error("[cron] koers-reminder mislukt:", error);
  }

  // 1c) Maandelijkse herinnering (1e van de maand) om de rekeningstanden bij te
  // werken, zodat het vermogen actueel blijft.
  try {
    if (todayKeyBrussels(now).slice(8, 10) === "01") {
      const { data: hasAccounts } = await admin
        .from("account_balances")
        .select("id")
        .eq("user_id", ownerId)
        .limit(1);
      if (hasAccounts && hasAccounts.length > 0) {
        if (telegramConfigured && telegramChatId) {
          await sendTelegramMessage(
            telegramChatId,
            "💼 Nieuwe maand — werk je rekeningstanden bij in ONRAJ (Financiën) zodat je vermogen klopt.",
          );
        }
        await pushToAllDevices({
          title: "💼 Vermogen bijwerken",
          body: "Nieuwe maand — werk je rekeningstanden bij.",
          url: "/financien",
        });
      }
    }
  } catch (error) {
    console.error("[cron] vermogen-reminder mislukt:", error);
  }

  // 1d) Abonnement-vervaldatum-reminders via Telegram (3 dagen vooraf).
  try {
    if (telegramConfigured && telegramChatId) {
      const inThreeDays = todayKeyBrussels(
        new Date(now.getTime() + 3 * 24 * 3600 * 1000),
      );
      const { data: dueSubs } = await admin
        .from("subscriptions")
        .select("name, amount, cycle, next_renewal")
        .eq("user_id", ownerId)
        .eq("active", true)
        .eq("next_renewal", inThreeDays);
      for (const sub of dueSubs ?? []) {
        const amount =
          typeof sub.amount === "string"
            ? Number.parseFloat(sub.amount)
            : sub.amount;
        await sendTelegramMessage(
          telegramChatId,
          `🔔 ${sub.name} verlengt op ${formatDate(sub.next_renewal)} — ${formatEuro(amount)} (${sub.cycle}).`,
        );
      }
    }
  } catch (error) {
    console.error("[cron] vervaldatum-reminder mislukt:", error);
  }

  // 1e) Verlopen vervaldatums automatisch doorschuiven naar de volgende cyclus,
  // zodat de reminders zonder onderhoud blijven werken.
  try {
    const todayKey = todayKeyBrussels(now);
    const { data: pastSubs } = await admin
      .from("subscriptions")
      .select("id, cycle, next_renewal")
      .eq("user_id", ownerId)
      .eq("active", true)
      .not("next_renewal", "is", null)
      .lt("next_renewal", todayKey);
    for (const sub of pastSubs ?? []) {
      const next = advanceRenewal(sub.next_renewal, sub.cycle, todayKey);
      await admin
        .from("subscriptions")
        .update({ next_renewal: next, updated_at: new Date().toISOString() })
        .eq("id", sub.id);
    }
  } catch (error) {
    console.error("[cron] vervaldatum-doorschuiven mislukt:", error);
  }

  // 2) Wekelijkse backup (zondag) als Telegram-document — buiten Supabase, en
  // zonder een tweede Vercel-cron (Hobby staat er maar één per dag toe).
  let backup: "verstuurd" | "gedeeltelijk" | "mislukt" | "overgeslagen" =
    "overgeslagen";
  try {
    if (telegramConfigured && telegramChatId && weekdayBrussels(now) === "Sun") {
      const result = await buildBackup(admin, ownerId, now);
      const ok = await sendTelegramDocument(
        telegramChatId,
        result.filename,
        result.contents,
        `🗄 Wekelijkse backup — ${result.filename}\n${result.summary}`,
      );
      // "gedeeltelijk": verstuurd, maar één of meer tabellen konden niet
      // gelezen worden (staat ook als ⚠️ in het Telegram-bijschrift).
      backup = ok
        ? result.failed.length > 0
          ? "gedeeltelijk"
          : "verstuurd"
        : "mislukt";
    }
  } catch (error) {
    console.error("[cron] backup mislukt:", error);
    backup = "mislukt";
  }

  // 3) Prullenbak opschonen: rijen die langer dan 30 dagen in de prullenbak
  // zitten, definitief weggooien (vault-bestanden van notities zijn al weg).
  const cutoff = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
  let purged = 0;
  try {
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
  } catch (error) {
    console.error("[cron] prullenbak-opschoning mislukt:", error);
  }

  return NextResponse.json({
    ok: true,
    taskCount,
    backup,
    purged,
  });
}
