import { randomUUID } from "crypto";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { buildBackup } from "@/lib/backup";
import {
  classifyCapture,
  classifyConfigured,
  type CaptureRoute,
} from "@/lib/classify";
import { isMissingColumn } from "@/lib/data/safe";
import { toNote } from "@/lib/mappers";
import { secureEquals } from "@/lib/secure";
import {
  adminConfigured,
  createAdminClient,
  getOwnerUserId,
} from "@/lib/supabase/admin";
import {
  downloadTelegramFile,
  sendTelegramDocument,
  sendTelegramMessage,
} from "@/lib/telegram";
import { transcribeAudio, transcribeConfigured } from "@/lib/transcribe";
import { syncNoteFile } from "@/lib/vault-sync";

const allowedUserId = process.env.TELEGRAM_ALLOWED_USER_ID ?? "";
const secretToken = process.env.TELEGRAM_SECRET_TOKEN ?? "";

interface TgPhotoSize {
  file_id: string;
  file_size?: number;
}
interface TgVoice {
  file_id: string;
  mime_type?: string;
  file_size?: number;
  duration?: number;
}
interface TgMessage {
  text?: string;
  caption?: string;
  photo?: TgPhotoSize[];
  voice?: TgVoice;
  audio?: TgVoice;
  chat?: { id: number };
  from?: { id: number };
}
interface TgUpdate {
  message?: TgMessage;
  edited_message?: TgMessage;
}

type Admin = ReturnType<typeof createAdminClient>;

// Captures via Telegram krijgen een inbox-vlag (slimme inbox). Vóór migratie
// 0020 vallen ze terug op een insert zonder die vlag.
async function insertCapturedTask(
  admin: Admin,
  ownerId: string,
  fields: Record<string, unknown>,
) {
  let result = await admin
    .from("tasks")
    .insert({ ...fields, user_id: ownerId, inbox: true })
    .select("id")
    .single();
  if (result.error && isMissingColumn(result.error)) {
    result = await admin
      .from("tasks")
      .insert({ ...fields, user_id: ownerId })
      .select("id")
      .single();
  }
  return result;
}

async function insertCapturedNote(
  admin: Admin,
  ownerId: string,
  fields: Record<string, unknown>,
) {
  let result = await admin
    .from("notes")
    .insert({ ...fields, user_id: ownerId, inbox: true })
    .select("*")
    .single();
  if (result.error && isMissingColumn(result.error)) {
    result = await admin
      .from("notes")
      .insert({ ...fields, user_id: ownerId })
      .select("*")
      .single();
  }
  return result;
}

