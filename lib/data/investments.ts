import { isMissingTable } from "@/lib/data/safe";
import { toHolding, toHoldingPrice } from "@/lib/mappers";
import { createClient } from "@/lib/supabase/server";
import type { Holding, HoldingPrice } from "@/lib/types";

/** Alle beleggingsposities, oudste eerst. Lege lijst tot migratie 0022. */
export async function listHoldings(): Promise<Holding[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("holdings")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTable(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(toHolding);
}

/** Alle koerssnapshots (oudste datum eerst). Lege lijst tot migratie 0022. */
export async function listHoldingPrices(): Promise<HoldingPrice[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("holding_prices")
    .select("*")
    .order("recorded_on", { ascending: true });

  if (error) {
    if (isMissingTable(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(toHoldingPrice);
}
