import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { exchangeCode, googleConfigured } from "@/lib/google";
import { createClient } from "@/lib/supabase/server";

function clearState(response: NextResponse) {
  response.cookies.set("google_oauth_state", "", { path: "/", maxAge: 0 });
  return response;
}

/** Wisselt de Google-code in voor tokens en bewaart ze per gebruiker. */
export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  if (!googleConfigured) return NextResponse.redirect(`${origin}/agenda`);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieStore = await cookies();
  const savedState = cookieStore.get("google_oauth_state")?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return clearState(NextResponse.redirect(`${origin}/agenda?google=error`));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  try {
    const tokens = await exchangeCode(code, `${origin}/api/google/callback`);
    const expiry = new Date(
      Date.now() + tokens.expires_in * 1000,
    ).toISOString();

    const payload: Record<string, unknown> = {
      user_id: user.id,
      access_token: tokens.access_token,
      expiry,
      scope: tokens.scope ?? null,
    };
    // Alleen overschrijven als Google een (nieuw) refresh-token meegeeft.
    if (tokens.refresh_token) payload.refresh_token = tokens.refresh_token;

    const { error } = await supabase
      .from("google_tokens")
      .upsert(payload, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
  } catch {
    return clearState(NextResponse.redirect(`${origin}/agenda?google=error`));
  }

  return clearState(NextResponse.redirect(`${origin}/agenda?google=connected`));
}
