import { randomUUID } from "crypto";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { buildBackup } from "@/lib/backup";
import { isMissingColumn } from "@/lib/data/safe";
import { pinMatches } from "@/lib/finance-lock";
import { toNote } from "@/lib/mappers";
import { shiftMonth } from "@/lib/month";
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
  setTelegramCommands,
} from "@/lib/telegram";
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
  "Stuur gewoon tekst → het wordt een taak (in je inbox).",
  "📷 Stuur een foto → het wordt een taak (bijschrift /notitie = notitie).",
  "",
  "Commando's:",
  "• /vandaag — taken voor vandaag (& te laat)",
  "• /saldo — saldo deze maand 🔒",
  "• /abonnementen — maand-/jaartotaal 🔒",
  "• /koers <ticker> <prijs> — koers bijwerken 🔒 (bv. /koers VWCE 92,50)",
  "• /uitgave <bedrag> <tekst> — boek een uitgave (bv. /uitgave 40 tanken)",
  "• /inkomst <bedrag> <tekst> — boek een inkomst",
  "• /taak <tekst> — maak een taak",
  "• /notitie <tekst> — maak een notitie",
  "• /backup — stuur een backup van al je data",
  "• /setup — toon de commando's in het Telegram-menu",
  "• /help — deze hulp",
  "",
  "🔒 = vereist je finance-PIN als die is ingesteld, bv. /saldo 1234",
].join("\n");

// De zichtbare commando-lijst (Menu-knop / "/"-suggesties). Geregistreerd via
// /setup. /setup zelf staat er bewust niet in (eenmalige actie).
const BOT_COMMANDS = [
  { command: "vandaag", description: "Taken voor vandaag" },
  { command: "saldo", description: "Saldo deze maand (PIN)" },
  { command: "abonnementen", description: "Abonnementen-totaal (PIN)" },
  { command: "koers", description: "Koers bijwerken, bv. VWCE 92,50 (PIN)" },
  { command: "uitgave", description: "Boek een uitgave (bv. 40 tanken)" },
  { command: "inkomst", description: "Boek een inkomst (bv. 2400 loon)" },
  { command: "taak", description: "Maak een taak" },
  { command: "notitie", description: "Maak een notitie" },
  { command: "backup", description: "Stuur een backup van je data" },
  { command: "help", description: "Toon de hulp" },
];

function brusselsToday(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Brussels",
  }).format(now);
}

