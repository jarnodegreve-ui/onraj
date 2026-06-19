import { NextResponse } from "next/server";

import { buildAuthUrl, googleConfigured } from "@/lib/google";
import { createClient } from "@/lib/supabase/server";

/** Start de Google OAuth-flow: zet een CSRF-state-cookie en stuurt door. */
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  if (!googleConfigured) {
    return NextResponse.redirect(`${origin}/agenda?google=unconfigured`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const state = crypto.randomUUID();
  const redirectUri = `${origin}/api/google/callback`;
  const response = NextResponse.redirect(buildAuthUrl(redirectUri, state));
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
