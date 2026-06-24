import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Server-side afmelden. Onder /auth → de proxy slaat deze route over (geen
// MFA-redirect tijdens het uitloggen). Wist de sessie-cookies en stuurt door
// naar de login. GET volstaat: enkel via een expliciete klik bereikbaar.
export async function GET(request: Request) {
  // Faalveilig: afmelden moet altijd slagen. Een fout (sessie al weg, netwerk)
  // mag nooit de foutpagina tonen — we sturen sowieso door naar /login.
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // bewust genegeerd
  }
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
