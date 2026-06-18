import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Enkel dit e-mailadres krijgt toegang (single-user portaal). Leeg laten =
// iedereen met een geldige sessie toelaten.
const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL?.toLowerCase();

/**
 * Wisselt de magic-link-code in voor een sessie en controleert de allowlist.
 * Bij succes door naar het dashboard, anders terug naar /login met een fout.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const email = user?.email?.toLowerCase();

      if (ALLOWED_EMAIL && email && email !== ALLOWED_EMAIL) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=geen-toegang`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