function euro(n: number) {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

async function handleVandaag(admin: Admin, ownerId: string) {
  const today = brusselsToday(new Date());

  const { data: tasks } = await admin
    .from("tasks")
    .select("title, due_on")
    .eq("user_id", ownerId)
    .is("deleted_at", null)
    .eq("done", false)
    .not("due_on", "is", null)
    .lte("due_on", today)
    .order("due_on");

  if (!tasks || tasks.length === 0) {
    return "📋 Vandaag\n\nGeen taken voor vandaag 🎉";
  }
  const lines: string[] = ["📋 Vandaag", "", `✅ Taken (${tasks.length}):`];
  for (const task of tasks) {
    const late = (task.due_on as string) < today ? " — te laat" : "";
    lines.push(`• ${task.title}${late}`);
  }
  return lines.join("\n");
}

// ── PIN-slot voor financiële commando's (hergebruikt de finance-PIN) ─────────
async function financePinHash(
  admin: Admin,
  ownerId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from("app_settings")
    .select("finance_pin_hash")
    .eq("user_id", ownerId)
    .maybeSingle();
  if (error) return null;
  return (data?.finance_pin_hash as string | null) ?? null;
}

// Geeft een foutmelding terug als geblokkeerd, of null als toegang OK is.
function pinGate(
  hash: string | null,
  pin: string | null,
  ownerId: string,
): string | null {
  if (!hash) return null; // geen PIN ingesteld → geen slot
  if (!pin) return "🔒 PIN vereist — voeg je finance-PIN toe, bv. /saldo 1234";
  if (!pinMatches(pin, ownerId, hash)) return "🔒 Onjuiste PIN.";
  return null;
}

async function handleSaldo(admin: Admin, ownerId: string) {
  const month = brusselsToday(new Date()).slice(0, 7); // YYYY-MM
  // Maandgrens via "< volgende maand" — `${month}-31` bestaat niet in elke
  // maand en is fragiel als datumvergelijking.
  const { data: txs } = await admin
    .from("transactions")
    .select("amount, direction")
    .eq("user_id", ownerId)
    .is("deleted_at", null)
    .gte("occurred_on", `${month}-01`)
    .lt("occurred_on", `${shiftMonth(month, 1)}-01`);

  let inkomsten = 0;
  let uitgaven = 0;
  for (const tx of txs ?? []) {
    const amt =
      typeof tx.amount === "string" ? Number.parseFloat(tx.amount) : tx.amount;
    if (tx.direction === "inkomst") inkomsten += amt;
    else uitgaven += amt;
  }
  return [
    "💰 Saldo deze maand",
    "",
    `Inkomsten: ${euro(inkomsten)}`,
    `Uitgaven: ${euro(uitgaven)}`,
    `Saldo: ${euro(inkomsten - uitgaven)}`,
  ].join("\n");
}

async function handleAbonnementen(admin: Admin, ownerId: string) {
  const { data: subs } = await admin
    .from("subscriptions")
    .select("name, amount, cycle")
    .eq("user_id", ownerId)
    .eq("active", true)
    .order("name");

  if (!subs || subs.length === 0) return "🔁 Geen actieve abonnementen.";

  let perMonth = 0;
  const lines: string[] = ["🔁 Abonnementen", ""];
  for (const sub of subs) {
    const amt =
      typeof sub.amount === "string"
        ? Number.parseFloat(sub.amount)
        : sub.amount;
    perMonth += sub.cycle === "jaarlijks" ? amt / 12 : amt;
    lines.push(
      `• ${sub.name} — ${euro(amt)}/${sub.cycle === "jaarlijks" ? "jaar" : "maand"}`,
    );
  }
  lines.push(
    "",
    `Totaal: ${euro(perMonth)}/maand · ${euro(perMonth * 12)}/jaar`,
  );
  return lines.join("\n");
}

async function handleKoers(
  admin: Admin,
  ownerId: string,
  query: string,
  price: number,
) {
  const { data: holdings } = await admin
    .from("holdings")
    .select("id, name, ticker, quantity")
    .eq("user_id", ownerId);
  if (!holdings || holdings.length === 0) return "Geen beleggingen gevonden.";

  const q = query.toLowerCase();
  const match =
    holdings.find((h) => (h.ticker ?? "").toLowerCase() === q) ??
    holdings.find((h) => (h.name ?? "").toLowerCase() === q) ??
    holdings.find(
      (h) =>
        (h.name ?? "").toLowerCase().includes(q) ||
        (h.ticker ?? "").toLowerCase().includes(q),
    );
  if (!match) return `Geen belegging gevonden voor "${query}".`;

  const { error } = await admin.from("holding_prices").upsert(
    {
      user_id: ownerId,
      holding_id: match.id,
      price,
      recorded_on: brusselsToday(new Date()),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,holding_id,recorded_on" },
  );
  if (error) return "Koers opslaan mislukt 😕";
  revalidatePath("/financien");
  revalidatePath("/dashboard");

  const qty =
    typeof match.quantity === "string"
      ? Number.parseFloat(match.quantity)
      : match.quantity;
  return `📈 ${match.name}${match.ticker ? ` (${match.ticker})` : ""}: ${euro(price)}\nWaarde positie: ${euro(qty * price)}`;
}

// Parseert een bedrag uit tekst, robuust voor NL/BE-notatie: "40", "40,50",
// "1.234,56" en "1234.56". Zelfde regels als de web-invoer (zod): strikt
// positief, met een sanity-bovengrens tegen tikfouten. Geeft null bij ongeldig.
function parseAmount(token: string): number | null {
  let t = token.trim();
  if (t.includes(".") && t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", "."); // 1.234,56 → 1234.56
  } else if (t.includes(",")) {
    t = t.replace(",", "."); // 40,50 → 40.50
  }
  const n = Number.parseFloat(t);
  return Number.isFinite(n) && n > 0 && n <= 1_000_000 ? n : null;
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

// Registreert de commando-lijst zodat /uitgave, /inkomst … in het Telegram-menu
// verschijnen. Veilig: enkel de toegelaten gebruiker bereikt de webhook.
async function handleSetupMenu() {
  const ok = await setTelegramCommands(BOT_COMMANDS);
  if (!ok) return "Menu instellen mislukt 😕";
  return [
    "✅ Menu ingesteld.",
    "Je ziet nu /uitgave, /inkomst en de andere commando's bij de Menu-knop",
    "(of als je '/' typt). Heropen eventueel de chat als ze nog niet tonen.",
  ].join("\n");
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
// een taak in de inbox; commando's (/vandaag, /komende, /taak, /notitie) doen
// het werk via de service-role-client. We antwoorden altijd met 200 (geen
// retries).
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
        else if (cmd === "saldo") {
          const hash = await financePinHash(admin, ownerId);
          reply =
            pinGate(hash, args.trim() || null, ownerId) ??
            (await handleSaldo(admin, ownerId));
        } else if (cmd === "abonnementen" || cmd === "abos") {
          const hash = await financePinHash(admin, ownerId);
          reply =
            pinGate(hash, args.trim() || null, ownerId) ??
            (await handleAbonnementen(admin, ownerId));
        } else if (cmd === "koers" || cmd === "prijs") {
          const hash = await financePinHash(admin, ownerId);
          const tokens = args.trim().split(/\s+/).filter(Boolean);
          const pin = hash ? (tokens.pop() ?? null) : null;
          const priceToken = tokens.pop();
          const query = tokens.join(" ");
          const block = pinGate(hash, pin, ownerId);
          if (block) reply = block;
          else {
            const price = priceToken ? parseAmount(priceToken) : null;
            if (!query || price === null)
              reply = `Gebruik: /koers <ticker> <prijs>${hash ? " <pin>" : ""}\nBv. /koers VWCE 92,50${hash ? " 1234" : ""}`;
            else reply = await handleKoers(admin, ownerId, query, price);
          }
        } else if (cmd === "uitgave" || cmd === "kost")
          reply = await createTransaction(admin, ownerId, "uitgave", args);
        else if (cmd === "inkomst")
          reply = await createTransaction(admin, ownerId, "inkomst", args);
        else if (cmd === "taak") reply = await createTask(admin, ownerId, args);
        else if (cmd === "notitie" || cmd === "note")
          reply = await createNoteFromText(admin, ownerId, args);
        else if (cmd === "backup")
          reply = await handleBackup(admin, ownerId, chatId);
        else if (cmd === "setup" || cmd === "menu")
          reply = await handleSetupMenu();
        else reply = "Onbekend commando. Stuur /help voor de opties.";
      } else {
        reply = await createTaskFromText(admin, ownerId, trimmed);
      }
    }

    await sendTelegramMessage(chatId, reply);
  } catch (error) {
    console.error("[telegram] verwerking mislukt:", error);
    if (chatId) await sendTelegramMessage(chatId, "Er ging iets mis 😕");
  }

  return NextResponse.json({ ok: true });
}
