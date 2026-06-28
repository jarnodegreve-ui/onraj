"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./result";

const holdingInput = z.object({
  name: z.string().trim().min(1, "Geef een naam.").max(80),
  ticker: z.string().trim().max(20),
  quantity: z.number().nonnegative("Aantal mag niet negatief zijn."),
  costBasis: z
    .number()
    .nonnegative("Inleg mag niet negatief zijn.")
    .nullable(),
  note: z.string().trim().max(200),
});

export type HoldingInput = z.infer<typeof holdingInput>;

const priceInput = z.object({
  holdingId: z.string().min(1),
  price: z.number().nonnegative("Koers mag niet negatief zijn."),
  recordedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum."),
});

export type HoldingPriceInput = z.infer<typeof priceInput>;

function revalidate() {
  revalidatePath("/financien");
  revalidatePath("/dashboard");
}

function holdingRow(input: HoldingInput) {
  return {
    name: input.name,
    ticker: input.ticker || null,
    quantity: input.quantity,
    cost_basis: input.costBasis,
    note: input.note || null,
  };
}

export async function createHolding(input: HoldingInput): Promise<ActionResult> {
  const parsed = holdingInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ongeldige invoer.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("holdings")
    .insert(holdingRow(parsed.data));
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}

export async function updateHolding(
  id: string,
  input: HoldingInput,
): Promise<ActionResult> {
  const parsed = holdingInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ongeldige invoer.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("holdings")
    .update({ ...holdingRow(parsed.data), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}

export async function deleteHolding(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("holdings").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}

// Koers invoeren/bijwerken voor een positie op een datum (uniek per dag).
export async function recordHoldingPrice(
  input: HoldingPriceInput,
): Promise<ActionResult> {
  const parsed = priceInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ongeldige invoer.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd." };

  const { error } = await supabase.from("holding_prices").upsert(
    {
      user_id: user.id,
      holding_id: parsed.data.holdingId,
      price: parsed.data.price,
      recorded_on: parsed.data.recordedOn,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,holding_id,recorded_on" },
  );
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}
