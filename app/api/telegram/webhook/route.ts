import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { toNote } from "@/lib/mappers";
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

// Telegram stuurt elk binnenkomend bericht hierheen. We maken er een notitie
// van (zonder sessie → via de service-role-client) en synchroniseren naar de
// vault. We antwoorden altijd met 200 zodat Telegram niet blijft herproberen.
export async function POST(request: Request) {
  // 1. Verifieer dat de call echt van Telegram komt.
  if (secretToken) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secretToken) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
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

  // 2. Enkel berichten van de eigenaar toelaten.
  if (!message || !chatId || String(fromId) !== String(allowedUserId)) {
    return NextResponse.json({ ok: true });
  }

  // 3. Voorlopig enkel tekst.
  if (!text || !text.trim()) {
    await sendTelegramMessage(
      chatId,
      "Ik kan voorlopig enkel tekst omzetten naar een notitie 📝",
    );
    return NextResponse.json({ ok: true });
  }

  if (!adminConfigured) {
    await sendTelegramMessage(chatId, "De koppeling is nog niet volledig ingesteld.");
    return NextResponse.json({ ok: true });
  }

  try {
    const ownerId = await getOwnerUserId();
    if (!ownerId) {
      await sendTelegramMessage(chatId, "Kon je ONRAJ-account niet vinden.");
      return NextResponse.json({ ok: true });
    }

    const trimmed = text.trim();
    const title = trimmed.split("\n")[0].slice(0, 80);

    const admin = createAdminClient();
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

    if (error) {
      console.error("[telegram] insert mislukt:", error);
      await sendTelegramMessage(chatId, "Opslaan mislukt 😕");
      return NextResponse.json({ ok: true });
    }

    // 4. Naar de vault syncen (GitHub → Obsidian).
    await syncNoteFile(toNote(data), null);
    revalidatePath("/notities");
    revalidatePath("/dashboard");

    await sendTelegramMessage(chatId, `Genoteerd ✅\n"${title}"`);
  } catch (error) {
    console.error("[telegram] verwerking mislukt:", error);
    if (chatId) await sendTelegramMessage(chatId, "Er ging iets mis 😕");
  }

  return NextResponse.json({ ok: true });
}
