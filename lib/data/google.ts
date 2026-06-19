import {
  fetchGoogleEvents,
  googleConfigured,
  refreshAccessToken,
} from "@/lib/google";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEvent } from "@/lib/types";

export const GOOGLE_EVENT_COLOR = "#4285F4";

/** True wanneer er een Google-koppeling (tokens) bestaat voor de gebruiker. */
export async function isGoogleConnected(): Promise<boolean> {
  if (!googleConfigured) return false;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("google_tokens")
    .select("user_id")
    .maybeSingle();
  if (error) return false;
  return !!data;
}

/**
 * Haalt Google Calendar-events op binnen een tijdvenster en levert ze als
 * read-only CalendarEvent (source "google"). Ververst het access-token indien
 * nodig. Faalt nooit hard — bij problemen geeft het een lege lijst terug.
 */
export async function getGoogleEvents(
  timeMin: string,
  timeMax: string,
): Promise<CalendarEvent[]> {
  if (!googleConfigured) return [];
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("google_tokens")
    .select("*")
    .maybeSingle();
  if (error || !row) return [];

  let accessToken = row.access_token as string;
  const expiryMs = row.expiry ? new Date(row.expiry).getTime() : 0;
  if (Date.now() > expiryMs - 60_000 && row.refresh_token) {
    try {
      const refreshed = await refreshAccessToken(row.refresh_token);
      accessToken = refreshed.access_token;
      const newExpiry = new Date(
        Date.now() + refreshed.expires_in * 1000,
      ).toISOString();
      await supabase
        .from("google_tokens")
        .update({ access_token: accessToken, expiry: newExpiry })
        .eq("user_id", row.user_id);
    } catch {
      return [];
    }
  }

  try {
    const events = await fetchGoogleEvents(accessToken, timeMin, timeMax);
    return events.map((event) => ({
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      allDay: event.allDay,
      location: event.location,
      notes: null,
      color: GOOGLE_EVENT_COLOR,
      createdAt: "",
      updatedAt: "",
      source: "google" as const,
      htmlLink: event.htmlLink,
    }));
  } catch {
    return [];
  }
}
