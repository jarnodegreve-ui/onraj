import {
  fetchCalendarList,
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
 * Geeft een geldig access-token terug (ververst indien nodig) of null wanneer
 * er geen (werkende) koppeling is.
 */
export async function getValidGoogleAccessToken(): Promise<string | null> {
  if (!googleConfigured) return null;
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("google_tokens")
    .select("*")
    .maybeSingle();
  if (error || !row) return null;

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
      return null;
    }
  }
  return accessToken;
}

/**
 * Haalt Google Calendar-events op binnen een tijdvenster en levert ze als
 * read-only CalendarEvent (source "google"). Faalt nooit hard.
 */
export async function getGoogleEvents(
  timeMin: string,
  timeMax: string,
): Promise<CalendarEvent[]> {
  const accessToken = await getValidGoogleAccessToken();
  if (!accessToken) return [];

  try {
    const calendars = await fetchCalendarList(accessToken);
    // Eigen + beschrijfbare agenda's (incl. sub-agenda's), plus de primaire.
    // Read-only abonnementen (feestdagen e.d.) slaan we over.
    const ids = calendars
      .filter(
        (calendar) =>
          calendar.primary ||
          calendar.accessRole === "owner" ||
          calendar.accessRole === "writer",
      )
      .map((calendar) => calendar.id);
    const targets = ids.length > 0 ? ids : ["primary"];

    const lists = await Promise.all(
      targets.map((id) =>
        fetchGoogleEvents(accessToken, id, timeMin, timeMax).catch(() => []),
      ),
    );

    const seen = new Set<string>();
    const events: CalendarEvent[] = [];
    for (const list of lists) {
      for (const event of list) {
        if (seen.has(event.id)) continue;
        seen.add(event.id);
        events.push({
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
        });
      }
    }
    return events;
  } catch {
    return [];
  }
}