const HELP = [
  "🤖 ONRAJ-bot",
  "",
  "Stuur tekst of spreek een memo in → ONRAJ sorteert het slim naar",
  "taak, notitie of uitgave/inkomst (bij twijfel een taak in je inbox).",
  "📷 Stuur een foto → het wordt een taak (bijschrift /notitie = notitie).",
  "Alles is in de inbox nog te corrigeren.",
  "",
  "Commando's:",
  "• /vandaag — taken & afspraken van vandaag",
  "• /komende — afspraken komende 7 dagen",
  "• /uitgave <bedrag> <tekst> — boek een uitgave (bv. /uitgave 40 tanken)",
  "• /inkomst <bedrag> <tekst> — boek een inkomst",
  "• /taak <tekst> — maak een taak",
  "• /notitie <tekst> — maak een notitie",
  "• /backup — stuur een backup van al je data",
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

async function handleVandaag(admin: Admin, ownerId: string) {
  const now = new Date();
  const today = brusselsToday(now);
  const in24h = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

  const { data: tasks } = await admin
    .from("tasks")
    .select("title, due_on")
    .eq("user_id", ownerId)
    .is("deleted_at", null)
    .eq("done", false)
    .not("due_on", "is", null)
    .lte("due_on", today)
    .order("due_on");

  const { data: events } = await admin
    .from("events")
    .select("title, starts_at, all_day")
    .eq("user_id", ownerId)
    .is("deleted_at", null)
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

// Parseert een bedrag uit tekst, robuust voor NL/BE-notatie: "40", "40,50",
// "1.234,56" en "1234.56". Geeft null bij een ongeldig of negatief bedrag.
function parseAmount(token: string): number | null {
  let t = token.trim();
  if (t.includes(".") && t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", "."); // 1.234,56 → 1234.56
  } else if (t.includes(",")) {
    t = t.replace(",", "."); // 40,50 → 40.50
  }
  const n = Number.parseFloat(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function createTransaction(
  admin: Admin,
  ownerId: string,
  direction: "inkomst" | "uitgave",
  args: string,
) {
  const verb = direction === "uitgave" ? "/uitgave" : "/inkomst";
  const parts = args.trim().split(/\s+/).filter(Boolean);
  const amount = parts.length ? parseAmount(parts[0]) : null;
  const description = parts.slice(1).join(" ").trim().slice(0, 200);
  if (amount === null) {
    return `Gebruik: ${verb} <bedrag> <omschrijving>\nBv. ${verb} 40 tanken`;
  }
  const { error } = await admin.from("transactions").insert({
    user_id: ownerId,
    occurred_on: brusselsToday(new Date()),
    amount,
    direction,
    category: "",
    description,
  });
  if (error) return "Transactie opslaan mislukt 😕";
  revalidatePath("/financien");
  revalidatePath("/dashboard");
  const emoji = direction === "uitgave" ? "💸" : "💰";
  const label = direction === "uitgave" ? "Uitgave" : "Inkomst";
  return `${emoji} ${label} genoteerd: ${euro(amount)}${description ? ` — ${description}` : ""}`;
}

async function handleKomende(admin: Admin, ownerId: string) {
  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString();
  const { data: events } = await admin
    .from("events")
    .select("title, starts_at, all_day, location")
    .eq("user_id", ownerId)
    .is("deleted_at", null)
    .gte("starts_at", now.toISOString())
    .lte("starts_at", in7d)
    .order("starts_at");

  if (!events || events.length === 0) {
    return "Geen afspraken de komende 7 dagen 🌴";
  }
  const fmtDay = (iso: string) =>
    new Intl.DateTimeFormat("nl-BE", {
      timeZone: "Europe/Brussels",
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date(iso));

  const lines: string[] = ["🗓 Komende 7 dagen"];
  for (const event of events) {
    const day = fmtDay(event.starts_at as string);
    const when = event.all_day
      ? day
      : `${day} ${fmtTime(event.starts_at as string)}`;
    const loc = event.location ? ` (${event.location})` : "";
    lines.push(`• ${when} — ${event.title}${loc}`);
  }
  return lines.join("\n");
}

function brusselsWeekday(now: Date) {
  return new Intl.DateTimeFormat("nl-BE", {
    timeZone: "Europe/Brussels",
    weekday: "long",
  }).format(now);
}

function formatDayNl(isoDate: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    timeZone: "Europe/Brussels",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${isoDate}T12:00:00`));
}

// Boek een uitgave/inkomst uit een slim-geclassificeerde capture.
async function bookTransaction(
  admin: Admin,
  ownerId: string,
  direction: "inkomst" | "uitgave",
  amount: number,
  description: string,
  category: string | null,
) {
  const { error } = await admin.from("transactions").insert({
    user_id: ownerId,
    occurred_on: brusselsToday(new Date()),
    amount,
    direction,
    category: category ?? "",
    description: description.slice(0, 200),
  });
  if (error) return "Transactie opslaan mislukt 😕";
  revalidatePath("/financien");
  revalidatePath("/dashboard");
  const emoji = direction === "uitgave" ? "💸" : "💰";
  const label = direction === "uitgave" ? "Uitgave" : "Inkomst";
  const cat = category ? ` · ${category}` : "";
  return `${emoji} ${label} genoteerd: ${euro(amount)} — ${description}${cat}\n(Aanpasbaar in Financiën.)`;
}

// Taak uit een slim-geclassificeerde capture (met optionele deadline/prioriteit).
async function createTaskRouted(
  admin: Admin,
  ownerId: string,
  route: CaptureRoute,
) {
  const fields: Record<string, unknown> = { title: route.title.slice(0, 200) };
  if (route.dueOn) fields.due_on = route.dueOn;
  if (route.priority) fields.priority = route.priority;
  const { error } = await insertCapturedTask(admin, ownerId, fields);
  if (error) return "Taak opslaan mislukt 😕";
  revalidatePath("/taken");
  revalidatePath("/dashboard");
  const deadline = route.dueOn
    ? `\n📅 Deadline: ${formatDayNl(route.dueOn)}`
    : "";
  return `Genoteerd als taak ✅\n"${route.title}"${deadline}`;
}

// Slimme routering: classificeer de capture (taak/notitie/uitgave/inkomst) via
// Claude Haiku en stuur ze naar de juiste plek. Zonder classifier of bij
// twijfel → taak in de inbox (robuuste fallback).
async function routeCapture(admin: Admin, ownerId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "Stuur wat tekst om iets te noteren.";

  if (classifyConfigured) {
    const now = new Date();
    const route = await classifyCapture(
      trimmed,
      brusselsToday(now),
      brusselsWeekday(now),
    );
    if (route) {
      if (
        (route.kind === "uitgave" || route.kind === "inkomst") &&
        route.amount !== null
      ) {
        return bookTransaction(
          admin,
          ownerId,
          route.kind,
          route.amount,
          route.title,
          route.category,
        );
      }
      if (route.kind === "notitie") {
        return createNoteFromText(admin, ownerId, trimmed);
      }
      return createTaskRouted(admin, ownerId, route);
    }
  }
  return createTaskFromText(admin, ownerId, trimmed);
}

// Spraakboodschap → transcriptie → slimme routering. Claude doet geen audio,
// dus de transcriptie loopt via Groq Whisper (zie lib/transcribe.ts).
async function handleVoice(admin: Admin, ownerId: string, voice: TgVoice) {
  if (!transcribeConfigured) {
    return "Spraak-transcriptie is nog niet ingesteld (GROQ_API_KEY ontbreekt).";
  }
  const file = await downloadTelegramFile(voice.file_id);
  if (!file) return "Kon de spraakboodschap niet ophalen 😕";

  const text = await transcribeAudio(
    file.bytes,
    `voice.${file.ext}`,
    voice.mime_type || file.mime,
  );
  if (!text) return "Kon de spraakboodschap niet omzetten naar tekst 😕";

  // Toon wat er gehoord werd (transcriptie kan fouten bevatten) + de routering.
  const reply = await routeCapture(admin, ownerId, text);
  return `🎙️ "${text.slice(0, 140)}"\n\n${reply}`;
}

async function handleBackup(
  admin: Admin,
  ownerId: string,
  chatId: number | string,
) {
  const backup = await buildBackup(admin, ownerId, new Date());
  const ok = await sendTelegramDocument(
    chatId,
    backup.filename,
    backup.contents,
    `🗄 ${backup.filename}\n${backup.summary}`,
  );
  return ok ? "Backup verstuurd ✅" : "Backup versturen mislukt 😕";
}

async function createTask(admin: Admin, ownerId: string, title: string) {
  const clean = title.trim().slice(0, 200);
  if (!clean) return "Gebruik: /taak <omschrijving>";
  const { error } = await insertCapturedTask(admin, ownerId, { title: clean });
  if (error) return "Taak opslaan mislukt 😕";
  revalidatePath("/taken");
  revalidatePath("/dashboard");
  return `Taak toegevoegd ✅\n"${clean}"`;
}

// Platte tekst (zonder commando) → taak in de inbox. Meestal zijn snelle
// captures taken; je kan ze in de inbox altijd omzetten naar een notitie.
// Eerste regel = titel; eventuele rest belandt in de notitie-omschrijving.
async function createTaskFromText(admin: Admin, ownerId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "Stuur wat tekst om een taak te maken.";
  const lines = trimmed.split("\n");
  const title = lines[0].slice(0, 200);
  const rest = lines.slice(1).join("\n").trim();
  const fields: Record<string, unknown> = { title };
  if (rest) fields.notes = rest.slice(0, 2000);
  const { error } = await insertCapturedTask(admin, ownerId, fields);
  if (error) return "Taak opslaan mislukt 😕";
  revalidatePath("/taken");
  revalidatePath("/dashboard");
  return `Genoteerd als taak ✅\n"${title}"`;
}

async function createNoteFromText(admin: Admin, ownerId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "Gebruik: /notitie <tekst>";
  const title = trimmed.split("\n")[0].slice(0, 80);
  const { data, error } = await insertCapturedNote(admin, ownerId, {
    title,
    body: trimmed,
    tags: ["telegram"],
    pinned: false,
  });
  if (error || !data) return "Opslaan mislukt 😕";
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
    const { data, error } = await insertCapturedNote(admin, ownerId, {
      title,
      body: body.trim(),
      tags: ["telegram"],
      pinned: false,
    });
    if (error || !data) return "Notitie aanmaken mislukt 😕";
    entityId = data.id as string;
    label = `Notitie met foto toegevoegd ✅\n"${title}"`;
    await syncNoteFile(toNote(data), null);
    revalidatePath("/notities");
    revalidatePath("/dashboard");
  } else {
    entityType = "task";
    const title = body.trim().slice(0, 200) || "Foto van Telegram";
    const { data, error } = await insertCapturedTask(admin, ownerId, { title });
    if (error || !data) return "Taak aanmaken mislukt 😕";
    entityId = data.id as string;
    label = `Taak met foto toegevoegd ✅\n"${title}"`;
    revalidatePath("/taken");
    revalidatePath("/dashboard");
  }

  // 2) Foto downloaden en als bijlage opslaan.
  const file = await downloadTelegramFile(fileId);
  if (!file) {
    console.error("[telegram] foto-download mislukt voor file_id", fileId);
    return `${label}\n(De foto kon niet worden opgehaald.)`;
  }

  const path = `${ownerId}/${entityType}/${randomUUID()}-telegram.${file.ext}`;
  // Buffer (niet de rauwe ArrayBuffer): supabase-js schrijft die server-side
  // betrouwbaar weg met de juiste grootte.
  const { error: uploadError } = await admin.storage
    .from("attachments")
    .upload(path, Buffer.from(file.bytes), {
      contentType: file.mime,
      upsert: false,
    });
  if (uploadError) {
    console.error("[telegram] foto-upload mislukt:", uploadError);
    return `${label}\n(De foto kon niet worden opgeslagen.)`;
  }

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
    console.error("[telegram] bijlage-record mislukt:", recordError);
    return `${label}\n(De foto kon niet worden gekoppeld${entityType === "task" ? " — draai migratie 0017" : ""}.)`;
  }

  return label;
}

// Telegram stuurt elk binnenkomend bericht hierheen. Tekst zonder commando wordt
// slim gerouteerd (taak/notitie/uitgave via Haiku, fallback taak); commando's
// (/vandaag, /komende, /taak, /notitie) doen het werk via de service-role-
// client. We antwoorden altijd met 200 (geen retries).
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
  const voice = message?.voice ?? message?.audio;

  if (!message || !chatId || String(fromId) !== String(allowedUserId)) {
    return NextResponse.json({ ok: true });
  }

  const hasPhoto = photos.length > 0;
  const hasText = !!text && !!text.trim();
  const hasVoice = !!voice;
  if (!hasPhoto && !hasText && !hasVoice) {
    await sendTelegramMessage(
      chatId,
      "Ik kan tekst, foto's en spraak verwerken 📝📷🎙️",
    );
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
    } else if (voice) {
      reply = await handleVoice(admin, ownerId, voice);
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
        else if (cmd === "komende") reply = await handleKomende(admin, ownerId);
        else if (cmd === "uitgave" || cmd === "kost")
          reply = await createTransaction(admin, ownerId, "uitgave", args);
        else if (cmd === "inkomst")
          reply = await createTransaction(admin, ownerId, "inkomst", args);
        else if (cmd === "taak") reply = await createTask(admin, ownerId, args);
        else if (cmd === "notitie" || cmd === "note")
          reply = await createNoteFromText(admin, ownerId, args);
        else if (cmd === "backup")
          reply = await handleBackup(admin, ownerId, chatId);
        else reply = "Onbekend commando. Stuur /help voor de opties.";
      } else {
        reply = await routeCapture(admin, ownerId, trimmed);
      }
    }

    await sendTelegramMessage(chatId, reply);
  } catch (error) {
    console.error("[telegram] verwerking mislukt:", error);
    if (chatId) await sendTelegramMessage(chatId, "Er ging iets mis 😕");
  }

  return NextResponse.json({ ok: true });
}
