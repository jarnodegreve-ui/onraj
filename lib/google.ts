// Server-side helpers voor de Google OAuth- en Calendar-API (raw fetch, geen
// zware googleapis-dependency).

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

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

export async function fetchGoogleEvents(
  accessToken: string,
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
  const res = await fetch(`${CALENDAR_URL}?${params.toString()}`, {
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
