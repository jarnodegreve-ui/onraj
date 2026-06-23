import { randomUUID } from "crypto";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { toNote } from "@/lib/mappers";
import { secureEquals } from "@/lib/secure";
import {
  adminConfigured,
  createAdminClient,
  getOwnerUserId,
} from "@/lib/supabase/admin";
import { downloadTelegramFile, sendTelegramMessage } from "@/lib/telegram";
import { syncNoteFile } from "@/lib/vault-sync";

const allowedUserId = process.env.TELEGRAM_ALLOWED_USER_ID ?? "";
const secretToken = process.env.TELEGRAM_SECRET_TOKEN ?? "";

interface TgPhotoSize {
  file_id: string;
  file_size?: number;
}
interface TgMessage {
  text?: string;
  caption?: string;
  photo?: TgPhotoSize[];
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
  "📷 Stuur een foto → het wordt een taak (bijschrift /notitie = notitie).",
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
  const lines: string[] = [];

  // Rekeningstanden: het laatste bekende saldo per rekening.
  const { data: balances } = await admin
    .from("account_balances")
    .select("account, month, amount")
    .eq("user_id", ownerId);

  const latest = new Map<string, { month: string; amount: number }>();
  for (const row of balances ?? []) {
    const account = row.account as string;
    const month = row.month as string;
    const current = latest.get(account);
    if (!current || month > current.month) {
      latest.set(account, { month, amount: toNumber(row.amount) });
    }
  }

  if (latest.size > 0) {
    const sorted = [...latest.entries()].sort(
      (a, b) => b[1].amount - a[1].amount,
    );
    let total = 0;
    lines.push("🏦 Rekeningen");
    for (const [account, info] of sorted) {
      total += info.amount;
      lines.push(`• ${account}: ${euro(info.amount)}`);
    }
    lines.push(`Totaal: ${euro(total)}`);
  }

  // Maandoverzicht uit de transacties.
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

  if (lines.length > 0) lines.push("");
  lines.push(
    "💶 Deze maand",
    `Inkomsten: ${euro(inkomst)}`,
    `Uitgaven: ${euro(uitgave)}`,
    `Saldo: ${euro(inkomst - uitgave)}`,
  );

  return lines.join("\n");
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

// Foto → taak (standaard) of notitie (bijschrift /notitie), met de foto als
// bijlage. /taak forceert een taak. Bijschrift = titel/inhoud.
async function handlePhoto(
  admin: Admin,
  ownerId: string,
  fileId: string,
  caption: string,
) {
  const trimmed = caption.trim();
  let asNote = false;
  let body = trimmed;
  if (trimmed.startsWith("/")) {
    const space = trimmed.indexOf(" ");
    const cmd = (space === -1 ? trimmed : trimmed.slice(0, space))
      .slice(1)
      .split("@")[0]
      .toLowerCase();
    if (cmd === "notitie" || cmd === "note") {
      asNote = true;
      body = space === -1 ? "" : trimmed.slice(space + 1);
    } else if (cmd === "taak") {
      body = space === -1 ? "" : trimmed.slice(space + 1);
    }
    // Onbekend commando → laat het hele bijschrift als titel staan.
  }

  // 1) Entiteit aanmaken.
  let entityType: "task" | "note";
  let entityId: string;
  let label: string;
  if (asNote) {
    entityType = "note";
    const title = body.trim().split("\n")[0].slice(0, 80) || "Foto van Telegram";
    const { data, error } = await admin
      .from("notes")
      .insert({
        user_id: ownerId,
        title,
        body: body.trim(),
        tags: ["telegram"],
        pinned: false,
      })
      .select("*")
      .single();
    if (error || !data) return "Notitie aanmaken mislukt 😕";
    entityId = data.id as string;
    label = `Notitie met foto toegevoegd ✅\n"${title}"`;
    await syncNoteFile(toNote(data), null);
    revalidatePath("/notities");
    revalidatePath("/dashboard");
  } else {
    entityType = "task";
    const title = body.trim().slice(0, 200) || "Foto van Telegram";
    const { data, error } = await admin
      .from("tasks")
      .insert({ user_id: ownerId, title })
      .select("id")
      .single();
    if (error || !data) return "Taak aanmaken mislukt 😕";
    entityId = data.id as string;
    label = `Taak met foto toegevoegd ✅\n"${title}"`;
    revalidatePath("/taken");
    revalidatePath("/dashboard");
  }

  // 2) Foto downloaden en als bijlage opslaan.
  const file = await downloadTelegramFile(fileId);
  if (!file) return `${label}\n(De foto kon niet worden opgehaald.)`;

  const path = `${ownerId}/${entityType}/${randomUUID()}-telegram.${file.ext}`;
  const { error: uploadError } = await admin.storage
    .from("attachments")
    .upload(path, file.bytes, { contentType: file.mime, upsert: false });
  if (uploadError) return `${label}\n(De foto kon niet worden opgeslagen.)`;

  const { error: recordError } = await admin.from("attachments").insert({
    user_id: ownerId,
    entity_type: entityType,
    entity_id: entityId,
    path,
    name: `telegram.${file.ext}`,
    mime: file.mime,
    size: file.bytes.byteLength,
  });
  if (recordError) {
    return `${label}\n(De foto kon niet worden gekoppeld${entityType === "task" ? " — draai migratie 0017" : ""}.)`;
  }

  return label;
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
  const photos = message?.photo ?? [];

  if (!message || !chatId || String(fromId) !== String(allowedUserId)) {
    return NextResponse.json({ ok: true });
  }

  const hasPhoto = photos.length > 0;
  const hasText = !!text && !!text.trim();
  if (!hasPhoto && !hasText) {
    await sendTelegramMessage(chatId, "Ik kan tekst en foto's verwerken 📝📷");
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
    let reply: string;

    if (hasPhoto) {
      // Grootste variant = laatste in de array.
      const largest = photos[photos.length - 1];
      reply = await handlePhoto(
        admin,
        ownerId,
        largest.file_id,
        message.caption ?? "",
      );
    } else {
      const trimmed = (text ?? "").trim();
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
    }

    await sendTelegramMessage(chatId, reply);
  } catch (error) {
    console.error("[telegram] verwerking mislukt:", error);
    if (chatId) await sendTelegramMessage(chatId, "Er ging iets mis 😕");
  }

  return NextResponse.json({ ok: true });
}
