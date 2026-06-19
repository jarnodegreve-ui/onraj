import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 "proxy"-conventie (voorheen middleware.ts): draait bij elke
// request en regelt de sessie-verversing + route-bescherming.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Draai op alles behalve statische assets en afbeeldingen.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
