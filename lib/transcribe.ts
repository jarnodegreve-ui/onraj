import "server-only";

// Spraak→tekst via Groq Whisper (OpenAI-compatibele API). Groq heeft een
// royale gratis tier en is snel. Provider-agnostisch op te zetten via env:
// een ander OpenAI-compatibel endpoint kan met GROQ_BASE_URL/GROQ_WHISPER_MODEL.
const apiKey = process.env.GROQ_API_KEY ?? "";
const baseUrl = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
const model = process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo";
// Taal-hint verbetert de nauwkeurigheid. Leeg = automatisch detecteren.
const language = process.env.GROQ_WHISPER_LANGUAGE ?? "nl";

export const transcribeConfigured = Boolean(apiKey);

// Zet audio (bytes) om naar tekst. Geeft de tekst terug, of null bij een fout.
export async function transcribeAudio(
  bytes: ArrayBuffer,
  filename: string,
  mime: string,
): Promise<string | null> {
  if (!apiKey) return null;
  try {
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: mime }), filename);
    form.append("model", model);
    form.append("response_format", "json");
    if (language) form.append("language", language);

    const res = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) {
      console.error(
        "[transcribe] mislukt:",
        res.status,
        await res.text().catch(() => ""),
      );
      return null;
    }
    const data = (await res.json()) as { text?: string };
    return data.text?.trim() || null;
  } catch (error) {
    console.error("[transcribe] fout:", error);
    return null;
  }
}
