import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { toNote } from "@/lib/mappers";
import { secureEquals } from "@/lib/secure";
import {
  adminConfigured,
  createAdminClient,
  getOwnerUserId,
} from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram";
import { syncNoteFile } from "@/lib/vault-sync";

const allowedUserId = process.env.TELEGRAM_ALLOWED_USER_ID ?? "";
const secretToken = process.env.TELEGRAM_SECRET_TOKEN ?? "";

interface TgMessage {
  text?: string;
  chat?: { id: number };
  from?: { id: number };
}
interface TgUpdate {
  message?: TgMessage;
  edited_message?: TgMessage;
}

type Admin = ReturnType<typeof createAdminClient>;

const HELP = [
  "🤖 ONRAJ-bot",
  "",
  "Stuur gewoon tekst → het wordt een notitie.",
  "",
  "Of gebruik een commando:",
  "• /vandaag — taken & afspraken van vandaag",
  "• /saldo — saldo deze maand",
  "• /taak <tekst> — maak een taak",
  "• /notitie <tekst> — maak een notitie",
  "• /help — deze hulp",
].join("\n");

function brusselsToday(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
  }).format(now);
}

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    timeZone: "Europe/Brussels",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function euro(n: number) {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

function toNumber(value: number | string) {
  return typeof value === "string" ? Number.parseFloat(value) : value;
}

async function handleVandaag(admin: Admin, ownerId: string) {
  const now = new Date();
  const today = brusselsToday(now);
  const in24h = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

  const { data: tasks } = await admin
    .from("tasks")
    .select("title, due_on")
    .eq("user_id", ownerId)
    .eq("done", false)
    .not("due_on", "is", null)
    .lte("due_on", today)
    .order("due_on");

  const { data: events } = await admin
    .from("events")
    .select("title, starts_at, all_day")
    .eq("user_id", ownerId)
    .gte("starts_at", now.toISOString())
    .lte("starts_at", in24h)
    .order("starts_at");

  const lines: string[] = ["📋 Vandaag"];
  if (tasks && tasks.length > 0) {
    lines.push("", `✅ Taken (${tasks.length}):`);
    for (const task of tasks) {
      const late = (task.due_on as string) < today ? " — te laat" : "";
      lines.push(`• ${task.title}${late}`);
    }
  }
  if (events && events.length > 0) {
    lines.push("", `🗓 Afspraken (komende 24u, ${events.length}):`);
    for (const event of events) {
      const when = event.all_day ? "hele dag" : fmtTime(event.starts_at as string);
      lines.push(`• ${when} — ${event.title}`);
    }
  }
  if ((!tasks || tasks.length === 0) && (!events || events.length === 0)) {
    lines.push("", "Niets op de planning 🎉");
  }
  return lines.join("\n");
}

async function handleSaldo(admin: Admin, ownerId: string) {
  const monthKey = brusselsToday(new Date()).slice(0, 7); // YYYY-MM
  const [year, month] = monthKey.split("-").map(Number);
  const start = `${monthKey}-01`;
  const next =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const { data } = await admin
    .from("transactions")
    .select("amount, direction")
    .eq("user_id", ownerId)
    .gte("occurred_on", start)
    .lt("occurred_on", next);

  let inkomst = 0;
  let uitgave = 0;
  for (const row of data ?? []) {
    const amount = toNumber(row.amount);
    if (row.direction === "inkomst") inkomst += amount;
    else uitgave += amount;
  }

  return [
    "💶 Deze maand",
    `Inkomsten: ${euro(inkomst)}`,
    `Uitgaven: ${euro(uitgave)}`,
    `Saldo: ${euro(inkomst - uitgave)}`,
  ].join("\n");
}

async function createTask(admin: Admin, ownerId: string, title: string) {
  const clean = title.trim().slice(0, 200);
  if (!clean) return "Gebruik: /taak <omschrijving>";
  const { error } = await admin
    .from("tasks")
    .insert({ user_id: ownerId, title: clean });
  if (error) return "Taak opslaan mislukt 😕";
  revalidatePath("/taken");
  revalidatePath("/dashboard");
  return `Taak toegevoegd ✅\n"${clean}"`;
}

async function createNoteFromText(admin: Admin, ownerId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "Gebruik: /notitie <tekst>";
  const title = trimmed.split("\n")[0].slice(0, 80);
  const { data, error } = await admin
    .from("notes")
    .insert({
      user_id: ownerId,
      title,
      body: trimmed,
      tags: ["telegram"],
      pinned: false,
    })
    .select("*")
    .single();
  if (error) return "Opslaan mislukt 😕";
  await syncNoteFile(toNote(data), null);
  revalidatePath("/notities");
  revalidatePath("/dashboard");
  return `Genoteerd ✅\n"${title}"`;
}

// Telegram stuurt elk binnenkomend bericht hierheen. Tekst zonder commando wordt
// een notitie; commando's (/vandaag, /saldo, /taak, /notitie) doen het werk via
// de service-role-client. We antwoorden altijd met 200 (geen retries).
export async function POST(request: Request) {
  // Fail-closed: zonder geconfigureerd secret-token wordt de webhook geweigerd
  // (de afzender-id in het bericht is niet geheim en mag geen poortwachter zijn).
  const header = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!secretToken || !secureEquals(header, secretToken)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = (await request.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update.message ?? update.edited_message;
  const chatId = message?.chat?.id;
  const fromId = message?.from?.id;
  const text = message?.text;

  if (!message || !chatId || String(fromId) !== String(allowedUserId)) {
    return NextResponse.json({ ok: true });
  }

  if (!text || !text.trim()) {
    await sendTelegramMessage(chatId, "Ik kan voorlopig enkel tekst verwerken 📝");
    return NextResponse.json({ ok: true });
  }

  if (!adminConfigured) {
    await sendTelegramMessage(
      chatId,
      "De koppeling is nog niet volledig ingesteld.",
    );
    return NextResponse.json({ ok: true });
  }

  try {
    const ownerId = await getOwnerUserId();
    if (!ownerId) {
      await sendTelegramMessage(chatId, "Kon je ONRAJ-account niet vinden.");
      return NextResponse.json({ ok: true });
    }

    const admin = createAdminClient();
    const trimmed = text.trim();
    let reply: string;

    if (trimmed.startsWith("/")) {
      const space = trimmed.indexOf(" ");
      const cmd = (space === -1 ? trimmed : trimmed.slice(0, space))
        .slice(1)
        .split("@")[0]
        .toLowerCase();
      const args = space === -1 ? "" : trimmed.slice(space + 1);

      if (cmd === "start" || cmd === "help") reply = HELP;
      else if (cmd === "vandaag" || cmd === "today")
        reply = await handleVandaag(admin, ownerId);
      else if (cmd === "saldo") reply = await handleSaldo(admin, ownerId);
      else if (cmd === "taak") reply = await createTask(admin, ownerId, args);
      else if (cmd === "notitie" || cmd === "note")
        reply = await createNoteFromText(admin, ownerId, args);
      else reply = "Onbekend commando. Stuur /help voor de opties.";
    } else {
      reply = await createNoteFromText(admin, ownerId, trimmed);
    }

    await sendTelegramMessage(chatId, reply);
  } catch (error) {
    console.error("[telegram] verwerking mislukt:", error);
    if (chatId) await sendTelegramMessage(chatId, "Er ging iets mis 😕");
  }

  return NextResponse.json({ ok: true });
}
