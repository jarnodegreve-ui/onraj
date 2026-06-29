import { isMissingTable } from "@/lib/data/safe";
import { toSubscription } from "@/lib/mappers";
import { createClient } from "@/lib/supabase/server";
import type { Subscription } from "@/lib/types";

/** Alle abonnementen, oudste eerst. Lege lijst tot migratie 0023. */
export async function listSubscriptions(): Promise<Subscription[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTable(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map(toSubscription);
}
