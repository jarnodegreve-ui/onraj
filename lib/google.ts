import "server-only";

// Server-side helpers voor de Google OAuth- en Calendar-API (raw fetch, geen
// zware googleapis-dependency).

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3/calendars";
const CALENDAR_LIST_URL =
  "https://www.googleapis.com/calendar/v3/users/me/calendarList";
// calendar.events = lezen én schrijven van events (nieuwe afspraken aanmaken).
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";

export const googleConfigured = CLIENT_ID.length > 0 && CLIENT_SECRET.length > 0;

export function buildAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Token-uitwisseling mislukt (${res.status})`);
  return res.json() as Promise<TokenResponse>;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Token-refresh mislukt (${res.status})`);
  return res.json() as Promise<TokenResponse>;
}

export interface GoogleEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  location: string | null;
  htmlLink: string | null;
}

interface GoogleApiEvent {
  id: string;
  summary?: string;
  location?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

export interface CalendarListEntry {
  id: string;
  primary: boolean;
  accessRole: string;
}

/** Haalt de lijst van agenda's op (om ook sub-agenda's mee te nemen). */
export async function fetchCalendarList(
  accessToken: string,
): Promise<CalendarListEntry[]> {
  const res = await fetch(`${CALENDAR_LIST_URL}?minAccessRole=reader`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Agenda-lijst ophalen mislukt (${res.status})`);
  const data = await res.json();
  const items = (data.items ?? []) as Array<{
    id: string;
    primary?: boolean;
    accessRole?: string;
  }>;
  return items.map((item) => ({
    id: item.id,
    primary: !!item.primary,
    accessRole: item.accessRole ?? "reader",
  }));
}

export async function fetchGoogleEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<GoogleEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const url = `${CALENDAR_BASE}/${encodeURIComponent(calendarId)}/events?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Agenda ophalen mislukt (${res.status})`);

  const data = await res.json();
  const items = (data.items ?? []) as GoogleApiEvent[];
  const events: GoogleEvent[] = [];
  for (const item of items) {
    const allDay = !!item.start?.date;
    const startsAt =
      item.start?.dateTime ??
      (item.start?.date ? `${item.start.date}T00:00:00` : null);
    if (!startsAt) continue;
    const endsAt =
      item.end?.dateTime ??
      (item.end?.date ? `${item.end.date}T00:00:00` : null);
    events.push({
      id: `g-${item.id}`,
      title: item.summary ?? "(geen titel)",
      startsAt,
      endsAt,
      allDay,
      location: item.location ?? null,
      htmlLink: item.htmlLink ?? null,
    });
  }
  return events;
}

export interface NewGoogleEvent {
  title: string;
  startsAt: string; // ISO
  endsAt: string | null;
  allDay: boolean;
  location: string;
  notes: string;
}

/** Maakt een nieuwe afspraak aan in de primaire Google-agenda. */
export async function createGoogleEvent(
  accessToken: string,
  event: NewGoogleEvent,
): Promise<void> {
  const body: Record<string, unknown> = { summary: event.title };
  if (event.location) body.location = event.location;
  if (event.notes) body.description = event.notes;

  if (event.allDay) {
    const date = event.startsAt.slice(0, 10);
    const [y, m, d] = date.split("-").map(Number);
    // Google verwacht een exclusieve einddatum → dag erna.
    const endDate = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
    body.start = { date };
    body.end = { date: endDate };
  } else {
    const endIso =
      event.endsAt ??
      new Date(new Date(event.startsAt).getTime() + 3_600_000).toISOString();
    body.start = { dateTime: event.startsAt };
    body.end = { dateTime: endIso };
  }

  const res = await fetch(`${CALENDAR_BASE}/primary/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Aanmaken in Google mislukt (${res.status})`);
}

