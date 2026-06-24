import "server-only";

// Minimale Telegram Bot-API helper (rauwe fetch, geen SDK).

const API_BASE = "https://api.telegram.org";
const token = process.env.TELEGRAM_BOT_TOKEN ?? "";

export const telegramConfigured = Boolean(token);

// Haalt een bestand (foto) op via de Bot-API: getFile + download. Geeft de bytes
// + afgeleide mime/naam terug, of null bij een fout.
export async function downloadTelegramFile(
  fileId: string,
): Promise<{ bytes: ArrayBuffer; mime: string; ext: string } | null> {
  if (!telegramConfigured) return null;
  try {
    const infoRes = await fetch(
      `${API_BASE}/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
    );
    if (!infoRes.ok) return null;
    const info = (await infoRes.json()) as { result?: { file_path?: string } };
    const filePath = info.result?.file_path;
    if (!filePath) return null;

    const fileRes = await fetch(`${API_BASE}/file/bot${token}/${filePath}`);
    if (!fileRes.ok) return null;
    const bytes = await fileRes.arrayBuffer();

    const ext = (filePath.split(".").pop() ?? "jpg").toLowerCase();
    const MIME: Record<string, string> = {
      png: "image/png",
      webp: "image/webp",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
    };
    const mime = MIME[ext] ?? "image/jpeg";
    return { bytes, mime, ext: ext === "jpeg" ? "jpg" : ext };
  } catch (error) {
    console.error("[telegram] downloadFile mislukt:", error);
    return null;
  }
}

// Registreert de zichtbare commando-lijst (de Menu-knop / "/"-suggesties in
// Telegram). Eenmalig nodig — Telegram toont commando's pas na setMyCommands.
export async function setTelegramCommands(
  commands: { command: string; description: string }[],
): Promise<boolean> {
  if (!telegramConfigured) return false;
  try {
    const res = await fetch(`${API_BASE}/bot${token}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
    } | null;
    return res.ok && data?.ok === true;
  } catch (error) {
    console.error("[telegram] setMyCommands mislukt:", error);
    return false;
  }
}

// Stuurt een bericht terug naar de chat (bevestiging). Best-effort.
export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
) {
  if (!telegramConfigured) return;
  try {
    await fetch(`${API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (error) {
    console.error("[telegram] sendMessage mislukt:", error);
  }
}

// Stuurt een bestand (document) naar de chat — gebruikt voor backups die zo
// buiten Supabase belanden. Geeft true bij succes. Best-effort.
export async function sendTelegramDocument(
  chatId: number | string,
  filename: string,
  contents: string,
  caption?: string,
): Promise<boolean> {
  if (!telegramConfigured) return false;
  try {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    if (caption) form.append("caption", caption);
    form.append(
      "document",
      new Blob([contents], { type: "application/json" }),
      filename,
    );
    const res = await fetch(`${API_BASE}/bot${token}/sendDocument`, {
      method: "POST",
      body: form,
    });
    return res.ok;
  } catch (error) {
    console.error("[telegram] sendDocument mislukt:", error);
    return false;
  }
}
