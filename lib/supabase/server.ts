import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "./env";

/**
 * Supabase-client voor Server Components, Server Actions en Route Handlers.
 * Leest/schrijft de sessie via de Next.js-cookies; RLS scope't elke query
 * automatisch op auth.uid(), dus per definitie enkel de eigen data.
 */
export async function createClient() {
  if (!supabaseConfigured) {
    throw new Error(
      "Supabase is niet geconfigureerd — zet NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Aangeroepen vanuit een Server Component (cookies zijn dan read-only).
          // De middleware ververst de sessie-cookie, dus dit mag genegeerd worden.
        }
      },
    },
  });
}

/**
 * De ingelogde gebruiker, met request-scoped dedup via React `cache()`. Layout,
 * finance-lock en data-helpers kunnen dit binnen één render vrij aanroepen: de
 * (netwerk-)`getUser()`-call gebeurt hoogstens één keer per request i.p.v. bij
 * elke helper opnieuw.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
