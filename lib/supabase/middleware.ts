import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "./env";

// Routes die zonder sessie bereikbaar moeten blijven.
const PUBLIC_PREFIXES = ["/login", "/auth"];

// Single-user allowlist: enkel dit e-mailadres krijgt toegang.
const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL?.toLowerCase();

/**
 * Ververst de Supabase-sessie bij elke request en beschermt de routes:
 * niet-ingelogde gebruikers worden naar /login gestuurd, ingelogde gebruikers
 * weg van /login. Zolang Supabase niet geconfigureerd is laat de middleware
 * alles door (preview-modus), zodat de shell zichtbaar blijft.
 */
export async function updateSession(request: NextRequest) {
  if (!supabaseConfigured) {
    return NextResponse.next({ request });
  }

  // Een auth-/reset-code die niet op de callback binnenkomt (bv. wanneer
  // Supabase terugvalt op de Site-URL en de code op "/" plakt) → doorsturen
  // naar de callback die 'm inwisselt voor een sessie.
  const incomingCode = request.nextUrl.searchParams.get("code");
  if (incomingCode && !request.nextUrl.pathname.startsWith("/auth/callback")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    if (!url.searchParams.get("next")) {
      url.searchParams.set("next", "/wachtwoord");
    }
    return NextResponse.redirect(url);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // BELANGRIJK: niets tussen createServerClient en getUser() — hier wordt het
  // auth-token ververst. Code ertussen kan sessies onbedoeld laten uitloggen.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Toegang vereist een sessie én (indien gezet) het juiste e-mailadres.
  const allowed =
    !!user && (!ALLOWED_EMAIL || user.email?.toLowerCase() === ALLOWED_EMAIL);

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!allowed && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Wel ingelogd maar niet op de allowlist → toon de foutmelding.
    if (user) url.searchParams.set("error", "geen-toegang");
    return NextResponse.redirect(url);
  }

  if (allowed && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
