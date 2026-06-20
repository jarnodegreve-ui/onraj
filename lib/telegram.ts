// Minimale Telegram Bot-API helper (rauwe fetch, geen SDK).

const API_BASE = "https://api.telegram.org";
const token = process.env.TELEGRAM_BOT_TOKEN ?? "";

export const telegramConfigured = Boolean(token);

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
