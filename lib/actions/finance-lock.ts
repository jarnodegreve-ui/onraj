"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import {
  FIN_COOKIE,
  getFinancePinHash,
  hashPin,
  pinMatches,
} from "@/lib/finance-lock";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./result";

const pinSchema = z.string().regex(/^\d{4,8}$/, "Pincode = 4 tot 8 cijfers.");

function revalidate() {
  revalidatePath("/financien");
  revalidatePath("/dashboard");
}

// Sessie-cookie (geen maxAge): wordt gewist zodra de app/browser volledig sluit,
// zodat de pincode bij de volgende opstart opnieuw vereist is.
async function setUnlockCookie() {
  const store = await cookies();
  store.set(FIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function setFinancePin(pin: string): Promise<ActionResult> {
  const parsed = pinSchema.safeParse(pin);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ongeldige pincode.",
    };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd." };

  const { error } = await supabase.from("app_settings").upsert(
    {
      user_id: user.id,
      finance_pin_hash: hashPin(parsed.data, user.id),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };

  await setUnlockCookie(); // meteen ontgrendeld
  revalidate();
  return { ok: true };
}

export async function unlockFinance(pin: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd." };

  const hash = await getFinancePinHash();
  if (!hash || !pinMatches(pin, user.id, hash)) {
    // Vertraging op een foute poging: maakt brute-forcen van de pincode traag
    // (zonder serverstate). Een geldige poging blijft direct.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { ok: false, error: "Foute pincode." };
  }
  await setUnlockCookie();
  revalidate();
  return { ok: true };
}

export async function lockFinance(): Promise<ActionResult> {
  const store = await cookies();
  store.delete(FIN_COOKIE);
  revalidate();
  return { ok: true };
}

export async function removeFinancePin(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd." };

  const { error } = await supabase
    .from("app_settings")
    .update({ finance_pin_hash: null })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  const store = await cookies();
  store.delete(FIN_COOKIE);
  revalidate();
  return { ok: true };
}
