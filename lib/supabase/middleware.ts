import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "./env";

// Routes die zonder sessie bereikbaar moeten blijven.
const PUBLIC_PREFIXES = ["/login", "/auth"];

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

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
