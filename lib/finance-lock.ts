import { createHash, timingSafeEqual } from "crypto";

import { cookies } from "next/headers";

import { isMissingTable } from "@/lib/data/safe";
import { createClient } from "@/lib/supabase/server";

export const FIN_COOKIE = "fin_unlock";

// Pincode hashen met de user-id als salt. Het is een privacy-slot achter de
// gewone login, geen sterke beveiliging — sha256 volstaat hier.
export function hashPin(pin: string, userId: string) {
  return createHash("sha256").update(`${userId}:${pin}`).digest("hex");
}

export function pinMatches(pin: string, userId: string, hash: string) {
  const a = Buffer.from(hashPin(pin, userId));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function getFinancePinHash(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("app_settings")
    .select("finance_pin_hash")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    if (isMissingTable(error)) return null; // tot migratie 0013 gedraaid is
    return null;
  }
  return data?.finance_pin_hash ?? null;
}

export async function isUnlocked(): Promise<boolean> {
  const store = await cookies();
  return store.get(FIN_COOKIE)?.value === "1";
}

// {pinSet, unlocked, locked} — locked = pincode ingesteld én niet ontgrendeld.
export async function financeLockState() {
  const hash = await getFinancePinHash();
  const unlocked = await isUnlocked();
  return { pinSet: !!hash, unlocked, locked: !!hash && !unlocked };
}

export async function isFinanceLocked(): Promise<boolean> {
  return (await financeLockState()).locked;
}
