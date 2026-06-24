import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  supabaseConfigured,
} from "@/lib/supabase/env";

// Server-side afmelden. Onder /auth → de proxy slaat deze route over (geen
// MFA-/sessie-bemoeienis). De cookie-wissing wordt RECHTSTREEKS op de redirect-
// response gezet (niet via next/headers), want anders haalt de Set-Cookie de
// browser niet en blijf je ingelogd. Plus een handmatige fallback: álle sb-*-
// cookies wissen, zodat afmelden altijd slaagt — ook als Supabase faalt.
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
  if (!supabaseConfigured) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  try {
    await supabase.auth.signOut();
  } catch {
    // bewust genegeerd — we wissen de cookies hieronder sowieso
  }

  // Vangnet: verwijder elke resterende Supabase-auth-cookie van de response.
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
    }
  }

  return response;
}
